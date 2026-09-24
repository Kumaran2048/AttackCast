import numpy as np
def expected_calibration_error(probs, y, bins=10):
    probs=np.asarray(probs); y=np.asarray(y)
    conf=probs.max(axis=1); pred=probs.argmax(axis=1); ece=0
    for lo,hi in zip(np.linspace(0,1,bins+1)[:-1],np.linspace(0,1,bins+1)[1:]):
        m=(conf>=lo)&(conf<hi)
        if m.any(): ece += m.mean()*abs((pred[m]==y[m]).mean()-conf[m].mean())
    return float(ece)
