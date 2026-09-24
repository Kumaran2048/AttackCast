import os, json
import numpy as np, pandas as pd
from sklearn.metrics import accuracy_score,precision_recall_fscore_support,confusion_matrix
from backend.ml.models.baselines import train_baseline

def main():
    p="data/processed/windows.parquet"
    if not os.path.exists(p): raise SystemExit("Run make_dataset.py first.")
    df=pd.read_parquet(p)
    y=df["state"].astype(int).to_numpy()
    # honest development metric: majority baseline
    pred=np.full_like(y,np.bincount(y).argmax())
    pr,re,f1,_=precision_recall_fscore_support(y,pred,average="macro",zero_division=0)
    out={"dataset":json.load(open("data/processed/data_manifest.json")),"samples":int(len(y)),
         "majority_baseline":{"accuracy":float(accuracy_score(y,pred)),"precision_macro":float(pr),"recall_macro":float(re),"f1_macro":float(f1)},
         "note":"Synthetic development metrics are not real-world performance."}
    os.makedirs("artifacts/metrics",exist_ok=True); json.dump(out,open("artifacts/metrics/baseline.json","w"),indent=2)
    print(json.dumps(out,indent=2))
if __name__=="__main__":main()
