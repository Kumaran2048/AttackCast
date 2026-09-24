import numpy as np, joblib, json
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_recall_fscore_support, accuracy_score
from backend.ml.build.features import FEATURES

def train_baseline(X,y,out="artifacts/models"):
    X2=X.reshape(len(X),-1)
    sc=StandardScaler().fit(X2); Xt=sc.transform(X2)
    model=LogisticRegression(max_iter=500,class_weight="balanced",random_state=42).fit(Xt,y)
    Path(out).mkdir(parents=True,exist_ok=True); joblib.dump((sc,model),Path(out)/"logistic.joblib")
    return model,sc
