"""Live replay of MIT-BIH records as a stand-in for a real device feed.

A replay session walks through one record at real-time speed (or 2x, 5x),
sends the new signal samples every 250 ms and runs the classifier on the
latest 10 seconds every 2 seconds. The HTTP layer is a Server-Sent Events
stream, ``GET /live/{record}``; ``api.py`` mounts the router.

Only DS2 records are offered, so the demo never replays a record the model
was trained on.
"""
from __future__ import annotations

from qalb_ml.config import DS2, PACED_RECORDS

TICK_S = 0.25            # wall-clock seconds between sample events
ANALYSIS_S = 2.0         # wall-clock seconds between model runs
WINDOW_S = 10.0          # length of the window the model sees
MIN_WINDOW_S = 4.0       # no analysis until this much signal exists
WIRE_FS = 120            # sampling rate of the samples sent to the client
SPEEDS = (1, 2, 5)

# Demo records, all from the DS2 test patients, with what each one shows.
DEMO_RECORDS: dict[str, str] = {
    "100": "Normal sinus rhythm, rare atrial premature beats",
    "123": "Normal sinus rhythm, rare ventricular beats",
    "105": "Noisy signal with frequent ventricular beats",
    "200": "Frequent ventricular beats, bigeminy and runs",
    "221": "Irregular rhythm with ventricular beats",
    "233": "Frequent ventricular beats and couplets",
}

assert all(r in DS2 and r not in PACED_RECORDS for r in DEMO_RECORDS)
