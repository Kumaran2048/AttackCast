import argparse, yaml, json, os
import numpy as np, torch
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from backend.ml.build.features import FEATURES
from backend.ml.models.worldmodel import WorldModel
from backend.ml.models.baselines import train_baseline

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--config",default="configs/default.yaml"); a=ap.parse_args()
    cfg=yaml.safe_load(open(a.config)); torch.manual_seed(cfg["seed"]); np.random.seed(cfg["seed"])
    import pandas as pd
    p="data/processed/windows.parquet"
    if not os.path.exists(p): raise SystemExit("Run scripts/make_dataset.py first.")
    df=pd.read_parquet(p).fillna(0)
    L=cfg["sequence_length"]; X=[]; y=[]
    for ent,g in df.groupby("entity"):
        g=g.sort_values("ts")
        arr=g[FEATURES].to_numpy("float32"); lab=g["state"].astype(int).to_numpy()
        for i in range(L,len(g)): X.append(arr[i-L:i]); y.append(lab[i])
    X=np.asarray(X); y=np.asarray(y)
    if len(X)<20: raise SystemExit("Not enough sequence samples.")
    split=int(len(X)*.8)
    Xtr,Xv,ytr,yv=X[:split],X[split:],y[:split],y[split:]
    sc=StandardScaler().fit(Xtr.reshape(len(Xtr),-1))
    joblib=None
    import joblib
    joblib.dump(sc,"artifacts/models/scaler.joblib")
    # baseline
    train_baseline(Xtr,ytr)
    dev="cuda" if torch.cuda.is_available() else "cpu"
    m=WorldModel(len(FEATURES),cfg["model"]["hidden"]).to(dev)
    opt=torch.optim.AdamW(m.parameters(),lr=cfg["model"]["lr"])
    lossfn=torch.nn.CrossEntropyLoss()
    tx=torch.tensor(Xtr).to(dev); ty=torch.tensor(ytr).to(dev)
    for epoch in range(cfg["model"]["epochs"]):
        m.train(); opt.zero_grad(); logits,_,_=m(tx); loss=lossfn(logits,ty); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(),1.0); opt.step()
    Path("artifacts/models").mkdir(parents=True,exist_ok=True)
    torch.save({"model":m.state_dict(),"features":FEATURES,"hidden":cfg["model"]["hidden"]},"artifacts/models/worldmodel.pt")
    json.dump({"train_samples":len(Xtr),"validation_samples":len(Xv),"seed":cfg["seed"],"model":"GRU-attention"} ,open("artifacts/metrics/training.json","w"),indent=2)
    print("world model trained:",len(Xtr),"samples")

if __name__=="__main__": main()
