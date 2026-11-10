"""Small HTTP service around the classifier.

    uvicorn api:app --port 8000

POST /analyze   multipart upload: file (CSV/TXT, or .dat + .hea), fs (Hz, default 360)
GET  /health    liveness and model status
"""
from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from inputs import InputError, load_ecg
from predict import MODEL_PATH, analyse_recording, load_model
from qalb_ml.config import DISCLAIMER, FS

MAX_UPLOAD_BYTES = 25 * 1024 * 1024

app = FastAPI(title="QALB ECG analysis", version="1.0",
              description=DISCLAIMER)


@app.get("/health")
def health() -> dict:
    ready = MODEL_PATH.exists()
    out = {"status": "ok" if ready else "model missing", "model_loaded": ready,
           "disclaimer": DISCLAIMER}
    if ready:
        bundle = load_model()
        out["model"] = {"name": bundle["name"], "version": bundle["version"]}
    return out
