"""Step 1: does the richer feature set help? Grouped 4-fold CV on DS1 only."""
from __future__ import annotations

import numpy as np

from experiments.common import (Timer, boosting_fit_predict, ds1_folds, feature_matrices, log,
                                save_result)
from qalb_ml.config import CACHE_DIR
from qalb_ml.cv import oof_proba, summarise

N1, N_CTX, N_WAV = 174, 19, 41   # v1 columns, then RR context, wavelet bands, shape ratios


def main():
    d = feature_matrices("ds1")
    y, folds = d["y"], ds1_folds(d)
    X = d["X2"]
    blocks = {
        "v1 (baseline)": np.arange(0, N1),
        "v1 + RR context": np.r_[0:N1 + N_CTX],
        "v1 + wavelet bands": np.r_[0:N1, N1 + N_CTX:N1 + N_CTX + N_WAV],
        "v1 + shape ratios": np.r_[0:N1, N1 + N_CTX + N_WAV:X.shape[1]],
        "v2 (all)": np.arange(X.shape[1]),
    }
    out, oofs = {}, {}
    for name, cols in blocks.items():
        with Timer() as t:
            proba = oof_proba(boosting_fit_predict(), X[:, cols], y, folds)
        out[name] = {**summarise(y, proba, folds), "n_features": int(len(cols)),
                     "seconds": round(t.seconds)}
        oofs[name] = proba
        log(f"{name:<22} macro-F1 {out[name]['macro_f1_mean']:.3f} +/- {out[name]['macro_f1_std']:.3f}"
            f"  S {out[name]['s_recall']:.3f}  V {out[name]['v_recall']:.3f}  F {out[name]['f_recall']:.3f}")
    save_result("step1_features", out)
    np.savez_compressed(CACHE_DIR / "oof_step1.npz", v1=oofs["v1 (baseline)"], v2=oofs["v2 (all)"])


if __name__ == "__main__":
    main()
