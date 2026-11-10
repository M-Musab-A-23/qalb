import benchmark


def test_timeit_reports_median_and_runs():
    r = benchmark.timeit(lambda: sum(range(1000)), repeat=5)
    assert r["runs"] == 5 and 0 <= r["median_ms"] <= r["p95_ms"] + 1e-9


def test_peak_memory_is_positive():
    assert benchmark.peak_rss_mb() > 10


def test_markdown_lists_every_mode_and_the_total_size():
    mode = {"model_name": "m", "first_call_ms": 10.0, "n_beats_10s": 11,
            "window_10s": {"median_ms": 5.0, "p95_ms": 6.0, "runs": 3},
            "upload_30s": {"median_ms": 9.0, "p95_ms": 10.0, "runs": 3},
            "per_beat_ms": 0.5, "peak_mem_mb": 120.0}
    md = benchmark.to_markdown({"modes": {"ensemble": mode, "boosting": {**mode, "model_name": "b"}},
                                "files": [("a.joblib", 1.0), ("b.pt", 0.25)]})
    assert "| m | b |" in md or "m | b" in md
    assert "1.25 MB" in md and "per uploaded 30 s file" in md
