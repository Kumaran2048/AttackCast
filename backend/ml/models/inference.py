"""
Real-time inference using trained GRU world model from CICIDS-2017.
Loads model once at startup, provides predict() for the API.
"""
import json
import numpy as np
from pathlib import Path

ARTS = Path("artifacts")
DATA = Path("data/processed")

# ── Load metadata ─────────────────────────────────────────────────────────────
_meta = None
_T    = None   # real transition matrix
_scaler_mean  = None
_scaler_scale = None
_model = None
_n_features = None

def _load():
    global _meta, _T, _scaler_mean, _scaler_scale, _model, _n_features

    meta_path = DATA / "meta.json"
    if meta_path.exists():
        with open(meta_path) as f:
            _meta = json.load(f)

    T_path = DATA / "transition_matrix.npy"
    if T_path.exists():
        _T = np.load(T_path).tolist()

    sm = ARTS / "models" / "scaler_mean.npy"
    ss = ARTS / "models" / "scaler_scale.npy"
    if sm.exists() and ss.exists():
        _scaler_mean  = np.load(sm)
        _scaler_scale = np.load(ss)

    # Load GRU model
    pt_path = ARTS / "models" / "world_model.pt"
    if pt_path.exists():
        try:
            import torch
            import torch.nn as nn

            class GRUWorldModel(nn.Module):
                def __init__(self, n_features, hidden=64, n_layers=2, n_states=8, dropout=0.3):
                    super().__init__()
                    self.gru  = nn.GRU(n_features, hidden, n_layers,
                                       batch_first=True,
                                       dropout=dropout if n_layers > 1 else 0)
                    self.head = nn.Sequential(
                        nn.LayerNorm(hidden),
                        nn.Linear(hidden, hidden // 2),
                        nn.ReLU(),
                        nn.Dropout(dropout),
                        nn.Linear(hidden // 2, n_states),
                    )
                def forward(self, x):
                    out, _ = self.gru(x)
                    return self.head(out[:, -1, :])

            ckpt = torch.load(pt_path, map_location="cpu", weights_only=False)
            _n_features = ckpt["n_features"]
            m = GRUWorldModel(_n_features, ckpt["hidden"], ckpt["n_layers"], ckpt["n_states"])
            m.load_state_dict(ckpt["model_state"])
            m.eval()
            _model = m
            print(f"[AttackCast] GRU world model loaded ({_n_features} features)")
        except Exception as e:
            print(f"[AttackCast] GRU load failed: {e} — falling back to transition matrix")


def get_transition_matrix():
    """Return real empirical transition matrix or fallback dummy."""
    if _T is not None:
        return _T
    # Fallback dummy
    return [
        [0.9, 0.1, 0, 0, 0, 0, 0, 0],
        [0, 0.8, 0.2, 0, 0, 0, 0, 0],
        [0, 0, 0.7, 0.3, 0, 0, 0, 0],
        [0, 0, 0, 0.6, 0.2, 0.2, 0, 0],
        [0, 0, 0, 0, 0.8, 0, 0.2, 0],
        [0, 0, 0, 0, 0, 0.7, 0.1, 0.2],
        [0, 0, 0, 0, 0, 0, 0.9, 0.1],
        [0, 0, 0, 0, 0, 0, 0, 1.0],
    ]


def get_feature_names():
    if _meta:
        return _meta.get("feature_cols", [])
    return []


def predict_state_probs(feature_vector: list[float]) -> list[float]:
    """
    Given a feature vector (1 time-step), return softmax state probabilities.
    Uses GRU model if available, else returns one-hot from transition matrix.
    """
    if _model is None or _scaler_mean is None:
        return None

    import torch
    import torch.nn.functional as F

    fv = np.array(feature_vector, dtype=np.float32)
    # Pad or trim to expected feature count
    if len(fv) < _n_features:
        fv = np.concatenate([fv, np.zeros(_n_features - len(fv))])
    else:
        fv = fv[:_n_features]

    # Normalise
    fv = (fv - _scaler_mean) / (_scaler_scale + 1e-8)
    fv = np.clip(fv, -10, 10)

    # GRU expects (batch, seq_len, features) — repeat single step SEQ_LEN times
    seq = torch.from_numpy(np.tile(fv, (1, 20, 1)).astype(np.float32))
    with torch.no_grad():
        logits = _model(seq)
        probs  = F.softmax(logits, dim=-1).squeeze().numpy()
    return probs.tolist()


# Load on import
_load()
