import numpy as np

from qalb_ml.cv import grouped_folds
from qalb_ml.thresholds import (apply_class_scales, class_scores, fit_class_scales, macro_f1,
                                nested_scale_cv, tradeoff_curve)


def make_probs(n=3000, seed=0):
    """Three informative classes; the rare class S is systematically under-confident."""
    rng = np.random.default_rng(seed)
    y = rng.choice([0, 1, 2], size=n, p=[0.8, 0.05, 0.15])
    logits = rng.normal(0, 1, (n, 5))
    logits[np.arange(n), y] += 2.0
    logits[y == 1, 1] -= 1.2          # S looks weaker than it is
    p = np.exp(logits)
    return y, p / p.sum(axis=1, keepdims=True)


def test_apply_scales_identity_and_boost():
    p = np.array([[0.6, 0.3, 0.1, 0, 0]])
    assert apply_class_scales(p, np.ones(5))[0] == 0
    assert apply_class_scales(p, [1, 3, 1, 1, 1])[0] == 1


def test_class_scores_match_hand_counts():
    y = np.array([0, 0, 1, 1, 2])
    pred = np.array([0, 1, 1, 1, 0])
    s = class_scores(y, pred)
    assert np.isclose(s["precision"][1], 2 / 3) and np.isclose(s["recall"][1], 1.0)
    assert s["recall"][2] == 0.0 and s["precision"][3] == 0.0


def test_fitted_scales_raise_rare_class_recall():
    y, p = make_probs()
    scales = fit_class_scales(y, p)
    base = class_scores(y, apply_class_scales(p, np.ones(5)))
    tuned = class_scores(y, apply_class_scales(p, scales))
    assert scales[0] == 1.0 and scales[4] == 1.0
    assert tuned["f1"][1] > base["f1"][1]
    assert macro_f1(y, apply_class_scales(p, scales)) >= macro_f1(y, apply_class_scales(p, np.ones(5)))


def test_min_precision_guard_is_respected():
    y, p = make_probs()
    scales = fit_class_scales(y, p, min_precision={"S": 0.6})
    pred = apply_class_scales(p, scales)
    assert class_scores(y, pred)["precision"][1] >= 0.6 or not (pred == 1).any()


def test_nested_cv_does_not_use_validation_fold_labels():
    y, p = make_probs()
    groups = np.repeat(np.arange(20), len(y) // 20)
    folds = grouped_folds(groups)
    pred, scales = nested_scale_cv(y, p, folds)
    assert pred.shape == y.shape and scales.shape == (len(folds), 5)
    # flipping labels only inside one validation fold must not change that fold's scales
    _, va = folds[0]
    y2 = y.copy()
    y2[va] = (y2[va] + 1) % 3
    _, scales2 = nested_scale_cv(y2, p, folds)
    assert np.allclose(scales[0], scales2[0])


def test_tradeoff_curve_recall_increases_with_scale():
    y, p = make_probs()
    c = tradeoff_curve(y, p, "S")
    assert c["recall"][-1] >= c["recall"][0] and len(c["scale"]) == len(c["precision"])
