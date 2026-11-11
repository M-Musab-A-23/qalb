"""Replay session and stream tests. They run on a short synthetic record with a fake
analyser and never wait in real time."""
import json

import numpy as np
import pytest

import live
from conftest import synthetic_ecg

FS = 360


def fake_analyse(window, fs):
    """Stand-in for the model: finds the peaks and calls every third one V."""
    from qalb_ml.preprocess import detect_r_peaks
    peaks = [int(p) for p in detect_r_peaks(np.asarray(window), fs) if 90 < p < len(window) - 144]
    beats = [{"sample": p, "time_s": round(p / fs, 3), "class": "V" if i % 3 == 2 else "N",
              "confidence": 0.9} for i, p in enumerate(peaks)]
    return {"beats": beats, "alerts": [],
            "rhythm": {"mean_hr_bpm": 72.0, "rhythm": "regular", "n_beats": len(beats),
                       "class_counts": {"N": len(beats), "S": 0, "V": 0, "F": 0, "Q": 0}},
            "quality": {"score": 0.9}, "model": {"name": "fake", "version": "0"}, "warnings": []}


@pytest.fixture
def record():
    sig = synthetic_ecg(seconds=30, fs=FS)
    peaks = np.arange(int(0.5 * FS), len(sig) - 20, int(FS * 60 / 72))
    labels = np.array(["V" if i % 3 == 2 else "N" for i in range(len(peaks))])
    return sig, FS, peaks, labels


def session(record, **kw):
    sig, fs, peaks, labels = record
    kw.setdefault("analyse", fake_analyse)
    return live.ReplaySession("100", sig, fs, peaks, labels, **kw)


def run(s, n):
    return [e for _ in range(n) for e in s.tick()]


def decode(text):
    return json.loads(text.removeprefix("data: "))


def test_first_tick_announces_the_stream_then_sends_samples(record):
    events = session(record).tick()
    assert [e["type"] for e in events] == ["status", "samples"]
    assert events[0]["state"] == "started" and events[0]["record"] == "100"
    assert events[1]["fs"] == live.WIRE_FS and events[1]["seq"] == 0


def test_samples_are_downsampled_for_the_wire(record):
    sample_event = session(record).tick()[1]
    assert len(sample_event["values"]) == 30        # 0.25 s at 120 Hz
    assert all(isinstance(v, float) for v in sample_event["values"])


def test_events_are_json_with_a_type_field(record):
    for event in run(session(record), 20):
        assert event["type"] in {"samples", "beats", "alert", "status"}
        assert decode(live.encode_event(event)) == event
    assert live.encode_event({"type": "status"}).endswith("\n\n")


def test_sample_events_are_contiguous(record):
    events = [e for e in run(session(record), 12) if e["type"] == "samples"]
    for a, b in zip(events, events[1:]):
        assert b["seq"] == a["seq"] + 1
        assert b["t"] == pytest.approx(a["t"] + len(a["values"]) / live.WIRE_FS, abs=1e-3)


def test_analysis_runs_every_two_seconds_with_beats_and_status(record):
    events = run(session(record), 16)
    statuses = [e for e in events if e["type"] == "status" and e["state"] == "streaming"]
    assert len(statuses) == 2                        # ticks 8 and 16
    assert statuses[-1]["hr_bpm"] == 72.0 and statuses[-1]["quality"] == 0.9
    assert statuses[-1]["rhythm"] == "regular"
    beats = [b for e in events if e["type"] == "beats" for b in e["beats"]]
    assert beats and {"t", "class", "confidence"} <= set(beats[0])


def test_no_beat_is_sent_twice(record):
    times = [b["t"] for e in run(session(record), 40) if e["type"] == "beats" for b in e["beats"]]
    assert times == sorted(times)
    assert all(b - a > 0.15 for a, b in zip(times, times[1:]))


def test_ground_truth_is_optional_and_separate_from_the_prediction(record):
    with_truth = [b for e in run(session(record), 24) if e["type"] == "beats" for b in e["beats"]]
    assert all("ground_truth" in b for b in with_truth)
    assert {b["ground_truth"] for b in with_truth} <= {"N", "V", None}
    without = [b for e in run(session(record, truth=False), 24)
               if e["type"] == "beats" for b in e["beats"]]
    assert without and all("ground_truth" not in b for b in without)


def test_samples_can_be_left_out(record):
    types = {e["type"] for e in run(session(record, samples=False), 16)}
    assert "samples" not in types and "status" in types


def test_a_repeating_alert_is_reported_once_per_episode(record):
    def analyse(window, fs):
        out = fake_analyse(window, fs)
        # always starts at the window's first sample, so each run overlaps the last one
        out["alerts"] = [{"type": "ventricular_couplet", "severity": "medium", "confidence": 0.7,
                          "start_sample": 0, "end_sample": len(window) - 1, "message": "two V beats"}]
        return out
    alerts = [e for e in run(session(record, analyse=analyse), 24) if e["type"] == "alert"]
    assert len(alerts) == 1
    assert alerts[0]["severity"] == "medium" and alerts[0]["alert_type"] == "ventricular_couplet"


