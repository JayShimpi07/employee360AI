import pytest
import pytest_asyncio
import httpx
from backend.main import app
from backend.engine.proctoring import ProctoringEngine
from backend.models.enums import AnomalyType

def test_proctoring_normal_frame():
    b64, _ = ProctoringEngine.generate_synthetic_test_frame("NORMAL")
    res = ProctoringEngine.analyze_frame(b64, "test_session", 1000)
    assert res["faces_detected"] == 1
    assert len(res["anomalies"]) == 0
    assert not res["is_anomalous"]

def test_proctoring_face_absence():
    b64, _ = ProctoringEngine.generate_synthetic_test_frame("FACE_ABSENCE")
    res = ProctoringEngine.analyze_frame(b64, "test_session", 2000)
    assert res["faces_detected"] == 0
    assert AnomalyType.FACE_ABSENCE.value in res["anomalies"]
    assert res["is_anomalous"]

def test_proctoring_multiple_faces():
    b64, _ = ProctoringEngine.generate_synthetic_test_frame("MULTIPLE_FACES")
    res = ProctoringEngine.analyze_frame(b64, "test_session", 3000)
    assert res["faces_detected"] >= 2
    assert AnomalyType.MULTIPLE_FACES.value in res["anomalies"]
    assert res["is_anomalous"]

def test_proctoring_gaze_deviation():
    b64, _ = ProctoringEngine.generate_synthetic_test_frame("GAZE_DEVIATION")
    res = ProctoringEngine.analyze_frame(b64, "test_session", 4000)
    assert res["faces_detected"] == 1
    assert AnomalyType.GAZE_DEVIATION.value in res["anomalies"]
    assert res["is_anomalous"]

def test_integrity_score_calculation():
    # Clean session
    clean_events = []
    clean_summary = ProctoringEngine.calculate_session_integrity_score(clean_events)
    assert clean_summary["integrity_score"] == 1.0
    assert not clean_summary["is_flagged"]

    # Session with multiple anomalies
    flagged_events = [
        {"anomaly_type": AnomalyType.FACE_ABSENCE.value},
        {"anomaly_type": AnomalyType.GAZE_DEVIATION.value},
        {"anomaly_type": AnomalyType.DEVICE_BLUR.value},
        {"anomaly_type": AnomalyType.MULTIPLE_FACES.value},
    ]
    summary = ProctoringEngine.calculate_session_integrity_score(flagged_events)
    assert summary["integrity_score"] < 0.70
    assert summary["is_flagged"]
    assert summary["total_anomalies"] == 4

@pytest.mark.asyncio
async def test_proctoring_api_endpoints():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Benchmarks endpoint
        bench_res = await client.get("/api/v1/proctoring/lab/benchmarks")
        assert bench_res.status_code == 200
        benchmarks = bench_res.json()
        assert len(benchmarks) == 5
        assert any(b["anomaly_type"] == "FACE_ABSENCE" for b in benchmarks)

        # 2. Lab simulation endpoint
        sim_res = await client.post("/api/v1/proctoring/lab/simulate", json={"scenario": "MULTIPLE_FACES"})
        assert sim_res.status_code == 200
        sim_data = sim_res.json()
        assert sim_data["benchmark_passed"] is True
        assert sim_data["is_anomalous"] is True
