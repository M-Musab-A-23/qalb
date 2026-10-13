"""Download the PhysioNet datasets used by QALB into data/raw/."""
from pathlib import Path

import wfdb

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"

DATABASES = {
    "mitdb": "MIT-BIH Arrhythmia Database",
    "chfdb": "BIDMC Congestive Heart Failure Database",
}


def main() -> None:
    for db, name in DATABASES.items():
        target = RAW / db
        target.mkdir(parents=True, exist_ok=True)
        print(f"Downloading {name} -> {target}")
        wfdb.dl_database(db, str(target))
    print("Done.")


if __name__ == "__main__":
    main()
