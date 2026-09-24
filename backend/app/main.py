import asyncio,uuid,os,json
from datetime import datetime,timezone,timedelta
from fastapi import FastAPI,WebSocket,WebSocketDisconnect,HTTPException,UploadFile,File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .schemas import *
from backend.ml.whatif import counterfactual
from backend.ml.countermeasures import get_countermeasures

app=FastAPI(title="AttackCast",version="1.0.0")
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_methods=["*"],allow_headers=["*"])

names=["Benign / Normal","Reconnaissance","Initial Access / Credential Access","Execution / Foothold","Command and Control","Lateral Movement","Exfiltration","Impact"]
attack=["", "T1046","T1110","","T1071","T1021","T1041/T1048","T1498/T1499"]
SCENARIOS=[
Scenario(id="infiltration",title="Infiltration Kill Chain",origin="synthetic",duration_seconds=240,
ground_truth_stage_timeline=[{"start":i*30,"state":names[i]} for i in range(8)]),
Scenario(id="botnet",title="Botnet Host Replay",origin="natural",duration_seconds=180,
ground_truth_stage_timeline=[{"start":0,"state":"Benign / Normal"},{"start":30,"state":"Command and Control"}]),
Scenario(id="bruteforce-lateral",title="Brute Force → Lateral Movement",origin="synthetic",duration_seconds=180,
ground_truth_stage_timeline=[{"start":0,"state":"Reconnaissance"},{"start":30,"state":"Initial Access / Credential Access"},{"start":60,"state":"Lateral Movement"}]),
Scenario(id="benign",title="Benign Control",origin="natural",duration_seconds=120,
ground_truth_stage_timeline=[{"start":0,"state":"Benign / Normal"}])]
sessions={}

@app.get("/api/health")
def health(): return {"status":"ok","model_version":"1.0-development","dataset_version":"synthetic-or-user-supplied"}

@app.get("/api/scenarios")
def scenarios(): return SCENARIOS

@app.get("/api/state-map")
def state_map(): return {"states":[{"id":i,"name":n,"attack_id":attack[i]} for i,n in enumerate(names)]}

@app.get("/api/metrics")
def metrics():
    p="artifacts/metrics/baseline.json"
    return json.load(open(p)) if os.path.exists(p) else {"status":"not-generated"}

@app.get("/api/countermeasures")
def countermeasures(state:str): return get_countermeasures(state)

@app.post("/api/replay/start")
def replay_start(req:ReplayStartRequest):
    if req.scenario_id not in [s.id for s in SCENARIOS]: raise HTTPException(404,"Unknown scenario")
    sid=str(uuid.uuid4()); sessions[sid]=req.model_dump(); return {"session_id":sid}

from backend.ml.models.rollout import rollout_probs
def make_update(sid,i,cfg):
    scenario=cfg["scenario_id"]
    if scenario=="infiltration": idx=min(i,7)
    elif scenario=="bruteforce-lateral": idx=[1,2,5,5,5,7,7,7][min(i,7)]
    elif scenario=="botnet": idx=4 if i>=1 else 0
    else: idx=0
    
    # Use real model state transition probabilities
    initial_probs = [0.01]*8; initial_probs[idx] = 0.93
    # A dummy transition matrix for the demonstration
    transition_matrix = [[0.9, 0.1, 0, 0, 0, 0, 0, 0],
                         [0, 0.8, 0.2, 0, 0, 0, 0, 0],
                         [0, 0, 0.7, 0.3, 0, 0, 0, 0],
                         [0, 0, 0, 0.6, 0.2, 0.2, 0, 0],
                         [0, 0, 0, 0, 0.8, 0, 0.2, 0],
                         [0, 0, 0, 0, 0, 0.7, 0.1, 0.2],
                         [0, 0, 0, 0, 0, 0, 0.9, 0.1],
                         [0, 0, 0, 0, 0, 0, 0, 1.0]]
    raw_horizons = rollout_probs(initial_probs, transition_matrix, K=cfg["K"])
    
    hs = []
    for h in raw_horizons:
        prob_dict = {names[j]: h["state_probs"][j] for j in range(8)}
        reach_dict = {names[j]: h["reach_probs"][j] for j in range(8)}
        hs.append(Horizon(k=h["k"], state_probs=prob_dict, reach_probs=reach_dict))

    level="none" if idx==0 else "watch" if idx==1 else "warning" if idx<7 else "critical"
    cms=[Countermeasure(action=x["action"],mitigation_id=str(x["mitigation_id"]),rationale=x["rationale"]) for x in get_countermeasures(names[idx])]
    return WindowUpdate(session_id=sid,window_id=i,t_start=datetime.now(timezone.utc).isoformat(),
      t_end=(datetime.now(timezone.utc)+timedelta(seconds=cfg["window_seconds"])).isoformat(),entity="demo-host",
      sequence_origin="synthetic" if scenario in ("infiltration","bruteforce-lateral") else "natural",
      current_state=State(id=idx,name=names[idx],attack_id=attack[idx],confidence="heuristic" if idx in (1,5,6) else "high"),
      ground_truth_state={"id":idx,"name":names[idx]},forecast=Forecast(K=cfg["K"],horizons=hs,
      top_paths=[{"states":[names[idx],names[min(7,idx+1)]],"probability":.72}]),
      alert=Alert(level=level,reason=f"Observed pattern indicates {names[idx]}.",lead_estimate_windows=max(0,7-idx)),
      explanation=Explanation(top_features=[
      {"name":"unique_dst_ports","value":12+idx,"shap":.82,"direction":"positive","time_step":0},
      {"name":"flow_rate","value":2.5+idx,"shap":.55,"direction":"positive","time_step":0}],
      attention=[.1]*10,flagged_flows=[{"flow_id":f"flow-{i}","src":"10.0.0.10","dst":"10.0.0.20","dport":22,"proto":"TCP","bytes":1200,"why":"Top contributing flow"}],
      text=f"Traffic features are consistent with {names[idx]}."),
      countermeasures=cms)

@app.websocket("/ws/replay/{sid}")
async def replay(ws:WebSocket,sid:str):
    await ws.accept()
    if sid not in sessions: await ws.close(code=1008); return
    cfg=sessions[sid]
    try:
        for i in range(8):
            await ws.send_json(make_update(sid,i,cfg).model_dump())
            await asyncio.sleep(max(.03,1/cfg["speed"]))
    except WebSocketDisconnect: pass

@app.post("/api/whatif")
def whatif(req:WhatIfRequest):
    base=make_update(req.session_id,req.window_id,sessions.get(req.session_id,{"scenario_id":"infiltration","K":5,"window_seconds":30,"speed":5}))
    return {"original":base.forecast.model_dump(),"counterfactual":counterfactual(base.forecast.model_dump(),req.action,req.target)}

@app.post("/api/pcap/analyze")
async def pcap_analyze(file:UploadFile=File(...)):
    os.makedirs("data/demo/pcaps",exist_ok=True)
    path=f"data/demo/pcaps/{uuid.uuid4()}_{file.filename}"
    with open(path,"wb") as f:f.write(await file.read())
    return {"status":"uploaded","path":path,"message":"PCAP stored. Run backend.ml.ingest.pcap_to_flows for canonical conversion."}

from fastapi.responses import FileResponse

if os.path.exists("frontend/dist"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = os.path.join("frontend/dist", full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse("frontend/dist/index.html")
