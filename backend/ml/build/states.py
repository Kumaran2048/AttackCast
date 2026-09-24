import numpy as np

def assign_states(w):
    y=w.copy()
    y["state_source"]="label"
    y["state"]=0
    labels=y.get("label_raw",None)
    if labels is not None:
        s=labels.astype(str).str.lower()
        y.loc[s.str.contains("ftp|ssh|brute|sql|xss"),"state"]=2
        y.loc[s.str.contains("infiltration"),"state"]=3
        y.loc[s.str.contains("bot"),"state"]=4
        y.loc[s.str.contains("dos|ddos"),"state"]=7
    # explicit heuristics
    recon=(y["unique_dst_ports"]>=8)&(y["syn_only_ratio"]>=0.25)
    lateral=(y["internal_spread"]>=2)&(y["flow_rate"]>=1)
    exfil=(y["bytes_out_in_ratio"]>=5)&(y["largest_outbound"]>=10000)
    y.loc[recon,"state"]=1; y.loc[recon,"state_source"]="heuristic"
    y.loc[lateral,"state"]=5; y.loc[lateral,"state_source"]="heuristic"
    y.loc[exfil,"state"]=6; y.loc[exfil,"state_source"]="heuristic"
    return y
