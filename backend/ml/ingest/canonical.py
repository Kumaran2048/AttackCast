CANONICAL_COLUMNS = [
"flow_id","ts_start","duration","src_ip","dst_ip","src_port","dst_port","proto",
"fwd_pkts","bwd_pkts","fwd_bytes","bwd_bytes","syn_cnt","ack_cnt","rst_cnt","fin_cnt",
"psh_cnt","tcp_state_or_flags","label_raw","source_dataset","scenario_id"
]

def canonicalize(df, source_dataset="unknown"):
    import pandas as pd
    out=pd.DataFrame()
    aliases={
      "Timestamp":"ts_start","StartTime":"ts_start","Dur":"duration","SrcAddr":"src_ip",
      "DstAddr":"dst_ip","Sport":"src_port","Dport":"dst_port","Proto":"proto",
      "TotPkts":"fwd_pkts","TotBytes":"fwd_bytes","SrcBytes":"fwd_bytes","Label":"label_raw"
    }
    for c in CANONICAL_COLUMNS:
        if c in df: out[c]=df[c]
        elif c in aliases and aliases[c] in df: out[c]=df[aliases[c]]
        elif c=="flow_id": out[c]=range(len(df))
        elif c=="source_dataset": out[c]=source_dataset
        else: out[c]=None
    return out
