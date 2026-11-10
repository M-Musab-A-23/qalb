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
from predict import MODEL_PATH, active_name, analyse_recording, load_model
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
        out["model"] = {"name": active_name(bundle), "version": bundle["version"]}
    return out


async def _read_limited(upload: UploadFile) -> bytes:
    data = await upload.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (limit 25 MB).")
    return data


@app.post("/analyze")
async def analyze(file: UploadFile = File(...),
                  header: UploadFile | None = File(None),
                  fs: float = Form(FS)) -> dict:
    """Analyse an uploaded ECG and return the QALB result schema.

    For WFDB, send the ``.dat`` as ``file`` and the ``.hea`` as ``header``.
    """
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=503, detail="Model not available on the server.")
    name = file.filename or "upload"
    data = await _read_limited(file)
    try:
        if Path(name).suffix.lower() in (".dat", ".hea"):
            if header is None:
                raise InputError("A WFDB upload needs both the .dat file and its .hea header.")
            with tempfile.TemporaryDirectory() as tmp:
                # keep the uploaded names: the header refers to its data file by name
                dat_name = Path(name).name
                hea_name = Path(header.filename or "record.hea").name
                if Path(dat_name).suffix.lower() == ".hea":
                    dat_name, hea_name = hea_name, dat_name
                (Path(tmp) / dat_name).write_bytes(data)
                (Path(tmp) / hea_name).write_bytes(await _read_limited(header))
                ecg = load_ecg(str(Path(tmp) / hea_name), fs=fs)
        else:
            ecg = load_ecg(data, fs=fs, filename=name)
        result = analyse_recording(ecg.signal, ecg.fs)
    except InputError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    result["input"] = {"filename": name, "original_sampling_rate": ecg.original_fs,
                       **{k: v for k, v in ecg.info.items() if k != "quality"}}
    return result
