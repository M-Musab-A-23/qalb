import numpy as np

from qalb_ml.evaluate import compute_metrics, format_report
from qalb_ml.models import balanced_sample_weight, oversample


def test_perfect_prediction():
    y = np.array([0, 0, 1, 2, 3, 0])
    m = compute_metrics(y, y)
    assert m["accuracy"] == 1.0
    assert m["macro_f1_scored"] == 1.0
    assert m["v_sensitivity"] == 1.0 and m["s_sensitivity"] == 1.0


def test_sensitivity_and_confusion():
    y = np.array([2, 2, 2, 2, 1, 1, 0, 0])
    p = np.array([2, 2, 2, 0, 1, 0, 0, 0])
    m = compute_metrics(y, p)
    assert np.isclose(m["v_sensitivity"], 0.75)
    assert np.isclose(m["s_sensitivity"], 0.5)
    cm = np.array(m["confusion_matrix"])
    assert cm[2, 0] == 1 and cm[2, 2] == 3 and cm.sum() == 8


def test_format_report_mentions_every_class():
    y = np.array([0, 1, 2, 3])
    txt = format_report("demo", compute_metrics(y, y))
    for c in "NSVFQ":
        assert c in txt


def test_balanced_weights_favour_rare_class():
    y = np.array([0] * 90 + [1] * 10)
    w = balanced_sample_weight(y)
    assert w[-1] > w[0]


def test_oversample_grows_minorities_only():
    X = np.arange(120).reshape(-1, 1).astype(float)
    y = np.array([0] * 100 + [1] * 20)
    X2, y2 = oversample(X, y, target=50)
    assert (y2 == 0).sum() == 100 and (y2 == 1).sum() == 50
