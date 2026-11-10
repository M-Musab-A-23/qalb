# QALB (قلب)

**IoMT remote cardiac monitoring.** A simulated wearable streams real ECG data over MQTT, an edge layer cleans it, the cloud stores and visualises it, and an ML model flags abnormal heartbeats in near real time.

## Architecture

```
Wokwi ESP32 (ECG replay) --MQTT--> Mosquitto --> Edge filter --> Backend + DB --> Live dashboard
                                                       \--> ML classifier --> Alerts
```

| Layer | Tool |
|---|---|
| Sensing | Wokwi ESP32 simulator, replaying PhysioNet MIT-BIH / BIDMC records |
| Network | WiFi (simulated) + MQTT via Mosquitto |
| Edge / fog | Python filtering and downsampling |
| Cloud / platform | Backend + database + dashboard (ThingsBoard as fallback) |
| ML | Python, scikit-learn, trained on MIT-BIH Arrhythmia |

## Repo layout

| Folder | Contents |
|---|---|
| `firmware/` | Wokwi project files (sketch, `diagram.json`, `wokwi.toml`) |
| `edge/` | Signal preprocessing |
| `ml/` | Dataset download, notebooks, training, saved model |
| `platform/` | `docker-compose.yml` for Mosquitto (+ ThingsBoard) |
| `backend/` | API, MQTT subscriber, DB |
| `frontend/` | Web dashboard (Next.js) |
| `docs/` | Architecture and WBAN diagrams, report, weekly notes |
| `data/` | README only; datasets are downloaded, never committed |

## Quick start

```bash
git clone https://github.com/M-Musab-A-23/qalb.git
cd qalb
cp .env.example .env            # fill in real values, never commit .env
cd platform && docker compose up -d   # starts the MQTT broker
cd ../ml && pip install -r requirements.txt && python download_data.py
cd ../frontend && npm install && npm run dev   # web dashboard on localhost:3000
```

## Team

| Member | Role |
|---|---|
| Muhammad Musab Abdullah | Web portal, ML |
| Muneeb Rifaq | TBD |
| Hassan Shahid | TBD |
| Hassan Irfan | TBD |

## Workflow

- Never push to `main`. Branch as `feat/...`, `fix/...` or `docs/...`, then open a pull request.
- Every PR needs 1 approval from another member, and all review comments resolved. PRs are merged with rebase so each commit is kept.
- Link each PR to its issue (`Closes #12`) and its milestone.
- Commit messages: `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`.

## Milestones

| Week | Milestone |
|---|---|
| 3 | Device publishing real ECG replay over MQTT |
| 5 | Cloud MVP with live chart |
| 7 | Full end-to-end pipeline with ML alerts |
| 10 | Final: report, slides, demo |

## Data

ECG data comes from [PhysioNet](https://physionet.org/) (MIT-BIH Arrhythmia, BIDMC CHF). It is de-identified and public, and is downloaded by `ml/download_data.py`.

## License

MIT