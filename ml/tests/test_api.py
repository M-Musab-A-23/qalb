import numpy as np
import pytest
from fastapi.testclient import TestClient

import api
import predict
from conftest import synthetic_ecg
from qalb_ml.config import RAW_DIR, ROOT


@pytest.fixture
def client(tiny_model, monkeypatch):
    monkeypatch.setattr(api, "MODEL_PATH", tiny_model)
    monkeypatch.setattr(predict, "MODEL_PATH", tiny_model)
    predict.load_model.cache_clear()
    yield TestClient(api.app)
    predict.load_model.cache_clear()


def csv_bytes(x):
    return "\n".join(f"{v:.5f}" for v in x).encode()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok" and body["model"]["name"] == "tiny_forest"
    assert "not a medical device" in body["disclaimer"]


def test_analyze_good_upload(client):
    files = {"file": ("ecg.csv", csv_bytes(synthetic_ecg(20)), "text/csv")}
    r = client.post("/analyze", files=files, data={"fs": "360"})
    assert r.status_code == 200
    body = r.json()
    assert len(body["beats"]) > 15
    assert body["quality"]["score"] > 0.6
    assert body["input"]["filename"] == "ecg.csv"
    assert "not a medical device" in body["disclaimer"]


def test_analyze_other_sampling_rate(client):
    x = synthetic_ecg(20)[::2]
    r = client.post("/analyze", files={"file": ("a.txt", csv_bytes(x))}, data={"fs": "180"})
    assert r.status_code == 200 and r.json()["input"]["original_sampling_rate"] == 180


@pytest.mark.parametrize("name,payload,msg", [
    ("short.csv", csv_bytes(synthetic_ecg(2)), "too short"),
    ("flat.csv", csv_bytes(np.full(3600, 1.0)), "flat"),
    ("noise.csv", csv_bytes(np.random.default_rng(0).standard_normal(3600)), "noisy"),
    ("ecg.xlsx", b"zzz", "Unsupported"),
])
def test_analyze_rejects_bad_input(client, name, payload, msg):
    r = client.post("/analyze", files={"file": (name, payload)}, data={"fs": "360"})
    assert r.status_code == 422 and msg in r.json()["detail"]


def test_analyze_without_file(client):
    assert client.post("/analyze").status_code == 422


@pytest.mark.skipif(not (ROOT / "samples").exists(), reason="no samples")
def test_demo_samples(client):
    for name in ["sample_normal_100.csv", "sample_ventricular_233.csv"]:
        data = (ROOT / "samples" / name).read_bytes()
        r = client.post("/analyze", files={"file": (name, data)}, data={"fs": "360"})
        assert r.status_code == 200, r.text
        assert len(r.json()["beats"]) > 20


@pytest.mark.skipif(not RAW_DIR.exists(), reason="raw data not downloaded")
def test_wfdb_upload(client):
    files = {"file": ("100.dat", (RAW_DIR / "100.dat").read_bytes()),
             "header": ("100.hea", (RAW_DIR / "100.hea").read_bytes())}
    r = client.post("/analyze", files=files, data={"fs": "360"})
    assert r.status_code == 200 and r.json()["input"]["layout"] == "wfdb"
