import numpy as np

from qalb_ml.config import BEAT_LEN
from qalb_ml.features import (RR_NAMES, STAT_NAMES, build_features, feature_dim,
                              morphology_raw, morphology_stats, morphology_wavelet,
                              rr_features)


def test_rr_values():
    peaks = np.array([0, 360, 720, 1080, 1260])  # last interval is 0.5 s
    f = rr_features(peaks)
    assert f.shape == (5, len(RR_NAMES))
    assert np.isclose(f[1, 0], 1.0) and np.isclose(f[1, 1], 1.0)
    assert np.isclose(f[3, 1], 0.5)
    assert np.isclose(f[0, 0], f[0, 1])  # first beat reuses its neighbour
    assert np.isclose(f[2, -1], 60.0)    # heart rate in bpm


def test_rr_premature_ratio():
    f = rr_features(np.array([0, 360, 720, 900, 1260, 1620]))
    # beat at 900 is premature: previous RR 0.5 s vs average 0.83
    assert f[3, 3] < 0.7


def test_rr_degenerate():
    assert rr_features(np.array([])).shape == (0, len(RR_NAMES))
    assert rr_features(np.array([100])).shape == (1, len(RR_NAMES))


def test_morphology_shapes():
    beats = np.random.default_rng(0).standard_normal((4, BEAT_LEN))
    assert morphology_raw(beats).shape == (4, BEAT_LEN // 3)
    assert morphology_stats(beats).shape == (4, len(STAT_NAMES))
    assert morphology_wavelet(beats).shape[0] == 4


def test_build_features():
    beats = np.random.default_rng(1).standard_normal((6, BEAT_LEN))
    peaks = np.arange(6) * 360 + 100
    X = build_features(beats, peaks)
    assert X.shape == (6, feature_dim())
    assert np.isfinite(X).all()
    assert build_features(np.empty((0, BEAT_LEN)), np.array([])).shape == (0, feature_dim())
