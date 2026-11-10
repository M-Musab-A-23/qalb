"""Small 1D CNN on the beat waveform plus RR context, in PyTorch.

torch is optional: nothing here is imported unless a CNN is trained or loaded,
and ``torch_available()`` lets callers fall back to the boosting model.
"""
from __future__ import annotations

import importlib.util

import numpy as np

from .config import BEAT_LEN, CLASSES

SEED = 42


def torch_available() -> bool:
    return importlib.util.find_spec("torch") is not None


def build_network(n_rr: int, n_classes: int = len(CLASSES), width: int = 16):
    """Three conv blocks over the waveform, an RR branch, one hidden layer."""
    import torch
    from torch import nn

    class BeatNet(nn.Module):
        def __init__(self):
            super().__init__()

            def block(cin, cout):
                return nn.Sequential(nn.Conv1d(cin, cout, 7, padding=3), nn.BatchNorm1d(cout),
                                     nn.ReLU(), nn.MaxPool1d(2))

            self.conv = nn.Sequential(block(1, width), block(width, 2 * width),
                                      block(2 * width, 4 * width))
            self.rr = nn.Sequential(nn.Linear(n_rr, 32), nn.ReLU())
            self.head = nn.Sequential(nn.Linear(8 * width + 32, 64), nn.ReLU(), nn.Dropout(0.3),
                                      nn.Linear(64, n_classes))

        def forward(self, wave, rr):
            h = self.conv(wave)                                    # (B, C, T)
            h = torch.cat([h.mean(dim=2), h.amax(dim=2)], dim=1)   # (B, 2C)
            return self.head(torch.cat([h, self.rr(rr)], dim=1))

    return BeatNet()


RR_CLIP = 5.0


