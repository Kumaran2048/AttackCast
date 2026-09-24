def make_text(top_features,state):
    if not top_features:return f"Forecast points toward {state}."
    f=top_features[0]
    return f"Forecast points toward {state}; the strongest observed feature contribution is {f['name']} ({f['value']:.2f})."
