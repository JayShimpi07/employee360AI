import pytest
import httpx
from backend.main import app
from backend.engine.fairness_lab import CounterfactualFairnessLab, ResearchBenchmarkHarness

def test_counterfactual_fairness_engine():
    """
    Tests DOC-05 Section 4: Counterfactual Fairness Permutation Test.
    Verifies that technical evaluation variance across demographic personas approaches 0.
    """
    audit = CounterfactualFairnessLab.run_counterfactual_audit()
    assert audit["personas_audited"] == 6
    assert audit["variance"] < 0.001
    assert audit["standard_deviation"] < 0.05
    assert audit["demographic_parity_ratio_pct"] >= 99.0
    assert audit["is_fairness_certified"] is True
    assert len(audit["certificate_hash"]) == 64

    # Verify all 6 personas have identical average scores given identical technical evidence
    first_score = audit["personas"][0]["average_score"]
    for p in audit["personas"]:
        assert abs(p["average_score"] - first_score) < 0.01


def test_research_latency_benchmark_harness():
    """
    Tests DOC-05 Section 2.1: Conversational & Turn-Taking Latency SLAs.
    """
    bench = ResearchBenchmarkHarness.run_live_latency_benchmarks(iterations=4)
    assert bench["ttft_ms"]["passed_sla"] is True
    assert bench["ttft_ms"]["average"] < 600.0
    assert bench["e2e_spoken_latency_ms"]["passed_sla"] is True
    assert bench["e2e_spoken_latency_ms"]["average"] < 1500.0
    assert bench["task_completion_rate_pct"] == 100.0


def test_grounding_and_proctoring_accuracy_matrix():
    """
    Tests DOC-05 Section 2.2 & 2.4: Grounding rate, Zero Hallucination, and Proctoring F1.
    """
    grounding = ResearchBenchmarkHarness.get_grounding_accuracy_matrix()
    assert grounding["context_grounding_rate_pct"] >= 95.0
    assert grounding["hallucination_rate_pct"] == 0.0
    assert grounding["escalation_precision_pct"] == 100.0

    proctoring = ResearchBenchmarkHarness.get_proctoring_confusion_matrix()
    assert len(proctoring) >= 3
    for det in proctoring:
        assert det["precision"] >= 0.85
        assert det["recall"] >= 0.85
        assert det["f1_score"] >= 0.85
        assert det["sla_compliant"] is True


@pytest.mark.asyncio
async def test_research_api_endpoints():
    """
    Tests all Phase 6 research REST endpoints.
    """
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Personas endpoint
        personas_res = await client.get("/api/v1/research/fairness/personas")
        assert personas_res.status_code == 200
        personas = personas_res.json()
        assert len(personas) == 6

        # 2. Run Fairness Audit
        audit_res = await client.post("/api/v1/research/fairness/run-audit")
        assert audit_res.status_code == 200
        audit_data = audit_res.json()
        assert audit_data["is_fairness_certified"] is True
        assert "certificate_hash" in audit_data

        # 3. Benchmarks summary
        summary_res = await client.get("/api/v1/research/benchmarks/summary")
        assert summary_res.status_code == 200
        summary_data = summary_res.json()
        assert "conversational_latency" in summary_data
        assert "grounding_mitigation" in summary_data
        assert "proctoring_confusion_matrix" in summary_data

        # 4. Run latency audit
        latency_res = await client.post("/api/v1/research/benchmarks/run-latency-audit", json={"iterations": 3})
        assert latency_res.status_code == 200
        latency_data = latency_res.json()
        assert latency_data["iterations"] == 3
