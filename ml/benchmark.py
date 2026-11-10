"""Inference speed, model size and peak memory.

    python benchmark.py            # writes reports/benchmark.md

Latency is measured on MIT-BIH record 100 (DS2) when the raw data is present,
otherwise on a synthetic ECG. Numbers depend on the machine; the report states it.
"""
from __future__ import annotations

import argparse
import platform
import statistics
import subprocess
import sys
import time
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


def peak_rss_mb() -> float:
    """Peak resident memory of this process so far, in MB (Windows and POSIX)."""
    if sys.platform == "win32":
        import ctypes
        from ctypes import wintypes

        class Counters(ctypes.Structure):
            _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD),
                        ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
                        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
                        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                        ("QuotaNonPagedPoolUsage", ctypes.c_size_t), ("PagefileUsage", ctypes.c_size_t),
                        ("PeakPagefileUsage", ctypes.c_size_t)]

        c = Counters()
        c.cb = ctypes.sizeof(c)
        kernel32, psapi = ctypes.WinDLL("kernel32"), ctypes.WinDLL("psapi")
        kernel32.GetCurrentProcess.restype = wintypes.HANDLE
        psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(Counters),
                                               wintypes.DWORD]
        psapi.GetProcessMemoryInfo(kernel32.GetCurrentProcess(), ctypes.byref(c), c.cb)
        return c.PeakWorkingSetSize / 1e6
    import resource
    rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return rss / 1e6 if sys.platform == "darwin" else rss / 1e3


def _force_fallback() -> None:
    import qalb_ml.inference as inf
    inf.torch_available = lambda: False


def memory_child(mode: str) -> None:
    """Run one 30 s analysis in a fresh process and print its peak memory."""
    if mode == "boosting":
        _force_fallback()
    predict.analyse_recording(_signal(30), FS)
    print(f"{peak_rss_mb():.1f}")


def child_peak_mb(mode: str) -> float:
    out = subprocess.run([sys.executable, __file__, "--mem-child", mode], check=True,
                         capture_output=True, text=True).stdout.strip().splitlines()
    return float(out[-1])


def model_files() -> list[tuple[str, float]]:
    return [(p.name, p.stat().st_size / 1e6) for p in sorted(MODEL_DIR.glob("qalb_beat_*"))]


def measure(mode: str, repeat: int) -> dict:
    """Latency of one mode: ``ensemble`` (as packaged) or ``boosting`` (no torch fallback)."""
    import qalb_ml.inference as inf

    real = inf.torch_available
    if mode == "boosting":
        _force_fallback()
    try:
        predict.load_model.cache_clear()
        sig30 = _signal(30)
        sig10 = sig30[: 10 * FS]
        t = time.perf_counter()
        predict.load_model.cache_clear()
        bundle = predict.load_model()
        predict.predict_window(sig10, FS)            # first call also loads the CNN and torch
        first = (time.perf_counter() - t) * 1000
        n_beats = max(len(predict.predict_beats(sig10, FS)), 1)
        window = timeit(lambda: predict.predict_window(sig10, FS), repeat)
        upload = timeit(lambda: predict.analyse_recording(sig30, FS), repeat)
        return {"model_name": predict.active_name(bundle), "first_call_ms": first,
                "n_beats_10s": n_beats, "window_10s": window, "upload_30s": upload,
                "per_beat_ms": window["median_ms"] / n_beats, "peak_mem_mb": child_peak_mb(mode)}
    finally:
        inf.torch_available = real


def run(repeat: int = 10) -> dict:
    modes = {"ensemble": measure("ensemble", repeat)}
    if "ensemble" in predict.load_model():
        modes["boosting"] = measure("boosting", repeat)
    return {"modes": modes, "files": model_files()}


def to_markdown(r: dict) -> str:
    total = sum(s for _, s in r["files"])
    first = next(iter(r["modes"].values()))
    lines = [
        "# Inference benchmark", "",
        f"Machine: {platform.processor() or platform.machine()}, {platform.system()} "
        f"{platform.release()}, Python {platform.python_version()}, one process, CPU only. "
        f"Latency is the median (and 95th percentile) of {first['window_10s']['runs']} runs after a "
        "warm-up call, on MIT-BIH record 100. Run `python benchmark.py` to reproduce on your machine.", "",
        "| measurement | " + " | ".join(f"{m['model_name']}" for m in r["modes"].values()) + " |",
        "|---|" + "---|" * len(r["modes"]),
    ]
    def row(label, fn):
        return f"| {label} | " + " | ".join(fn(m) for m in r["modes"].values()) + " |"

    lines += [
        row("first analysis after start (loads model, torch, CNN)", lambda m: f"{m['first_call_ms']:.0f} ms"),
        row("per beat (10 s window divided by beats)", lambda m: f"{m['per_beat_ms']:.2f} ms"),
        row("per 10 s window, median / p95",
            lambda m: f"{m['window_10s']['median_ms']:.0f} / {m['window_10s']['p95_ms']:.0f} ms"),
        row("per uploaded 30 s file, median / p95",
            lambda m: f"{m['upload_30s']['median_ms']:.0f} / {m['upload_30s']['p95_ms']:.0f} ms"),
        row("peak memory of a fresh process (resident)", lambda m: f"{m['peak_mem_mb']:.0f} MB"),
        "", "The second column, when present, is the torch-missing fallback (boosting model only), "
        "forced by disabling torch detection.", "",
        "| model file | size |", "|---|---|",
    ]
    lines += [f"| {n} | {s:.2f} MB |" for n, s in r["files"]]
    lines.append(f"| total | {total:.2f} MB |")
    return "\n".join(lines) + "\n"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repeat", type=int, default=10)
    ap.add_argument("--out", default=str(REPORT_DIR / "benchmark.md"))
    ap.add_argument("--mem-child", choices=["ensemble", "boosting"], help=argparse.SUPPRESS)
    args = ap.parse_args(argv)
    if args.mem_child:
        memory_child(args.mem_child)
        return 0
    md = to_markdown(run(args.repeat))
    Path(args.out).write_text(md)
    print(md)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
