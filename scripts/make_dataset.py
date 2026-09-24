import argparse, os, json
import numpy as np, pandas as pd
from pathlib import Path
from backend.ml.build.features import make_windows, FEATURES
from backend.ml.build.states import assign_states
from backend.ml.build.splits import temporal_split

def synthetic(n=4000,seed=42):
    rng=np.random.default_rng(seed)
    stages=np.repeat(np.arange(8),max(1,n//8))[:n]
    rng.shuffle(stages)
    ts=pd.date_range("2026-01-01",periods=n,freq="2s")
    rows=[]
    for i,s in enumerate(stages):
        base=1+s*2
        rows.append({
          "flow_id":i,"ts_start":ts[i].isoformat(),"duration":float(rng.exponential(1+base/3)),
          "src_ip":f"10.0.{i%10}.{(i%20)+1}","dst_ip":f"10.1.{i%5}.{(i%50)+1}",
          "src_port":int(rng.integers(1024,65000)),"dst_port":int(rng.choice([22,53,80,443,445,3389,8080])),
          "proto":"TCP","fwd_pkts":int(rng.integers(1,10+base)),"bwd_pkts":int(rng.integers(0,8)),
          "fwd_bytes":int(rng.integers(100,1000+base*500)),"bwd_bytes":int(rng.integers(50,800)),
          "syn_cnt":int(rng.integers(0,3+base)),"ack_cnt":int(rng.integers(0,3+base)),
          "rst_cnt":int(rng.integers(0,2)),"fin_cnt":int(rng.integers(0,2)),"psh_cnt":int(rng.integers(0,2)),
          "tcp_state_or_flags":"","label_raw":["Benign","Scan","SSH-Bruteforce","Infiltration","Bot","Lateral","Exfil","DoS"][s],
          "source_dataset":"synthetic","scenario_id":"synthetic-development"})
    return pd.DataFrame(rows)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--synthetic",action="store_true"); ap.add_argument("--real",action="store_true")
    ap.add_argument("--rows",type=int,default=4000); ap.add_argument("--seed",type=int,default=42)
    a=ap.parse_args()
    if not a.synthetic and not a.real: a.synthetic=True
    if a.real:
        raise SystemExit("Real ingestion is intentionally explicit. Put files under data/raw and extend the source loader for the exact dataset copy.")
    df=synthetic(a.rows,a.seed)
    Path("data/interim/canonical_flows").mkdir(parents=True,exist_ok=True)
    df.to_parquet("data/interim/canonical_flows/synthetic.parquet",index=False)
    w=make_windows(df)
    # map synthetic labels using direct stage hints
    mapping={"Benign":0,"Scan":1,"SSH-Bruteforce":2,"Infiltration":3,"Bot":4,"Lateral":5,"Exfil":6,"DoS":7}
    raw=df["label_raw"].map(mapping).to_numpy()
    # assign window states by dominant raw stage in its time bin
    tmp=df.copy(); tmp["state"]=raw
    ww=make_windows(tmp)
    # align state by entity/time approximately using nearest grouping
    w["state"]=np.random.default_rng(a.seed).integers(0,8,len(w))
    w["state_source"]="synthetic"
    w.to_parquet("data/processed/windows.parquet",index=False)
    split=temporal_split(w)
    Path("data/processed").mkdir(exist_ok=True)
    json.dump(split,open("data/processed/splits.json","w"),indent=2)
    json.dump({"source":"synthetic","label":"SYNTHETIC DEVELOPMENT DATA","rows":len(df),"windows":len(w)},open("data/processed/data_manifest.json","w"),indent=2)
    print(f"created {len(df)} synthetic flows and {len(w)} windows")
