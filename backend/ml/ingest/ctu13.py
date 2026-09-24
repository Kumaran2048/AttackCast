import pandas as pd
from .canonical import canonicalize

def load_ctu(path):
    df=pd.read_csv(path,sep=",",low_memory=False)
    return canonicalize(df,"CTU-13")
