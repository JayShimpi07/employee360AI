"""
End-to-end verification script for Phase 3:
- Signs in as admin
- Generates a candidate invitation and starts interview session
- Injects realistic candidate turns (FastAPI concurrency, PostgreSQL indexing, system design)
- Runs Phase 3 evaluation pipeline
- Verifies proof-carrying evidence tree and generates human sign-off
"""

import sys
import os
sys.path.insert(0, os.path.abspath("."))

import asyncio
import httpx
from backend.main import app

async def main():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=30.0) as client:
        print("[1] Logging in as admin...")
        login_res = await client.post("/api/v1/auth/login", json={"email": "admin@zensar.com", "password": "admin123"})
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("    -> Token acquired successfully.")

        print("[2] Fetching jobs to select test job...")
        jobs_res = await client.get("/api/v1/jobs/", headers=headers)
        assert jobs_res.status_code == 200, f"Get jobs failed: {jobs_res.text}"
        jobs = jobs_res.json()
        assert len(jobs) > 0, "No jobs found"
        job_id = jobs[0]["id"]
        print(f"    -> Using Job: {jobs[0]['title']} ({job_id})")

        print("[3] Inviting synthetic candidate...")
        invite_payload = {
            "job_id": job_id,
            "candidate_name": "Arjun Sharma",
            "candidate_email": "arjun.sharma@example.com",
            "resume_text": "Experienced Senior Backend Engineer with 5+ years specializing in Python, FastAPI async microservices, PostgreSQL query tuning with EXPLAIN ANALYZE and composite B-tree indices, Redis caching, Docker, and distributed event systems.",
            "workflow_name": "HIRING_WORKFLOW"
        }
        invite_res = await client.post("/api/v1/jobs/invite", json=invite_payload, headers=headers)
        assert invite_res.status_code == 200, f"Invite failed: {invite_res.text}"
        invite_data = invite_res.json()
        session_id = invite_data["session_id"]
        print(f"    -> Candidate session created: {session_id}")

        print("[4] Initializing interview session...")
        start_res = await client.post(f"/api/v1/interviews/{session_id}/start")
        assert start_res.status_code == 200, f"Start failed: {start_res.text}"
        print("    -> Session started, greeting emitted.")

        print("[5] Submitting interview turns...")
        from backend.core.database import AsyncSessionLocal
        from backend.models.models import TranscriptTurn
        from backend.models.enums import TurnSpeaker
        from datetime import datetime, timezone
        import uuid

        async with AsyncSessionLocal() as db:
            turns = [
                TranscriptTurn(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    speaker=TurnSpeaker.CANDIDATE,
                    text="In FastAPI, we utilize Python's async/await syntax powered by AnyIO and uvloop. For I/O-bound database operations, we integrate async SQLAlchemy with connection pooling and asyncpg. For CPU-bound tasks, we offload to background Celery workers or multiprocessing to ensure the event loop is never blocked, maintaining sub-15ms p99 latency.",
                    turn_index=2,
                    created_at=datetime.now(timezone.utc)
                ),
                TranscriptTurn(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    speaker=TurnSpeaker.AI,
                    text="Excellent. How do you approach optimizing slow PostgreSQL queries in production?",
                    turn_index=3,
                    created_at=datetime.now(timezone.utc)
                ),
                TranscriptTurn(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    speaker=TurnSpeaker.CANDIDATE,
                    text="I begin by analyzing execution plans with EXPLAIN ANALYZE and buffers. We identify sequential scans on high-cardinality tables, add selective partial or composite B-tree indexes, optimize query joins to avoid Cartesian products, and configure read-replicas with Redis caching for hot paths.",
                    turn_index=4,
                    created_at=datetime.now(timezone.utc)
                )
            ]
            db.add_all(turns)
            await db.commit()
        print("    -> Realistic candidate turns injected into transcript.")

        print("[6] Running Phase 3 Evidence Sufficiency & Decision Engine...")
        eval_res = await client.post(f"/api/v1/evidence/sessions/{session_id}/evaluate", headers=headers)
        assert eval_res.status_code == 200, f"Evaluation failed: {eval_res.text}"
        report = eval_res.json()
        print(f"    -> Evaluation Report Generated! Overall Score: {report['overall_score']:.1f}/100")
        print(f"    -> Recommendation: {report['recommendation_narrative']}")
        breakdown = report.get("competency_breakdown", {})
        print(f"    -> Competencies Evaluated: {len(breakdown)}")
        for comp_name, comp_data in breakdown.items():
            print(f"       * Competency: {comp_name} | Score: {comp_data['score']}% | Status: {comp_data['status']}")
            print(f"         Evidence Quote: \"{comp_data['evidence_quote'][:80]}...\" (Turn #{comp_data.get('turn_index')})")
        claims = report.get("resume_claims", [])
        print(f"    -> Resume Claims Extracted: {len(claims)} verifiable claims")
        for cl in claims[:2]:
            print(f"       * Claim {cl.get('claim_id')}: \"{cl.get('statement')[:70]}...\" (Keywords: {cl.get('keywords', [])})")

        print("[7] Submitting Human-in-the-Loop Sign-off...")
        report_id = report["report_id"]
        signoff_res = await client.post(
            f"/api/v1/evidence/reports/{report_id}/signoff",
            json={"status": "APPROVED", "notes": "Candidate demonstrated rigorous async architecture and DB optimization knowledge backed by direct transcript quotes."},
            headers=headers
        )
        assert signoff_res.status_code == 200, f"Signoff failed: {signoff_res.text}"
        signoff_data = signoff_res.json()
        assert signoff_data["is_finalized"] is True
        print(f"    -> Human Sign-off recorded: {signoff_data['human_override_status']} (is_finalized: {signoff_data['is_finalized']})")

        print("\n Phase 3 End-to-End Verification SUCCESSFUL! All systems operating nominally.")

if __name__ == "__main__":
    asyncio.run(main())
