def explain_features(feature_values, names):
    # Deterministic lightweight explanation fallback; SHAP is used by the full environment when available.
    vals=[]
    scale=max(1.0,max(abs(float(v)) for v in feature_values) if len(feature_values) else 1.0)
    for n,v in zip(names,feature_values):
        vals.append({"name":n,"value":float(v),"shap":float(v)/scale,"direction":"positive" if v>=0 else "negative","time_step":0})
    return sorted(vals,key=lambda x:abs(x["shap"]),reverse=True)[:8]
