"""The single JSON-serialisable result returned by every analysis path."""
from __future__ import annotations

from .config import DISCLAIMER, FS

SCHEMA_VERSION = "1.0"

RESULT_SCHEMA = {
    "schema_version": "str",
    "model": {"name": "str", "version": "str"},
    "sampling_rate_in": "float, Hz of the signal that was passed in",
    "sampling_rate_model": "float, always 360",
    "duration_s": "float",
    "beats": [{"sample": "int, index into the input signal", "time_s": "float",
               "class": "N | S | V | F | Q", "confidence": "float 0-1"}],
    "rhythm": {"n_beats": "int", "class_counts": "dict", "mean_hr_bpm": "float|null",
               "rr_mean_s": "float|null", "rr_cv": "float|null",
               "rr_jump_fraction": "float|null",
               "rhythm": "regular | irregular | insufficient data"},
    "alerts": [{"type": "str", "severity": "low | medium | high", "confidence": "float 0-1",
                "start_sample": "int", "end_sample": "int", "message": "str"}],
    "quality": {"score": "float 0-1", "flatline_fraction": "float", "noise_ratio": "float",
                "beat_agreement": "float", "rate_plausibility": "float"},
    "warnings": ["str"],
    "disclaimer": "str",
}


def make_result(*, model_name, model_version, fs_in, duration_s, beats, rhythm, alerts,
                quality, warnings=None) -> dict:
    return {
        "schema_version": SCHEMA_VERSION,
        "model": {"name": model_name, "version": model_version},
        "sampling_rate_in": float(fs_in),
        "sampling_rate_model": float(FS),
        "duration_s": round(float(duration_s), 3),
        "beats": beats,
        "rhythm": rhythm,
        "alerts": alerts,
        "quality": quality,
        "warnings": list(warnings or []),
        "disclaimer": DISCLAIMER,
    }
