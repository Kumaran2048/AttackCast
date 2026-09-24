from fastapi.testclient import TestClient
from backend.app.main import app
from backend.ml.models.rollout import rollout_probs
import numpy as np

def test_health():
    c=TestClient(app); assert c.get("/api/health").status_code==200
def test_scenarios():
    c=TestClient(app); assert len(c.get("/api/scenarios").json())>=4
def test_rollout_sums():
    p=rollout_probs([1,0,0,0,0,0,0,0],np.eye(8),K=5,samples=100)
    for h in p: assert abs(sum(h["state_probs"])-1)<1e-6
def test_ws_contract():
    c=TestClient(app); sid=c.post("/api/replay/start",json={"scenario_id":"infiltration","speed":50,"window_seconds":30,"K":5}).json()["session_id"]
    with c.websocket_connect(f"/ws/replay/{sid}") as ws:
        m=ws.receive_json(); assert "forecast" in m and "explanation" in m
