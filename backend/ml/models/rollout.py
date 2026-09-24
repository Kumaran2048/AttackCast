import numpy as np
def rollout_probs(initial_probs, transition, K=5, samples=200, seed=42):
    rng=np.random.default_rng(seed); p=np.asarray(initial_probs,float); p/=p.sum()
    horizons=[]
    for k in range(1,K+1):
        draws=rng.choice(len(p),size=samples,p=p)
        counts=np.bincount(draws,minlength=len(p))/samples
        horizons.append({"k":k,"state_probs":counts.tolist(),"reach_probs":np.maximum.accumulate(counts).tolist()})
        p=counts @ transition
        p=np.asarray(p); p/=p.sum()
    return horizons
