import pandas as pd
from .canonical import canonicalize

def load_cic(path, chunksize=100000):
    frames=[]
    for chunk in pd.read_csv(path,chunksize=chunksize,low_memory=False):
        chunk.columns=[str(c).strip() for c in chunk.columns]
        chunk=chunk[~chunk.iloc[:,0].astype(str).str.strip().eq("Timestamp")] if len(chunk.columns) else chunk
        frames.append(canonicalize(chunk,"CIC-IDS-2018"))
    return pd.concat(frames,ignore_index=True)
