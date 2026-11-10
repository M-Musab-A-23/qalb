"""Inference speed, model size and peak memory.

    python benchmark.py            # writes reports/benchmark.md

Latency is measured on MIT-BIH record 100 (DS2) when the raw data is present,
otherwise on a synthetic ECG. Numbers depend on the machine; the report states it.
"""
from __future__ import annotations

import argparse
import platform
import statistics
import time
import tracemalloc
from pathlib import Path

import numpy as np

import predict
from qalb_ml.config import FS, MODEL_DIR, RAW_DIR, REPORT_DIR


def _signal(seconds: float) -> np.ndarray:
    if RAW_DIR.exists():
        from qalb_ml.data import load_record
        sig, fs, _, _ = load_record("100")
        assert fs == FS
        return sig[: int(seconds * fs)]
    from tests.conftest import synthetic_ecg
    return synthetic_ecg(seconds=seconds)


def timeit(fn, repeat: int) -> dict:
    """Median and spread of ``repeat`` timed calls, in milliseconds."""
    fn()                                           # warm-up (model load, caches)
    times = []
    for _ in range(repeat):
        t = time.perf_counter()
        fn()
        times.append((time.perf_counter() - t) * 1000)
    q = statistics.quantiles(times, n=20) if len(times) >= 4 else [max(times)] * 19
    return {"median_ms": statistics.median(times), "p95_ms": q[18], "runs": repeat}


def peak_memory_mb(fn) -> float:
    """Peak Python-allocated memory (tracemalloc) while ``fn`` runs, in MB."""
    tracemalloc.start()
    fn()
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return peak / 1e6


def model_files() -> list[tuple[str, float]]:
    return [(p.name, p.stat().st_size / 1e6) for p in sorted(MODEL_DIR.glob("qalb_beat_*"))]


def run(repeat: int = 10) -> dict:
    sig30 = _signal(30)
    sig10 = sig30[: 10 * FS]
    predict.load_model.cache_clear()
    load = timeit(lambda: predict.load_model.cache_clear() or predict.load_model(), 3)
    bundle = predict.load_model()
    n_beats = max(len(predict.predict_beats(sig10, FS)), 1)
    window = timeit(lambda: predict.predict_window(sig10, FS), repeat)
    upload = timeit(lambda: predict.analyse_recording(sig30, FS), repeat)
    mem = peak_memory_mb(lambda: predict.analyse_recording(sig30, FS))
    return {
        "model_name": predict.active_name(bundle), "n_beats_10s": n_beats,
        "load": load, "window_10s": window, "upload_30s": upload,
        "per_beat_ms": window["median_ms"] / n_beats, "peak_mem_mb": mem,
        "files": model_files(),
    }


def to_markdown(r: dict) -> str:
    total = sum(s for _, s in r["files"])
    lines = [
        "# Inference benchmark", "",
        f"Model: `{r['model_name']}`. Machine: {platform.processor() or platform.machine()}, "
        f"{platform.system()} {platform.release()}, Python {platform.python_version()}, "
        f"single process. Medians over {r['window_10s']['runs']} runs after one warm-up call.", "",
        "| measurement | median | p95 |", "|---|---|---|",
        f"| model load (cold) | {r['load']['median_ms']:.0f} ms | - |",
        f"| per beat (10 s window / {r['n_beats_10s']} beats) | {r['per_beat_ms']:.2f} ms | - |",
        f"| per 10 s window | {r['window_10s']['median_ms']:.0f} ms | {r['window_10s']['p95_ms']:.0f} ms |",
        f"| per uploaded 30 s file | {r['upload_30s']['median_ms']:.0f} ms | {r['upload_30s']['p95_ms']:.0f} ms |",
        "", f"Peak Python memory while analysing a 30 s file: {r['peak_mem_mb']:.1f} MB "
        "(tracemalloc; torch's native buffers are not included).", "",
        "| model file | size |", "|---|---|",
    ]
    lines += [f"| {n} | {s:.2f} MB |" for n, s in r["files"]]
    lines.append(f"| total | {total:.2f} MB |")
    return "\n".join(lines) + "\n"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repeat", type=int, default=10)
    ap.add_argument("--out", default=str(REPORT_DIR / "benchmark.md"))
    args = ap.parse_args(argv)
    md = to_markdown(run(args.repeat))
    Path(args.out).write_text(md)
    print(md)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