def fit_rr_scaler(rr: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Mean and std of the RR inputs, from training rows only."""
    return rr.mean(axis=0), rr.std(axis=0) + 1e-6


def scale_rr(rr: np.ndarray, mean: np.ndarray, std: np.ndarray) -> np.ndarray:
    return np.clip((rr - mean) / std, -RR_CLIP, RR_CLIP).astype(np.float32)


def grouped_val_split(y: np.ndarray, groups: np.ndarray, frac: float = 0.2,
                      min_rare: int = 20, seed: int = SEED, tries: int = 200):
    """Hold out whole patients for early stopping.

    Picks about ``frac`` of the patients at random (seeded) and retries until
    the held-out part contains at least ``min_rare`` beats of S, V and F, so
    the stopping signal is not blind to the rare classes. Returns
    (train_idx, val_idx).
    """
    patients = np.unique(groups)
    n_val = max(1, int(round(frac * len(patients))))
    rare = [CLASSES.index(c) for c in ("S", "V", "F")]
    best, best_score = None, -1
    for t in range(tries):
        rng = np.random.default_rng(seed + t)
        val_p = rng.choice(patients, n_val, replace=False)
        mask = np.isin(groups, val_p)
        score = min(min((y[mask] == c).sum() for c in rare), min_rare)
        if score > best_score:
            best, best_score = mask, score
        if score >= min_rare:
            break
    return np.flatnonzero(~best), np.flatnonzero(best)


def train_cnn(wave: np.ndarray, rr: np.ndarray, y: np.ndarray, groups: np.ndarray,
              class_power: float = 0.5, max_epochs: int = 25, patience: int = 4,
              batch_size: int = 256, lr: float = 2e-3, width: int = 16,
              seed: int = SEED, verbose: bool = False) -> dict:
    """Train the CNN with weighted cross-entropy and early stopping.

    Early stopping watches the weighted loss on patients held out from the
    training rows (``grouped_val_split``). Returns a bundle that
    ``predict_proba_cnn`` and ``save_cnn`` accept.
    """
    import torch
    from torch import nn

    from .imbalance import power_class_weights

    torch.manual_seed(seed)
    np.random.seed(seed)
    tr, va = grouped_val_split(y, groups, seed=seed)
    mean, std = fit_rr_scaler(rr[tr])
    rr_s = scale_rr(rr, mean, std)
    wave_t = torch.from_numpy(wave.astype(np.float32))[:, None, :]
    rr_t, y_t = torch.from_numpy(rr_s), torch.from_numpy(y.astype(np.int64))

    counts = np.bincount(y[tr], minlength=len(CLASSES)).astype(float)
    cw = np.where(counts > 0, (len(tr) / (len(CLASSES) * np.maximum(counts, 1))) ** class_power, 0.0)
    loss_fn = nn.CrossEntropyLoss(weight=torch.tensor(cw / cw[counts > 0].mean(), dtype=torch.float32))
    net = build_network(rr.shape[1], width=width)
    opt = torch.optim.AdamW(net.parameters(), lr=lr, weight_decay=1e-4)
    gen = torch.Generator().manual_seed(seed)

    def val_loss():
        net.eval()
        with torch.no_grad():
            return float(loss_fn(net(wave_t[va], rr_t[va]), y_t[va]))

    best, best_state, bad, history = np.inf, None, 0, []
    for epoch in range(max_epochs):
        net.train()
        order = torch.as_tensor(tr)[torch.randperm(len(tr), generator=gen)]
        for i in range(0, len(order), batch_size):
            b = order[i:i + batch_size]
            xb = wave_t[b] * (1 + 0.1 * (torch.rand(len(b), 1, 1, generator=gen) - 0.5) * 2)
            xb = xb + 0.02 * torch.randn(xb.shape, generator=gen)
            opt.zero_grad()
            loss = loss_fn(net(xb, rr_t[b]), y_t[b])
            loss.backward()
            opt.step()
        v = val_loss()
        history.append(v)
        if verbose:
            print(f"  epoch {epoch + 1:2d} val loss {v:.4f}", flush=True)
        if v < best - 1e-4:
            best, bad = v, 0
            best_state = {k: t.clone() for k, t in net.state_dict().items()}
        else:
            bad += 1
            if bad >= patience:
                break
    net.load_state_dict(best_state)
    return {"net": net, "rr_mean": mean, "rr_std": std, "n_rr": int(rr.shape[1]),
            "width": width, "history": history, "best_val_loss": best,
            "epochs": len(history), "seed": seed}


def predict_proba_cnn(bundle: dict, wave: np.ndarray, rr: np.ndarray,
                      batch_size: int = 2048) -> np.ndarray:
    """Class probabilities, shape (n, len(CLASSES))."""
    import torch

    net = bundle["net"].eval()
    rr_s = torch.from_numpy(scale_rr(rr, bundle["rr_mean"], bundle["rr_std"]))
    wave_t = torch.from_numpy(wave.astype(np.float32))[:, None, :]
    out = []
    with torch.no_grad():
        for i in range(0, len(wave_t), batch_size):
            out.append(torch.softmax(net(wave_t[i:i + batch_size], rr_s[i:i + batch_size]), dim=1))
    return torch.cat(out).numpy() if out else np.zeros((0, len(CLASSES)))


def save_cnn(bundle: dict, path) -> None:
    """Write weights and scaler as plain tensors (loadable with ``weights_only``)."""
    import torch

    torch.save({"state_dict": bundle["net"].state_dict(),
                "rr_mean": torch.from_numpy(np.asarray(bundle["rr_mean"], dtype=np.float32)),
                "rr_std": torch.from_numpy(np.asarray(bundle["rr_std"], dtype=np.float32)),
                "n_rr": bundle["n_rr"], "width": bundle["width"], "beat_len": BEAT_LEN,
                "classes": list(CLASSES), "seed": bundle["seed"]}, path)


def load_cnn(path) -> dict:
    import torch

    d = torch.load(path, map_location="cpu", weights_only=True)
    net = build_network(d["n_rr"], width=d["width"])
    net.load_state_dict(d["state_dict"])
    net.eval()
    return {"net": net, "rr_mean": d["rr_mean"].numpy(), "rr_std": d["rr_std"].numpy(),
            "n_rr": d["n_rr"], "width": d["width"], "seed": d["seed"]}
