import json

import numpy as np
import pytest

import predict
from qalb_ml.config import CLASSES, DISCLAIMER
from predict import analyse_recording, predict_beats, predict_window


def test_predict_beats_on_record(short_record, tiny_model):
    sig, fs, peaks, labels = short_record
    beats = predict_beats(sig, fs, model_path=tiny_model)
    assert abs(len(beats) - len(peaks)) <= 3
    for b in beats:
        assert set(b) == {"sample", "time_s", "class", "confidence"}
        assert b["class"] in CLASSES and 0 <= b["confidence"] <= 1
    samples = [b["sample"] for b in beats]
    assert samples == sorted(samples) and samples[-1] < len(sig)


def test_predict_beats_mostly_normal_on_record_100(short_record, tiny_model):
    sig, fs, _, _ = short_record
    beats = predict_beats(sig, fs, model_path=tiny_model)
    assert np.mean([b["class"] == "N" for b in beats]) > 0.9


def test_predict_window_schema(short_record, tiny_model):
    sig, fs, _, _ = short_record
    res = predict_window(sig, fs, model_path=tiny_model)
    assert set(res) == {"schema_version", "model", "sampling_rate_in", "sampling_rate_model",
                        "duration_s", "beats", "rhythm", "alerts", "quality", "warnings",
                        "disclaimer"}
    assert res["disclaimer"] == DISCLAIMER and "not a medical device" in res["disclaimer"]
    assert res["quality"]["score"] > 0.5
    assert res["rhythm"]["n_beats"] == len(res["beats"])
    json.dumps(res)  # fully serialisable


def test_predict_window_other_rate(short_record, tiny_model):
    sig, fs, peaks, _ = short_record
    low = sig[::2]
    res = predict_window(low, 180, model_path=tiny_model)
    assert res["sampling_rate_in"] == 180
    assert abs(len(res["beats"]) - len(peaks)) <= 4
    assert max(b["sample"] for b in res["beats"]) < len(low)


def test_predict_window_without_beats(tiny_model):
    res = predict_window(np.zeros(3600), 360, model_path=tiny_model)
    assert res["beats"] == [] and res["warnings"]


def test_analyse_long_recording_merges_windows(short_record, tiny_model):
    sig, fs, _, _ = short_record
    long = np.tile(sig, 4)  # 120 s
    res = analyse_recording(long, fs, window_s=30, model_path=tiny_model)
    single = predict_window(sig, fs, model_path=tiny_model)
    assert len(res["beats"]) > 3 * len(single["beats"])
    assert max(b["sample"] for b in res["beats"]) > len(sig) * 3


def test_missing_model_message(tmp_path):
    with pytest.raises(FileNotFoundError, match="train.py"):
        predict.load_model(str(tmp_path / "nope.joblib"))


def test_cli_demo_runs(capsys, monkeypatch, tiny_model):
    monkeypatch.setattr(predict, "MODEL_PATH", tiny_model)
    predict.load_model.cache_clear()
    assert predict.main(["--record", "100", "--seconds", "20", "--window", "10"]) == 0
    out = capsys.readouterr().out
    assert "Streaming MIT-BIH record 100" in out and "beats=" in out
    predict.load_model.cache_clear()


SCHEMA_KEYS = {"schema_version", "model", "sampling_rate_in", "sampling_rate_model",
               "duration_s", "beats", "rhythm", "alerts", "quality", "warnings", "disclaimer"}


@pytest.fixture
def packaged(monkeypatch):
    if not predict.MODEL_PATH.exists():
        pytest.skip("packaged model not present")
    predict.load_model.cache_clear()
    yield
    predict.load_model.cache_clear()


def test_packaged_model_keeps_the_result_schema(short_record, packaged):
    sig, fs, _, _ = short_record
    res = predict_window(sig, fs)
    assert set(res) == SCHEMA_KEYS
    assert set(res["beats"][0]) == {"sample", "time_s", "class", "confidence"}
    assert res["model"]["name"] in ("boosting_cnn_ensemble", "gradient_boosting")
    json.dumps(res)


def test_packaged_model_falls_back_without_torch(short_record, packaged, monkeypatch, caplog):
    import logging
    import qalb_ml.inference as inf

    sig, fs, _, _ = short_record
    bundle = predict.load_model()
    if "ensemble" not in bundle:
        pytest.skip("packaged model has no CNN part")
    monkeypatch.setattr(inf, "torch_available", lambda: False)
    with caplog.at_level(logging.WARNING, logger="qalb.inference"):
        res = predict_window(sig, fs)
    assert "gradient boosting model alone" in caplog.text
    assert set(res) == SCHEMA_KEYS and res["model"]["name"] == "gradient_boosting"
    assert len(res["beats"]) > 30
