import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.core.database import AsyncSessionLocal, init_db
from backend.core.security import get_password_hash
from backend.models.models import (
    User, WorkflowDefinition, WorkflowVersion, Job, Competency
)
from backend.models.enums import UserRole, WorkflowCategory
from backend.engine.compiler import HRAgentCompiler

async def seed():
    print("Initializing database tables...")
    await init_db()

    async with AsyncSessionLocal() as db:
        # 1. Seed Users
        admin_res = await db.execute(select(User).where(User.email == "admin@zensar.com"))
        admin_user = admin_res.scalar_one_or_none()
        if not admin_user:
            admin_user = User(
                email="admin@zensar.com",
                hashed_password=get_password_hash("admin123"),
                full_name="HR Operations Admin",
                role=UserRole.HR_ADMIN
            )
            db.add(admin_user)
            print("Added default HR Admin: admin@zensar.com")

        rev_res = await db.execute(select(User).where(User.email == "reviewer@zensar.com"))
        if not rev_res.scalar_one_or_none():
            db.add(User(
                email="reviewer@zensar.com",
                hashed_password=get_password_hash("reviewer123"),
                full_name="Technical HR Reviewer",
                role=UserRole.HR_REVIEWER
            ))
            print("Added default HR Reviewer: reviewer@zensar.com")

        emp_res = await db.execute(select(User).where(User.email == "alex.smith@zensar.com"))
        if not emp_res.scalar_one_or_none():
            db.add(User(
                email="alex.smith@zensar.com",
                hashed_password=get_password_hash("employee123"),
                full_name="Alex Smith (Employee)",
                role=UserRole.EMPLOYEE
            ))
            print("Added default Employee: alex.smith@zensar.com")

        await db.flush()

        # 2. Seed Workflows
        wf_res = await db.execute(select(WorkflowDefinition).where(WorkflowDefinition.name == "Software Engineer Hiring Interview"))
        hiring_wf = wf_res.scalar_one_or_none()
        if not hiring_wf:
            hiring_wf = WorkflowDefinition(
                name="Software Engineer Hiring Interview",
                category=WorkflowCategory.HIRING,
                description="Technical competency and resume verification interview for software engineers."
            )
            db.add(hiring_wf)
            await db.flush()

            # Compile hiring workflow config
            hiring_schema = {
                "workflow_id": "wf_hiring_swe_v1",
                "name": "Software Engineer Hiring Interview",
                "version": 1,
                "category": "HIRING",
                "persona": {
                    "name": "Alex",
                    "role": "Lead Technical HR Interviewer",
                    "tone": "professional, objective, encouraging",
                    "instruction": "Evaluate the candidate against system architecture and problem solving rubrics. If an answer lacks concrete implementation detail, ask a targeted follow-up probe."
                },
                "stages": [
                    {
                        "stage_id": "intro",
                        "type": "GREETING",
                        "script": "Hello! Welcome to your technical interview for the Software Engineer position at Zensar. Please confirm that you can hear me clearly.",
                        "transitions": ["defend_resume"]
                    },
                    {
                        "stage_id": "defend_resume",
                        "type": "RESUME_VERIFICATION",
                        "objective": "Verify claims made on candidate resume regarding previous system architectures and frameworks.",
                        "max_turns": 4,
                        "transitions": ["competencies"]
                    },
                    {
                        "stage_id": "competencies",
                        "type": "COMPETENCY_ASSESSMENT",
                        "competencies": [
                            {
                                "name": "System Architecture & Scalability",
                                "min_evidence_score": 0.70,
                                "probe_questions": [
                                    "How did you design the backend data flow to prevent bottlenecks?",
                                    "What caching or indexing strategy did you adopt?"
                                ]
                            },
                            {
                                "name": "Problem Solving & Reliability",
                                "min_evidence_score": 0.70,
                                "probe_questions": [
                                    "Tell me about a high-severity production outage you resolved under pressure."
                                ]
                            }
                        ],
                        "transitions": ["closing"]
                    },
                    {
                        "stage_id": "closing",
                        "type": "CLOSING",
                        "script": "Thank you for sharing your experiences. Our HR team will review the evidence-backed evaluation report. Do you have any questions for us?",
                        "transitions": ["completed"]
                    }
                ],
                "proctoring_policy": {
                    "enabled": True,
                    "detectors": ["FACE_PRESENCE", "MULTIPLE_FACES", "GAZE_DEVIATION", "SECOND_VOICE"],
                    "action_on_flag": "LOG_AUDIT_ONLY"
                }
            }

            compiled_dict, compiled_hash = HRAgentCompiler.compile(hiring_schema)
            hiring_version = WorkflowVersion(
                workflow_id=hiring_wf.id,
                version_number=1,
                config_json=compiled_dict,
                compiled_hash=compiled_hash,
                is_active=True
            )
            db.add(hiring_version)
            await db.flush()
            print("Compiled and created Hiring Workflow v1")

            # 3. Seed Job Requisition
            job = Job(
                title="Senior Full Stack Engineer",
                department="Engineering",
                description="We are seeking an experienced Full Stack Engineer to lead scalable application development using modern Python backends and TypeScript frontends.",
                workflow_version_id=hiring_version.id,
                created_by=admin_user.id
            )
            db.add(job)
            await db.flush()

            # Seed Competencies
            db.add_all([
                Competency(
                    job_id=job.id,
                    name="System Architecture & Scalability",
                    description="Ability to architect resilient distributed systems with asynchronous APIs, caching, and database indexing.",
                    rubric_json={
                        "excellent": "Explains architectural trade-offs, horizontal scaling, caching strategies, and DB sharding.",
                        "satisfactory": "Understands microservices vs monolith, basic load balancing and relational normalization.",
                        "insufficient": "Unable to explain data flow or concurrency issues."
                    },
                    weight=1.5
                ),
                Competency(
                    job_id=job.id,
                    name="Data Structures & Problem Solving",
                    description="Demonstrated algorithmic problem solving, time complexity analysis, and systematic debugging.",
                    rubric_json={
                        "excellent": "Demonstrates root-cause isolation and memory/runtime optimizations.",
                        "satisfactory": "Solves standard algorithmic challenges with workable complexity.",
                        "insufficient": "Struggles with fundamental data structures."
                    },
                    weight=1.2
                ),
                Competency(
                    job_id=job.id,
                    name="Collaboration & Leadership",
                    description="Clear technical communication, mentoring junior developers, and cross-functional alignment.",
                    rubric_json={
                        "excellent": "Articulates complex concepts concisely, advocates best practices with empathy.",
                        "satisfactory": "Communicates work effectively in sprint ceremonies.",
                        "insufficient": "Hostile or unable to explain decisions."
                    },
                    weight=1.0
                )
            ])
            print("Added Job Requisition: Senior Full Stack Engineer with 3 competencies")

        # Seed Onboarding Workflow
        onboarding_res = await db.execute(select(WorkflowDefinition).where(WorkflowDefinition.name == "Engineering New Hire Onboarding"))
        if not onboarding_res.scalar_one_or_none():
            onboarding_wf = WorkflowDefinition(
                name="Engineering New Hire Onboarding",
                category=WorkflowCategory.ONBOARDING,
                description="Checklist tracking, hardware provisioning, and policy sign-offs for engineering joiners."
            )
            db.add(onboarding_wf)
            await db.flush()

            onboarding_schema = {
                "workflow_id": "wf_onboarding_eng_v1",
                "name": "Engineering New Hire Onboarding",
                "version": 1,
                "category": "ONBOARDING",
                "persona": {
                    "name": "Harper",
                    "role": "Onboarding Coordinator AI",
                    "tone": "welcoming, structured, helpful",
                    "instruction": "Guide the new hire through joining prerequisites and verify document submission."
                },
                "checklist_items": [
                    {"task_id": "tax_form", "title": "W-4 / Tax Declaration Submission", "required_verification": True},
                    {"task_id": "laptop_choice", "title": "Developer Laptop Selection", "required_verification": False},
                    {"task_id": "security_briefing", "title": "Information Security Policy Sign-off", "required_verification": True}
                ]
            }
            c_dict, c_hash = HRAgentCompiler.compile(onboarding_schema)
            db.add(WorkflowVersion(
                workflow_id=onboarding_wf.id,
                version_number=1,
                config_json=c_dict,
                compiled_hash=c_hash,
                is_active=True
            ))
            print("Compiled and created Onboarding Workflow v1")

        await db.commit()
        print("Database seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
