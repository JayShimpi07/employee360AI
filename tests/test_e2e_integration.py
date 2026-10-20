import pytest
import httpx
from backend.main import app
from backend.core.database import AsyncSessionLocal
from backend.models.models import User, WorkflowDefinition
from backend.models.enums import UserRole
from sqlalchemy import select

@pytest.mark.asyncio
async def test_full_employee_lifecycle_e2e():
    """
    Complete End-to-End Integration Test for Employee360 AI:
    1. System Health Check
    2. Workflow Version Verification
    3. Interview Integrity & Proctoring Simulation
    4. Evidence & Decision Sufficiency
    5. Onboarding Task Submission & Two-Phase Verification
    6. Harper Conversational AI Assistant
    7. Counterfactual Fairness & Non-Repudiation Audit
    """
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: System Health & Stats
        health_res = await client.get("/health")
        assert health_res.status_code == 200
        stats_res = await client.get("/api/v1/system/stats")
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_users"] >= 3
        assert stats["total_workflows"] >= 1

        # Step 2: Authenticate Admin
        login_res = await client.post("/api/v1/auth/login", json={
            "email": "admin@zensar.com",
            "password": "admin123"
        })
        assert login_res.status_code == 200
        admin_token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Step 3: Jobs & Requisitions
        jobs_res = await client.get("/api/v1/jobs/")
        assert jobs_res.status_code == 200
        jobs = jobs_res.json()
        assert len(jobs) > 0
        job_id = jobs[0]["id"]

        # Step 4: Invite Candidate
        invite_res = await client.post("/api/v1/jobs/invite", json={
            "job_id": job_id,
            "candidate_name": "E2E Test Candidate",
            "candidate_email": "e2e.candidate@example.com",
            "resume_text": "Experienced Python and distributed systems architect with Redis and PostgreSQL optimization."
        }, headers=headers)
        assert invite_res.status_code == 200
        invite_data = invite_res.json()
        assert "session_id" in invite_data
        session_id = invite_data["session_id"]

        # Step 4: Proctoring Anomaly Verification
        proctoring_res = await client.post("/api/v1/proctoring/lab/simulate", json={"scenario": "NORMAL"})
        assert proctoring_res.status_code == 200
        assert proctoring_res.json()["benchmark_passed"] is True

        # Step 5: Evidence Evaluation & Decision Report
        eval_res = await client.post(f"/api/v1/evidence/sessions/{session_id}/evaluate")
        assert eval_res.status_code == 200
        report = eval_res.json()
        assert "overall_score" in report
        assert "evidence_sufficiency_ratio" in report
        assert "recommendation_narrative" in report

        # Step 6: Onboarding Tasks & Two-Phase Verification
        tasks_res = await client.get("/api/v1/employee/onboarding/tasks")
        assert tasks_res.status_code == 200
        tasks_data = tasks_res.json()
        assert tasks_data["total_tasks"] >= 3
        task_id = tasks_data["tasks"][0]["id"]

        submit_task_res = await client.post(f"/api/v1/employee/onboarding/tasks/{task_id}/submit", json={"regime": "NEW_REGIME"})
        assert submit_task_res.status_code == 200
        assert submit_task_res.json()["status"] == "VERIFIED"

        # Step 7: Harper AI Assistant Chat with Action Execution
        chat_res = await client.post("/api/v1/employee/assistant/chat", json={
            "message": "I would like to apply for 2 days of casual leave"
        })
        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        assert chat_data["action_executed"] is True
        assert len(chat_data["receipt_hash"]) == 64

        # Step 8: Counterfactual Fairness Permutation Audit
        fairness_res = await client.post("/api/v1/research/fairness/run-audit")
        assert fairness_res.status_code == 200
        fairness_data = fairness_res.json()
        assert fairness_data["is_fairness_certified"] is True
        assert fairness_data["variance"] < 0.001
        assert len(fairness_data["certificate_hash"]) == 64
