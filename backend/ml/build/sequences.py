import numpy as np
from .features import FEATURES
def make_sequences(df,L=10):
    X=[]; y=[]; meta=[]
    for entity,g in df.groupby("entity"):
        g=g.sort_values("ts")
        arr=g[FEATURES].fillna(0).to_numpy(dtype="float32")
        labels=g["state"].to_numpy(dtype="int64")
        for i in range(L,len(g)):
            X.append(arr[i-L:i]); y.append(labels[i]); meta.append({"entity":entity,"ts":str(g.iloc[i]["ts"])})
    return np.asarray(X),np.asarray(y),meta
