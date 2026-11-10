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
