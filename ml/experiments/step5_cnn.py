"""Step 5: 1D CNN on the beat waveform plus RR context. Grouped CV on DS1 only.

Inside every training fold, whole patients are held out for early stopping.
"""
from __future__ import annotations

import numpy as np

from experiments.common import Timer, ds1_folds, feature_matrices, log, save_result
from qalb_ml.cnn import predict_proba_cnn, train_cnn
from qalb_ml.config import CACHE_DIR
from qalb_ml.cv import summarise


def cnn_inputs(d: dict):
    """Waveform and RR context (v1 RR features plus the v2 context) for the CNN."""
    return d["beats"], np.hstack([d["rr"], d["ctx"]])


def main():
    d = feature_matrices("ds1")
    y, folds, groups = d["y"], ds1_folds(d), d["groups"]
    wave, rr = cnn_inputs(d)
    oof = np.zeros((len(y), 5))
    epochs, seconds = [], []
    for i, (tr, va) in enumerate(folds):
        with Timer() as t:
            bundle = train_cnn(wave[tr], rr[tr], y[tr], groups[tr])
        oof[va] = predict_proba_cnn(bundle, wave[va], rr[va])
        epochs.append(bundle["epochs"])
        seconds.append(round(t.seconds))
        log(f"fold {i + 1}: {bundle['epochs']} epochs, {t.seconds:.0f}s, "
            f"val loss {bundle['best_val_loss']:.3f}")
    out = {**summarise(y, oof, folds), "epochs": epochs, "seconds": seconds}
    log(f"CNN macro-F1 {out['macro_f1_mean']:.3f} +/- {out['macro_f1_std']:.3f}  "
        f"S {out['s_recall']:.3f} V {out['v_recall']:.3f} F {out['f_recall']:.3f}")
    save_result("step5_cnn", out)
    np.save(CACHE_DIR / "oof_step5.npy", oof)


if __name__ == "__main__":
    main()
