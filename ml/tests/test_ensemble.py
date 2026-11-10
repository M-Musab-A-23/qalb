import numpy as np
import pytest

from qalb_ml.cv import grouped_folds
from qalb_ml.ensemble import blend_probabilities, choose_blend_weight


def test_blend_is_weighted_average_and_normalised():
    a = np.array([[0.8, 0.2, 0, 0, 0]])
    b = np.array([[0.2, 0.8, 0, 0, 0]])
    out = blend_probabilities([a, b], [3, 1])
    assert np.allclose(out, [[0.65, 0.35, 0, 0, 0]]) and np.isclose(out.sum(), 1.0)
    assert np.allclose(blend_probabilities([a, b], [1, 0]), a)


def test_blend_rejects_bad_weights():
    a = np.full((1, 5), 0.2)
    with pytest.raises(ValueError):
        blend_probabilities([a, a], [1])
    with pytest.raises(ValueError):
        blend_probabilities([a, a], [0, 0])
    with pytest.raises(ValueError):
        blend_probabilities([a, a], [-1, 2])


def test_choose_weight_prefers_the_better_model():
    rng = np.random.default_rng(0)
    n = 2000
    y = rng.choice([0, 1, 2, 3], n, p=[0.6, 0.15, 0.15, 0.1])
    good = np.full((n, 5), 0.02)
    good[np.arange(n), y] = 0.92
    noise = rng.dirichlet(np.ones(5), n)
    groups = np.repeat(np.arange(20), n // 20)
    folds = grouped_folds(groups)
    w, scores = choose_blend_weight(y, good, noise, folds)
    assert w >= 0.8 and scores[w] >= scores[0.0]
    w2, _ = choose_blend_weight(y, noise, good, folds)
    assert w2 <= 0.2
