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
| Data | Simulated patients, devices and alerts, a live ECG replay from the ML service (or a simulated feed), plus two seeded analyses | Empty until you upload your own ECG |
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

Copy `.env.example` to `.env.local` if you need to change the ML service URL or the live feed mode.

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

## Live monitor

The Live monitor page (`/dashboard`) shows a scrolling ECG trace for one
patient, with a coloured and lettered marker (N, S, V, F, Q) on every beat the
model detects, the heart rate, the rhythm, a signal quality indicator, a live
alert feed and a connection badge. Controls: play and pause, replay speed
(1x, 2x, 5x) and, for a clinician, a record picker.

The data comes from a stand-in for the device, MQTT, edge and backend: the ML
service replays a MIT-BIH record in real time (see "Live replay" in
`../ml/README.md`). The ML service only offers records from the held-out test
patients.

| Badge | Meaning |
|-------|---------|
| Live replay | Streaming from the ML service |
| Simulated feed | The ML service is not running; a synthetic ECG made in the browser is shown, and the page says so |
| Reconnecting | The stream was interrupted; retrying with backoff |
| ML service not running | Only in `replay` mode: there is no fallback, and the page keeps retrying |
| Paused | The connection is closed; play resumes from the same position |

**Roles.** The demo patient sees only their own device's stream (`P-0042`,
`ESP32-01`, record 233). The demo clinician sees a patient list with each
patient's latest heart rate and status, each mapped to a different record, and
can open any of them. A patient whose device is offline in the mock data has no
stream.

**Alerts.** Alerts the live feed raises are added, for the session, to the
Alerts page and the recent alerts on the monitor, marked "Live replay" (or
"Simulated"). A pattern that repeats for the same patient within a minute is
shown once, so a long episode does not fill the list.

**Resilience.** The page reconnects automatically with exponential backoff and
resumes from the last position, drops a stream that goes silent, closes the
connection when you leave the page, and keeps only the latest 12 seconds of
samples in a fixed-size buffer.

### Running the monitor with the ML service

```
# terminal 1, from the repository root
cd ml
pip install -r requirements.txt
uvicorn api:app --port 8000

# terminal 2
cd frontend
npm run dev
```

Sign in with a demo account and open Live monitor. The browser never calls the
ML service: it opens `/api/live/{record}`, a Next.js route that streams from
`ML_API_URL`, so the ML service needs no CORS setup.

`NEXT_PUBLIC_LIVE_FEED` (read in the browser, set at build time) chooses the
source:

```
NEXT_PUBLIC_LIVE_FEED=auto     # default: replay, simulated feed if the service is down
NEXT_PUBLIC_LIVE_FEED=replay   # replay only, with an "ML service not running" state
NEXT_PUBLIC_LIVE_FEED=mock     # always the simulated feed
```

### Event format

Every feed delivers the same four event types, typed in `src/lib/live/types.ts`
and parsed in `src/lib/live/parse.ts`:

| Event | Fields |
|-------|--------|
| `samples` | `t`, `recordT`, `fs`, `values`: a block of signal samples |
| `beats` | list of `{t, cls, confidence, groundTruth?}` |
| `alert` | `id`, `alertType`, `severity` (high, medium, low), `confidence`, `message`, `t` |
| `status` | `state`, `heartRate`, `rhythm`, `quality`, `loop` |

`groundTruth` is the annotated class, shown only so the demo can mark where the
model and the annotation differ ("V (ref S)"); it is never the prediction.

### Which parts a real backend replaces

| Part | Here | With a real backend |
|------|------|---------------------|
| Device, MQTT, edge | ML service replaying a record | The device publishes ECG; the edge and backend run the model |
| Feed | `createLiveFeed()` in `src/lib/live/index.ts` returns the replay feed (or the simulated one) | Return a feed that implements `LiveFeed` over the backend's stream |
| Streaming route | `/api/live/[record]`, a proxy to the ML service | Proxy the backend, or let the feed talk to it directly |
| Device to patient mapping | `src/lib/live/config.ts` maps devices and patients to records | The real pairing |
| Live alerts | Session store in `src/lib/data/live-alerts.ts` | The backend's alert API behind the same functions in `src/lib/data` |

No page imports the replay or simulated implementations: they use `LiveFeed`
through `useLiveMonitor` and `useRoster`, so none of them change.

## Hero heart

