import yaml
def get_countermeasures(state):
    cfg=yaml.safe_load(open("configs/mitigations.yaml"))
    return cfg.get(state,[])
