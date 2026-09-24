import numpy as np
def entropy(p):
    p=np.asarray(p); p=p[p>0]
    return float(-(p*np.log(p)).sum())
