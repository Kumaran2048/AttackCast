import json
def temporal_split(df, train_frac=.7, val_frac=.15, gap=10):
    entities=sorted(df["entity"].astype(str).unique())
    # deterministic scenario/entity-held-out split
    n=len(entities); a=max(1,int(n*train_frac)); b=max(a+1,int(n*(train_frac+val_frac)))
    train=set(entities[:a]); val=set(entities[a:b]); test=set(entities[b:])
    if not test: test=set(entities[-1:]); train=set(entities[:-1])
    out={"train":sorted(train),"val":sorted(val),"test":sorted(test),"gap_windows":gap}
    return out
