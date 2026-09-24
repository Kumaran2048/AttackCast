import numpy as np, pandas as pd

FEATURES=["n_flows","total_pkts","total_bytes","mean_duration","std_duration","max_duration",
"flow_rate","unique_dst_ips","unique_dst_ports","port_entropy","syn_only_ratio","rst_ratio",
"zero_bwd_ratio","tcp_share","udp_share","well_known_share","bytes_out_in_ratio",
"largest_outbound","repeat_dst_port","mean_interflow_gap","internal_spread","delta_t"]

def entropy(s):
    if len(s)==0:return 0.0
    p=s.value_counts(normalize=True)
    return float(-(p*np.log2(p)).sum())

def make_windows(df, window_seconds=30):
    if df.empty:return pd.DataFrame(columns=FEATURES+["entity","ts","state"])
    x=df.copy()
    x["ts"]=pd.to_datetime(x["ts_start"],errors="coerce",unit="s")
    if x["ts"].isna().all(): x["ts"]=pd.date_range("2025-01-01",periods=len(x),freq="s")
    x["entity"]=x["src_ip"].fillna("network")
    x["bin"]=x["ts"].astype("int64")//(window_seconds*10**9)
    rows=[]
    for (entity,b),g in x.groupby(["entity","bin"],dropna=False):
        dur=pd.to_numeric(g["duration"],errors="coerce").fillna(0)
        fp=pd.to_numeric(g["fwd_pkts"],errors="coerce").fillna(0); bp=pd.to_numeric(g["bwd_pkts"],errors="coerce").fillna(0)
        fb=pd.to_numeric(g["fwd_bytes"],errors="coerce").fillna(0); bb=pd.to_numeric(g["bwd_bytes"],errors="coerce").fillna(0)
        dstp=g["dst_port"].fillna(0); dstip=g["dst_ip"].fillna("unknown")
        proto=g["proto"].fillna("").astype(str).str.upper()
        ports=[21,22,53,80,443,445,3389,5985]
        rows.append({"entity":entity,"ts":g["ts"].min(),"n_flows":len(g),"total_pkts":float((fp+bp).sum()),
          "total_bytes":float((fb+bb).sum()),"mean_duration":float(dur.mean()),"std_duration":float(dur.std() or 0),
          "max_duration":float(dur.max()),"flow_rate":len(g)/window_seconds,"unique_dst_ips":dstip.nunique(),
          "unique_dst_ports":dstp.nunique(),"port_entropy":entropy(dstp),"syn_only_ratio":float(((g["syn_cnt"].fillna(0)>0)&(g["ack_cnt"].fillna(0)==0)).mean()),
          "rst_ratio":float((g["rst_cnt"].fillna(0)>0).mean()),"zero_bwd_ratio":float((bp==0).mean()),
          "tcp_share":float((proto=="TCP").mean()),"udp_share":float((proto=="UDP").mean()),
          "well_known_share":float(dstp.isin(ports).mean()),"bytes_out_in_ratio":float((fb.sum()+1)/(bb.sum()+1)),
          "largest_outbound":float(fb.max()),"repeat_dst_port":float(dstp.value_counts().max()),
          "mean_interflow_gap":float(g["ts"].sort_values().diff().dt.total_seconds().fillna(0).mean()),
          "internal_spread":float(dstp[dstp.isin([22,445,3389,5985])].nunique()),"delta_t":0.0,
          "state":0})
    out=pd.DataFrame(rows).sort_values(["entity","ts"]).reset_index(drop=True)
    return out
