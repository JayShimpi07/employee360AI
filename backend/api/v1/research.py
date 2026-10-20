from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from backend.engine.fairness_lab import CounterfactualFairnessLab, ResearchBenchmarkHarness

router = APIRouter(prefix="/research", tags=["Research Evaluation & Fairness Lab (Phase 6)"])

# ================= COUNTERFACTUAL FAIRNESS LAB =================

@router.get("/fairness/personas")
async def get_fairness_personas():
    """
    Returns demographic personas used for counterfactual bias testing.
    """
    return CounterfactualFairnessLab.BENCHMARK_PERSONAS


@router.post("/fairness/run-audit")
async def run_fairness_audit():
    """
    Executes Counterfactual Fairness Permutation Audit (DOC-05 Section 4).
    Audits evaluation stability and verifies demographic score variance approaches 0.
    """
    try:
        results = CounterfactualFairnessLab.run_counterfactual_audit()
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fairness audit error: {str(e)}")


# ================= RESEARCH BENCHMARKS HARNESS =================

@router.get("/benchmarks/summary")
async def get_benchmarks_summary():
    """
    Returns combined summary of latency SLAs, grounding evaluation, and proctoring accuracy.
    """
    latency = ResearchBenchmarkHarness.run_live_latency_benchmarks(iterations=3)
    grounding = ResearchBenchmarkHarness.get_grounding_accuracy_matrix()
    proctoring = ResearchBenchmarkHarness.get_proctoring_confusion_matrix()

    return {
        "conversational_latency": latency,
        "grounding_mitigation": grounding,
        "proctoring_confusion_matrix": proctoring
    }


@router.post("/benchmarks/run-latency-audit")
async def run_latency_audit(payload: Optional[Dict[str, Any]] = None):
    """
    Executes live multi-iteration empirical latency benchmarking suite.
    """
    iterations = (payload or {}).get("iterations", 5)
    if iterations < 1 or iterations > 20:
        iterations = 5

    return ResearchBenchmarkHarness.run_live_latency_benchmarks(iterations=iterations)
