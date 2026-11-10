import numpy as np

from qalb_ml.alerts import analyse_rhythm, rhythm_summary, ventricular_alerts


def regular(n=20, step=360):
    return np.arange(n) * step + 100


def test_regular_normal_has_no_alerts():
    p = regular()
    summary, alerts = analyse_rhythm(p, ["N"] * 20, [0.95] * 20)
    assert summary["rhythm"] == "regular"
    assert 55 < summary["mean_hr_bpm"] < 65
    assert alerts == []


def test_ventricular_run_is_flagged():
    cls = ["N"] * 5 + ["V"] * 4 + ["N"] * 11
    summary, alerts = analyse_rhythm(regular(), cls, [0.9] * 20)
    runs = [a for a in alerts if a["type"] == "ventricular_run"]
    assert len(runs) == 1 and runs[0]["severity"] == "high"
    assert 0.5 < runs[0]["confidence"] <= 1


def test_couplet_and_isolated_v():
    cls = ["N"] * 20
    cls[4] = cls[5] = "V"
    cls[12] = "V"
    alerts = ventricular_alerts(regular(), cls, [0.9] * 20)
    types = [a["type"] for a in alerts]
    assert "ventricular_couplet" in types and "ventricular_run" not in types


def test_irregular_rhythm_is_flagged():
    rng = np.random.default_rng(3)
    rr = rng.uniform(180, 540, 30).astype(int)
    peaks = np.cumsum(rr) + 100
    summary, alerts = analyse_rhythm(peaks, ["N"] * 30, [0.9] * 30)
    assert summary["rhythm"] == "irregular"
    assert any(a["type"] == "irregular_rhythm" for a in alerts)


def test_too_few_beats_is_insufficient():
    s = rhythm_summary(regular(5), ["N"] * 5)
    assert s["rhythm"] == "insufficient data"


def test_fast_rate_alert():
    summary, alerts = analyse_rhythm(regular(20, 160), ["N"] * 20, [0.9] * 20)
    assert any(a["type"] == "fast_rate" for a in alerts)
