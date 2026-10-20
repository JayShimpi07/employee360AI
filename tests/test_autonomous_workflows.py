import pytest
import httpx
from backend.main import app
from backend.core.database import AsyncSessionLocal
from backend.engine.action_registry import ActionRegistry
from backend.models.models import User, OnboardingTask
from backend.models.enums import UserRole, TaskStatus
from sqlalchemy import select

@pytest.mark.asyncio
async def test_two_phase_action_preflight_rejection():
    async with AsyncSessionLocal() as db:
        # Fetch or verify demo employee
        res = await db.execute(select(User).where(User.email == "alex.smith@zensar.com"))
        emp = res.scalar_one_or_none()
        assert emp is not None, "Demo employee alex.smith@zensar.com should exist in seed data"

        # 1. Unregistered action
        with pytest.raises(ValueError, match="not registered in the Controlled Action Registry"):
            await ActionRegistry.execute_two_phase_action("delete_company_database", emp.id, {}, db)

        # 2. Exceeding leave quota (policy max 15 days in single request)
        with pytest.raises(ValueError, match="exceeds single request policy limit"):
            await ActionRegistry.execute_two_phase_action("request_leave", emp.id, {"days": 25}, db)

        # 3. Invalid tax regime
        with pytest.raises(ValueError, match="Invalid tax regime"):
            await ActionRegistry.execute_two_phase_action("submit_tax_form", emp.id, {"regime": "SWISS_ACCOUNT"}, db)


@pytest.mark.asyncio
async def test_two_phase_action_leave_and_hardware_success():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == "alex.smith@zensar.com"))
        emp = res.scalar_one_or_none()
        assert emp is not None

        # 1. Leave Request Execution
        leave_res = await ActionRegistry.execute_two_phase_action(
            action_name="request_leave",
            employee_id=emp.id,
            payload={"days": 3, "leave_type": "CASUAL"},
            db=db
        )
        assert leave_res["status"] == "VERIFIED"
        assert len(leave_res["receipt_hash"]) == 64  # Valid SHA-256
        assert leave_res["result"]["leave_balance_remaining"] == 21

        # 2. Hardware Requisition Execution
        hw_res = await ActionRegistry.execute_two_phase_action(
            action_name="it_hardware_ticket",
            employee_id=emp.id,
            payload={"laptop_model": "Apple MacBook Pro 16 M3 Max", "tier": "ENGINEERING_STANDARD"},
            db=db
        )
        assert hw_res["status"] == "VERIFIED"
        assert hw_res["result"]["delivery_sla_hours"] == 48
        assert "tracking_number" in hw_res["result"]


@pytest.mark.asyncio
async def test_employee_onboarding_tasks_api():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch onboarding tasks
        get_res = await client.get("/api/v1/employee/onboarding/tasks")
        assert get_res.status_code == 200
        data = get_res.json()
        assert "tasks" in data
        assert data["total_tasks"] >= 3
        assert "completion_percentage" in data

        # Pick first task and submit
        task_id = data["tasks"][0]["id"]
        submit_res = await client.post(f"/api/v1/employee/onboarding/tasks/{task_id}/submit", json={})
        assert submit_res.status_code == 200
        submit_data = submit_res.json()
        assert submit_data["status"] == "VERIFIED"


@pytest.mark.asyncio
async def test_harper_ai_assistant_leave_and_hardware():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Leave request intent
        chat_res = await client.post("/api/v1/employee/assistant/chat", json={
            "message": "I would like to apply for 2 days of casual leave next Monday"
        })
        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        assert chat_data["action_executed"] is True
        assert chat_data["action_name"] == "request_leave"
        assert "receipt_hash" in chat_data
        assert chat_data["verification_status"] == "POST_STATE_VERIFIED"
        assert len(chat_data["citations"]) > 0

        # 2. Hardware requisition intent
        hw_res = await client.post("/api/v1/employee/assistant/chat", json={
            "message": "Can you help order an Apple MacBook Pro laptop for my engineering workstation?"
        })
        assert hw_res.status_code == 200
        hw_data = hw_res.json()
        assert hw_data["action_executed"] is True
        assert hw_data["action_name"] == "it_hardware_ticket"
        assert "tracking_number" in hw_data["details"]


@pytest.mark.asyncio
async def test_harper_ai_assistant_grounded_rag_query():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Knowledge / Policy query
        rag_res = await client.post("/api/v1/employee/assistant/chat", json={
            "message": "What is the policy for remote work and paid time off?"
        })
        assert rag_res.status_code == 200
        rag_data = rag_res.json()
        assert rag_data["grounded"] is True
        assert len(rag_data["citations"]) > 0
        assert any("Zensar" in c["source"] for c in rag_data["citations"])


@pytest.mark.asyncio
async def test_harper_ai_assistant_hallucination_guardrail():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Out-of-domain query should trip hallucination guardrail
        res = await client.post("/api/v1/employee/assistant/chat", json={
            "message": "What is the procedure for launching a commercial spacecraft from the office roof?"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["grounded"] is False
        assert data["guardrail_status"] == "POLICY_GAP_ESCALATION_REQUIRED"


@pytest.mark.asyncio
async def test_employee_cases_and_receipts_api():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        cases_res = await client.get("/api/v1/employee/cases")
        assert cases_res.status_code == 200
        cases = cases_res.json()
        assert isinstance(cases, list)
        assert len(cases) > 0
        assert "receipt_hash" in cases[0]["actions"][0]
