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

## Running it

```
npm install
npm run dev          # http://localhost:3000
```

Copy `.env.example` to `.env.local` if you need to change the ML service URL.

### Running the ML service next to the frontend

The Analyze ECG page needs the analysis service from `../ml`. The browser
never calls it directly: uploads go to the Next.js route `/api/analyze`, which
forwards them to the service and returns its JSON.

```
# terminal 1, from the repository root
cd ml
pip install -r requirements.txt
uvicorn api:app --port 8000

# terminal 2
cd frontend
npm run dev
```

`ML_API_URL` sets where the route forwards to. It is read on the server and
defaults to `http://localhost:8000`.

```
ML_API_URL=http://localhost:8000
```

If the service is not running, the page shows "Analysis is unavailable" and
offers an offline demo result. That result is stored example output for one of
the sample recordings. It is labelled as such, is not an analysis of your file
and is not saved to history.

Check the service with `curl http://localhost:8000/health`.

## Analyze ECG and History

* **Input**: CSV or TXT (one column of samples, or time and value columns),
  or a WFDB record (`.dat` plus `.hea`, chosen together). Files up to 25 MB.
  The sampling rate field (default 360 Hz, 50 to 5000) applies to files
  without a time column.
* **Samples**: the "Use a sample" buttons load the two 30 s recordings in
  `public/samples`, copied from `../ml/samples`.
* **Results**: ECG trace with a coloured and lettered marker on every beat
  (N, S, V, F, Q), heart rate, rhythm, signal quality, beat counts, alerts
  with severity, and a beats table with time, class and confidence. WFDB
  uploads are binary, so they show a beat timeline instead of a trace. The
  "not a medical device and not a diagnosis" notice is always on screen.
* **History**: every analysis is saved for the signed-in user. Open one to
  see the full result again, delete it, or clear all. A clinician also sees
  the demo patient's analyses in a separate read-only section.

The result schema is documented in `../ml/README.md` and parsed in
`src/lib/analysis/parse.ts`.

## How it is put together

```
src/lib/auth        AuthService interface, local stand-in, demo accounts, role rules
src/lib/data        data access: role scoped getters and the per-user history
src/lib/analysis    result schema, parsing, upload checks, API client, summaries
src/app/api/analyze route handler that proxies uploads to the ML service
src/components      auth, shell, analyze, results, history, dashboard, ui primitives
```

**Accounts are a local stand-in.** `src/lib/auth` defines one interface
(`register`, `login`, `loginDemo`, `logout`, `currentUser`). The local
implementation keeps accounts in the browser's `localStorage`, with passwords
stored only as salted PBKDF2 hashes made with WebCrypto. This is for the demo
and for trying the app on one machine: anyone with access to the browser can
read the stored accounts, and data does not follow you between browsers. To
use a real backend, implement `AuthService` and return it from `getAuth()` in
`src/lib/auth/index.ts`; no page imports the local implementation.

**History is stored per user in `localStorage`** behind async functions in
`src/lib/data`. If a trace is too large to store, the result is kept without
it and the history shows the beat timeline.

## Checks

```
npm run lint
npm run typecheck
npm test            # auth layer, result parsing, upload checks, proxy, history
npm run verify      # all three
npm run build
```
