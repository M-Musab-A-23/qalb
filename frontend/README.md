# Frontend

Next.js web portal for QALB: live ECG monitoring, rhythm alerts, and an ECG
analysis page where a recording is uploaded and labelled beat by beat by the
trained model in [`../ml`](../ml).

> QALB is a research prototype. It is not a medical device and not a
> diagnosis.

## Two modes, one app

| | Demo mode | Real mode |
|---|-----------|-----------|
| Accounts | Seeded demo clinician and demo patient | Anyone registers as a patient |
| Data | Simulated patients, devices, alerts and a replayed ECG stream, plus two seeded analyses | Empty until you upload your own ECG |
| Use | Project demo | Upload a file, get it analysed, keep a history |

Both modes run in the same build. The sign-in and register pages have a
"Try the demo" row that signs in a demo account with one click.

## Roles and demo accounts

| Role | Sees | Pages |
|------|------|-------|
| Clinician | All patients, all alerts, all devices, and a read-only section of demo-patient analyses in History | Overview, Live monitor, Analyze ECG, History, Patients, Alerts, Devices, Settings |
| Patient | Only their own device and their own analyses | Overview, Live monitor, Analyze ECG, History, Devices, Settings |

Self-registered accounts are always patients and start with no device and no
history; every page shows an empty state until there is data.

| Demo account | Email | Password | Linked to |
|--------------|-------|----------|-----------|
| Clinician | `clinician@demo.qalb` | `demo-clinician-2025` | all patients |
| Patient | `patient@demo.qalb` | `demo-patient-2025` | patient `P-0042`, device `ESP32-01` |

The demo buttons skip the password. While a demo account is active the
sidebar shows a small "Demo" badge. Unauthenticated visitors are redirected to
`/login`, and a patient who opens a clinician-only page is sent back to the
live monitor.
