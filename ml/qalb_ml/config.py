"""Shared constants for the QALB arrhythmia pipeline."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT.parent / "data" / "raw" / "mitdb"
MODEL_DIR = ROOT / "models"
REPORT_DIR = ROOT / "reports"
CACHE_DIR = ROOT / ".cache"

FS = 360                      # working sampling rate (Hz)
PRE_S = 0.25                  # seconds kept before the R peak
POST_S = 0.40                 # seconds kept after the R peak
PRE = int(round(PRE_S * FS))  # 90 samples
POST = int(round(POST_S * FS))  # 144 samples
BEAT_LEN = PRE + POST

BAND = (0.5, 40.0)            # band-pass edges (Hz)
LEAD = "MLII"

CLASSES = ["N", "S", "V", "F", "Q"]
PACED_RECORDS = ["102", "104", "107", "217"]

# Standard inter-patient split (de Chazal et al.)
DS1 = ["101", "106", "108", "109", "112", "114", "115", "116", "118", "119",
       "122", "124", "201", "203", "205", "207", "208", "209", "215", "220",
       "223", "230"]
DS2 = ["100", "103", "105", "111", "113", "117", "121", "123", "200", "202",
       "210", "212", "213", "214", "219", "221", "222", "228", "231", "232",
       "233", "234"]

DISCLAIMER = ("QALB is a research and monitoring prototype. It is not a medical "
              "device and must not be used for diagnosis or treatment decisions.")
