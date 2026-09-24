import argparse
from collections import defaultdict
import pandas as pd

def pcap_to_flows(path):
    from scapy.all import PcapReader, IP, TCP, UDP
    flows={}
    for i,p in enumerate(PcapReader(path)):
        if IP not in p: continue
        proto="TCP" if TCP in p else "UDP" if UDP in p else str(p[IP].proto)
        sport=int(p[TCP].sport) if TCP in p else int(p[UDP].sport) if UDP in p else 0
        dport=int(p[TCP].dport) if TCP in p else int(p[UDP].dport) if UDP in p else 0
        key=(p[IP].src,p[IP].dst,sport,dport,proto)
        rec=flows.setdefault(key,{"flow_id":len(flows),"ts_start":float(p.time),"duration":0.0,"src_ip":key[0],"dst_ip":key[1],"src_port":sport,"dst_port":dport,"proto":proto,"fwd_pkts":0,"bwd_pkts":0,"fwd_bytes":0,"bwd_bytes":0,"syn_cnt":0,"ack_cnt":0,"rst_cnt":0,"fin_cnt":0,"psh_cnt":0,"tcp_state_or_flags":"","label_raw":"Unknown","source_dataset":"PCAP","scenario_id":"pcap"})
        rec["duration"]=max(rec["duration"],float(p.time)-rec["ts_start"])
        rec["fwd_pkts"]+=1; rec["fwd_bytes"]+=len(p)
        if TCP in p:
            flags=str(p[TCP].flags)
            rec["tcp_state_or_flags"] += flags
            rec["syn_cnt"] += int("S" in flags)
            rec["ack_cnt"] += int("A" in flags)
            rec["rst_cnt"] += int("R" in flags)
            rec["fin_cnt"] += int("F" in flags)
            rec["psh_cnt"] += int("P" in flags)
    return pd.DataFrame(flows.values())

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--pcap",required=True); ap.add_argument("--out",required=True)
    a=ap.parse_args(); pcap_to_flows(a.pcap).to_parquet(a.out,index=False)