def test_a_failing_analysis_does_not_end_the_stream(record):
    def broken(window, fs):
        raise RuntimeError("boom")
    events = run(session(record, analyse=broken), 17)
    failed = [e for e in events if e["type"] == "status" and e.get("warnings")]
    assert failed and "boom" in failed[0]["warnings"][0]
    assert events[-1]["type"] == "samples"


# speed ---------------------------------------------------------------------
@pytest.mark.parametrize("speed", [1, 2, 5])
def test_speed_scales_the_signal_per_tick(record, speed):
    event = session(record, speed=speed).tick()[1]
    assert len(event["values"]) == 30 * speed


def test_speed_does_not_change_the_event_cadence(record):
    s = session(record, speed=5)
    statuses = [e for e in run(s, 16) if e["type"] == "status" and e["state"] == "streaming"]
    assert len(statuses) == 2
    assert statuses[1]["record_t"] == pytest.approx(20.0, abs=0.01)   # 16 ticks x 1.25 s


@pytest.mark.parametrize("speed", [0, 3, 10, -1])
def test_unsupported_speeds_are_refused(record, speed):
    with pytest.raises(ValueError):
        session(record, speed=speed)


def test_offset_sets_the_starting_point(record):
    events = session(record, offset_s=12).tick()
    assert events[0]["record_t"] == 12.0 and events[0]["t"] == 0.0
    assert events[1]["record_t"] == 12.0


def test_negative_offset_is_refused(record):
    with pytest.raises(ValueError):
        session(record, offset_s=-1)


# looping -------------------------------------------------------------------
def test_stream_loops_at_the_end_of_the_record(record):
    s = session(record, speed=5, offset_s=24)
    events = run(s, 8)
    loops = [e for e in events if e["type"] == "status" and e["state"] == "loop"]
    assert len(loops) == 1 and loops[0]["loop"] == 1 and loops[0]["record_t"] == 0.0
    after = [e for e in events if e["type"] == "samples"][-1]
    assert after["record_t"] < 24                    # restarted from the top of the record


def test_stream_time_keeps_increasing_across_the_loop(record):
    s = session(record, speed=5, offset_s=24)
    times = [e["t"] for e in run(s, 12) if e["type"] == "samples"]
    assert times == sorted(times) and len(set(times)) == len(times)
    assert times[-1] > 30 - 24


def test_beats_restart_cleanly_after_the_loop(record):
    s = session(record, speed=5, offset_s=20)
    beats = [b for e in run(s, 40) if e["type"] == "beats" for b in e["beats"]]
    assert beats == sorted(beats, key=lambda b: b["t"])
    assert len({b["t"] for b in beats}) == len(beats)


def test_the_stream_never_ends(record):
    s = session(record, speed=5)
    run(s, 40)
    assert s.loop >= 1


# HTTP ----------------------------------------------------------------------
@pytest.fixture
def client(record, monkeypatch):
    from fastapi.testclient import TestClient
    import api
    monkeypatch.setattr(live, "load_replay_record", lambda name: record)
    monkeypatch.setattr(live, "default_analyse", fake_analyse)
    monkeypatch.setattr(live, "model_ready", lambda: True)
    monkeypatch.setattr(live, "warm_model", lambda signal, fs: None)
    monkeypatch.setattr(live.asyncio, "sleep", live._no_wait)
    return TestClient(api.app)


def events_of(response):
    return [decode(chunk) for chunk in response.text.split("\n\n") if chunk]


def test_records_endpoint_lists_only_ds2_demo_records(client):
    body = client.get("/live/records").json()
    names = [r["record"] for r in body["records"]]
    assert names and set(names) <= set(live.DS2)
    assert all(r["label"] for r in body["records"]) and body["speeds"] == [1, 2, 5]


def test_stream_endpoint_returns_event_stream(client):
    r = client.get("/live/100?speed=2&offset=3&ticks=9")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/event-stream")
    events = events_of(r)
    assert events[0]["type"] == "status" and events[0]["speed"] == 2
    assert events[0]["record_t"] == 3.0
    assert sum(e["type"] == "samples" for e in events) == 9


def test_stream_endpoint_loops(client):
    events = events_of(client.get("/live/100?speed=5&offset=20&ticks=12"))
    assert any(e["type"] == "status" and e["state"] == "loop" for e in events)


def test_unknown_record_is_a_404(client):
    r = client.get("/live/999?ticks=1")
    assert r.status_code == 404 and "999" in r.json()["detail"]


def test_training_record_is_not_offered(client):
    assert client.get("/live/101?ticks=1").status_code == 404   # DS1 record


@pytest.mark.parametrize("query", ["speed=3", "speed=0", "offset=-5"])
def test_bad_parameters_are_422(client, query):
    assert client.get(f"/live/100?{query}&ticks=1").status_code == 422


def test_records_route_is_not_shadowed_by_the_record_route(client):
    assert client.get("/live/records").status_code == 200


def test_missing_model_is_a_503(client, monkeypatch):
    monkeypatch.setattr(live, "model_ready", lambda: False)
    assert client.get("/live/100?ticks=1").status_code == 503


def test_demo_records_are_all_ds2_and_not_paced():
    assert set(live.DEMO_RECORDS) <= set(live.DS2)
    assert not set(live.DEMO_RECORDS) & set(live.PACED_RECORDS)


def test_check_record_rejects_unknown_names():
    with pytest.raises(live.UnknownRecord):
        live.check_record("abc")