The home page shows a 3D heart in the hero. It is built in code (no model or
image files): a smooth surface from an implicit heart equation, a glossy
crimson material with a soft inner glow, and two thin cyan rings with a pulse
line that travels round them, echoing the logo. All colours are read from the
design tokens (`--color-brand-fill`, `--color-brand-fill-hover`,
`--color-signal-line` and `--neutral-0`) and are read again when the theme is
toggled, so it follows light and dark.

```
src/lib/heart                  bpm, pulse timing, fallback decision, palette, geometry (all tested)
src/components/home/HeroHeart  the component the page uses
src/components/home/heart      the 3D scene, loaded on demand
```

### Props

```tsx
<HeroHeart bpm={72} className="size-full" />
```

| Prop | Type | Default | Meaning |
|------|------|---------|---------|
| `bpm` | `number` | `72` | Heart rate the beat follows. Missing or invalid values use 72; values are limited to 30 to 220 |
| `className` | `string` | none | Sizes the box. The box must have a size (the hero uses a square) because the heart fills it |

`HeroSection` and `HomePage` take the same optional `bpm` and pass it down, and
`HeroSection` shows it in the heart rate tile. The home page has no live feed
today, so nothing sets it and it stays at 72. A page that has a feed (for
example the replayed patient's heart rate from `useLiveMonitor`) can pass the
current rate to `HomePage`.

### Animation

* **Beat**: a double beat (a strong contraction, then a softer one), each quick
  to contract and slower to release, at `bpm`. The glow brightens with each
  contraction and the ring heads travel one half lap per beat. The beat phase is
  accumulated per frame, so changing `bpm` never makes the heart jump. The
  timing is `src/lib/heart/pulse.ts`.
* **Idle rotation**: one slow turn in about 35 seconds.
* **Parallax**: the heart tilts up to about 6 degrees toward the cursor. Touch
  input is ignored.
* **Reduced motion**: the heart is drawn still, with no beat, rotation or
  parallax, and only redraws when the theme or size changes.

### What shows when

The flat illustration (`HeartPlaceholder`) fills the space from the first
paint, on the server and during hydration, and stays until the 3D heart has
drawn its first frame, then they cross-fade. The box has a fixed square size, so
nothing moves while the scene loads. The choice is `decideHeartMode` in
`src/lib/heart/mode.ts`:

| Situation | Result |
|-----------|--------|
| WebGL not checked yet, or not available | Illustration |
| Save-Data is on, or `prefers-reduced-data: reduce` | Illustration, and the 3D code is never downloaded |
| The WebGL context is lost, or the scene throws | Illustration (an error boundary keeps the page up) |
| `prefers-reduced-motion: reduce` | Still 3D heart |
| Anything else | Animated 3D heart |

### Performance

* The scene is a dynamic import with `ssr: false`, requested only when the
  heart can run, so three.js is not part of the first load of the page.
* Rendering stops (`frameloop="never"`) while the hero is off screen or the tab
  is hidden, and resumes when it is visible again.
* The pixel ratio is capped at 2, the canvas is transparent so the glass
  backdrop shows through, and there is no post-processing.
* Four draw calls: the heart, its glow and two rings. The heart is about 7,000
  vertices, built once. Lighting uses two directional lights and a small
  environment generated from light panels, drawn once per theme.

**Bundle size.** Measured with `npm run build` (sum of the JS files in
`.next/static/chunks`):

| | Raw | Gzip |
|---|-----|------|
| All JS before the heart | 1.0 MB | 324 KB |
| All JS with the heart | 2.0 MB | 596 KB |
| Scene chunk (three.js, fiber, drei, scene code), loaded on demand | 0.98 MB | 263 KB |
| JS the home page loads up front | 739 KB | 232 KB |

The increase is almost entirely the on-demand scene chunk. Visitors with
reduced data, no WebGL or an old browser never download it. Pages other than
the home page do not load it. The numbers move with dependency upgrades, so
re-measure after changing versions.

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
src/lib/live        LiveFeed interface, replay and simulated feeds, buffer, state, record mapping
src/lib/hooks       useLiveMonitor, useRoster, live alert subscriptions
src/app/api/analyze route handler that proxies uploads to the ML service
src/app/api/live    streaming route handlers that proxy the replay to the browser
src/components      auth, shell, analyze, results, history, live, dashboard, ui primitives
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
npm test            # auth layer, result parsing, upload checks, proxies, history, live feeds, hero heart
npm run test:heart  # only the hero heart: pulse timing, fallback decision, palette, geometry
npm run verify      # all three
npm run build
```
