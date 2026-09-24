def counterfactual(forecast, action, target):
    out=dict(forecast)
    factor={"block_host":.55,"isolate_host":.45,"block_port":.65,"reset_credentials":.70}.get(action,.9)
    if "horizons" in out:
        for h in out["horizons"]:
            h["state_probs"]={k:float(v)*factor for k,v in h["state_probs"].items()}
    return {"mode":"data-counterfactual-development","action":action,"target":target,"forecast":out}
