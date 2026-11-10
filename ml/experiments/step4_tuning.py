"""Step 4: bounded random search over boosting parameters. Grouped CV on DS1 only."""
from __future__ import annotations

import numpy as np

from experiments.common import Timer, ds1_folds, feature_matrices, load_result, log, save_result
from experiments.step2_imbalance import STRATEGIES, fit_predict_factory
from qalb_ml.config import CACHE_DIR
from qalb_ml.cv import oof_proba, summarise

N_CONFIGS = 10
SPACE = {
    "learning_rate": [0.05, 0.08, 0.12],
    "max_leaf_nodes": [8, 16, 24, 48],
    "min_samples_leaf": [20, 50, 100, 200],
    "l2_regularization": [0.1, 1.0, 5.0, 20.0],
    "max_iter": [150, 250, 400],
    "max_features": [0.3, 0.5, 1.0],
}
SEED = 7


def sample_configs(n: int = N_CONFIGS, seed: int = SEED) -> list[dict]:
    rng = np.random.default_rng(seed)
    out = []
    while len(out) < n:
        cfg = {k: v[int(rng.integers(len(v)))] for k, v in SPACE.items()}
        if cfg not in out:
            out.append(cfg)
    return out


def main():
    d = feature_matrices("ds1")
    y, folds, groups = d["y"], ds1_folds(d), d["groups"]
    X = d[load_result("step1_features")["chosen_feature_set"]]
    strategy, kw = STRATEGIES[load_result("step2_imbalance")["chosen_strategy"]]
    results = []
    best_proba = None
    for i, cfg in enumerate(sample_configs()):
        with Timer() as t:
            proba = oof_proba(fit_predict_factory(strategy, groups, params=cfg, **kw), X, y, folds)
        r = {"params": cfg, **summarise(y, proba, folds), "seconds": round(t.seconds)}
        results.append(r)
        log(f"[{i + 1}/{N_CONFIGS}] macro-F1 {r['macro_f1_mean']:.3f} +/- {r['macro_f1_std']:.3f} "
            f"S {r['s_recall']:.3f} F {r['f_recall']:.3f}  {cfg}")
        if best_proba is None or r["macro_f1_mean"] >= max(x["macro_f1_mean"] for x in results):
            best_proba = proba
    best = max(results, key=lambda r: r["macro_f1_mean"])
    log(f"best: {best['params']}  macro-F1 {best['macro_f1_mean']:.3f}")
    save_result("step4_tuning", {"search_space": SPACE, "n_configs": N_CONFIGS, "trials": results,
                                 "best_params": best["params"], "best": best})
    np.save(CACHE_DIR / "oof_step4.npy", best_proba)


if __name__ == "__main__":
    main()
