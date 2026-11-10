import numpy as np

from qalb_ml.imbalance import focal_weights, oversample_indices, power_class_weights

Y = np.array([0] * 80 + [1] * 15 + [2] * 5)


def test_balanced_weights_equalise_class_mass():
    w = power_class_weights(Y, 1.0)
    mass = [w[Y == c].sum() for c in (0, 1, 2)]
    assert np.allclose(mass, mass[0]) and np.isclose(w.mean(), 1.0)


def test_power_zero_is_flat_and_half_is_between():
    assert np.allclose(power_class_weights(Y, 0.0), 1.0)
    full, half = power_class_weights(Y, 1.0), power_class_weights(Y, 0.5)
    assert 1.0 < half[Y == 2][0] / half[Y == 0][0] < full[Y == 2][0] / full[Y == 0][0]


def test_oversample_only_repeats_rare_rows_from_given_labels():
    idx = oversample_indices(Y, frac=0.5, seed=1)
    counts = np.bincount(Y[idx], minlength=3)
    assert counts[0] == 80 and counts[1] == 40 and counts[2] == 40
    assert idx.max() < len(Y)                       # only rows of the array it was given
    assert np.array_equal(idx, oversample_indices(Y, frac=0.5, seed=1))   # fixed seed


def test_oversample_inside_folds_keeps_validation_untouched():
    groups = np.repeat(np.arange(10), 10)
    y = np.where(np.arange(100) % 7 == 0, 1, 0)
    tr, va = np.flatnonzero(groups < 8), np.flatnonzero(groups >= 8)
    idx = oversample_indices(y[tr], frac=1.0)
    assert not set(tr[idx]) & set(va)               # nothing from validation rows


def test_focal_weights_downweight_easy_rows():
    y = np.array([0, 0, 1, 1])
    w = focal_weights(y, np.array([0.99, 0.2, 0.99, 0.2]), gamma=2.0)
    assert w[1] > w[0] and w[3] > w[2] and np.isclose(w.mean(), 1.0)
    assert (w > 0).all()
