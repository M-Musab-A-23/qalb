"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ConnectedDevicesPanel } from "@/components/dashboard/ConnectedDevicesPanel";
import { HeartRateTrendCard } from "@/components/dashboard/HeartRateTrendCard";
import { NoDeviceCard } from "@/components/dashboard/NoDeviceCard";
import { RecentAlertsPanel } from "@/components/dashboard/RecentAlertsPanel";
import { RecentAnalysesCard } from "@/components/dashboard/RecentAnalysesCard";
import { Disclaimer } from "@/components/results/Disclaimer";
import { TopBar } from "@/components/shell/TopBar";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { DeviceChip } from "@/components/ui/DeviceChip";
import {
  acknowledgeLiveAlert,
  getDevicesFor,
  getPatientsFor,
  recordLiveAlert,
  type Device,
} from "@/lib/data";
import { useAlertsFor } from "@/lib/hooks/useAlerts";
import { useLiveMonitor } from "@/lib/hooks/useLiveMonitor";
import { useRoster, type RosterSource } from "@/lib/hooks/useRoster";
import {
  assignmentForPatient,
  DEFAULT_SPEED,
  replayAssignments,
} from "@/lib/live/config";
import { describeConnection, sourceSubtitle, traceNote } from "@/lib/live/labels";
import { deriveStatus } from "@/lib/live/state";
import type { FeedKind, LiveAlert, LiveSpeed } from "@/lib/live/types";
import { ConnectionBadge } from "./ConnectionBadge";
import { LiveHeartRate } from "./LiveHeartRate";
import { PatientRoster, type RosterRow } from "./PatientRoster";
import { ReplayControls } from "./ReplayControls";
import { RhythmChip } from "./RhythmChip";
import { SignalQuality } from "./SignalQuality";
import { TraceCard } from "./TraceCard";

const NO_ALERTS = "No alerts raised by the live feed yet.";

export function LiveMonitorView() {
  const { user } = useAuth();
  // The page sits behind AuthGate, so a user is always present here.
  if (!user) return null;
  return <Monitor user={user} />;
}

function Monitor({ user }: { user: NonNullable<ReturnType<typeof useAuth>["user"]> }) {
  const isClinician = user.role === "clinician";
  const patients = getPatientsFor(user);
  const devices = getDevicesFor(user);
  const alerts = useAlertsFor(user);
  const hasStream = isClinician || devices.length > 0;

  const [openId, setOpenId] = useState<string | null>(null);
  const [override, setOverride] = useState<{ patientId: string; record: string } | null>(null);
  const [speed, setSpeed] = useState<LiveSpeed>(DEFAULT_SPEED);
  const [paused, setPaused] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // A patient only ever sees their own stream; a clinician opens any patient.
  const activeId = isClinician
    ? (openId ?? patients[0]?.id ?? null)
    : (user.patientId ?? patients[0]?.id ?? null);
  const assignment = assignmentForPatient(activeId) ?? replayAssignments[0];
  const picked = override?.patientId === activeId ? override.record : null;
  const record = picked ?? assignment.record;
  const offsetSeconds = picked ? 0 : assignment.offsetSeconds;
  const deviceId = devices.find((d) => d.patientId === activeId)?.id ?? assignment.deviceId;

  const sourceOf = (kind: FeedKind) => (kind === "mock" ? "simulated" : "live-replay");

  const onAlert = useCallback(
    (alert: LiveAlert, kind: FeedKind) => {
      if (!activeId) return;
      recordLiveAlert({
        patientId: activeId,
        deviceId,
        record,
        alert,
        source: sourceOf(kind),
      });
    },
    [activeId, deviceId, record],
  );

  const monitor = useLiveMonitor({
    record,
    speed,
    offsetSeconds,
    paused: paused || !hasStream,
    onAlert,
  });

  const rosterSources: RosterSource[] = useMemo(
    () =>
      isClinician
        ? patients.map((patient) => {
            const mapped = assignmentForPatient(patient.id);
            const device: Device | undefined = devices.find((d) => d.patientId === patient.id);
            return {
              patientId: patient.id,
              deviceId: patient.deviceId,
              record: mapped?.record ?? "100",
              offsetSeconds: mapped?.offsetSeconds ?? 0,
              online: device?.connected ?? false,
            };
          })
        : [],
    // patients and devices come from static data scoped by role.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isClinician, user.id],
  );

  const roster = useRoster(rosterSources, activeId, (source, alert, kind) => {
    recordLiveAlert({
      patientId: source.patientId,
      deviceId: source.deviceId,
      record: source.record,
      alert,
      source: sourceOf(kind),
    });
  });

  if (!hasStream) {
    return (
      <>
        <TopBar title="Live monitoring" subtitle={`Welcome, ${user.name}`} />
        <NoDeviceCard />
        <RecentAnalysesCard userId={user.id} className="max-w-[720px]" />
      </>
    );
  }

  const { state, connection, trace } = monitor;
  const status = deriveStatus(state);
  const connected = connection.state === "live" && !paused;
  const { hint } = describeConnection(connection, paused);

  const banner = alerts.find(
    (alert) =>
      alert.severity === "critical" && !alert.acknowledged && !dismissed.includes(alert.id),
  );
  const liveForPatient = alerts.filter(
    (alert) => alert.source !== undefined && alert.patientId === activeId,
  );

  const rows: RosterRow[] = rosterSources.map((source) => {
    const active = source.patientId === activeId;
    const entry = roster[source.patientId];
    return {
      patientId: source.patientId,
      deviceId: source.deviceId,
      record: active ? record : source.record,
      online: source.online,
      state: active ? state : (entry?.state ?? { ...state, heartRate: null, alerts: [] }),
      connection: active ? connection : (entry?.connection ?? null),
    };
  });

  return (
    <>
      <TopBar
        search={isClinician}
        title="Live monitoring"
        subtitle={
          isClinician
            ? `Patient ${activeId} · ${sourceSubtitle(connection.kind, record)}`
            : `Your device ${deviceId} · ${sourceSubtitle(connection.kind, record)}`
        }
        actions={
          <>
            <DeviceChip name={deviceId} connected={connected} />
            <ConnectionBadge connection={connection} paused={paused} />
          </>
        }
      />
      {banner ? (
        <AlertBanner
          severity="critical"
          title={banner.title}
          description={`Patient ${banner.patientId} · ${banner.detail.toLowerCase()}, ${banner.time}`}
          onAcknowledge={() => {
            setDismissed((ids) => [...ids, banner.id]);
            if (banner.source) acknowledgeLiveAlert(banner.id);
          }}
        />
      ) : null}
      <ReplayControls
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        speed={speed}
        onSpeed={setSpeed}
        record={record}
        onRecord={(next) => activeId && setOverride({ patientId: activeId, record: next })}
        recordPicker={isClinician}
      />
      {hint && (connection.state !== "live" || connection.kind === "mock") ? (
        <p role="status" className="text-sm leading-5 text-[var(--color-text-secondary)]">
          {hint}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TraceCard
          trace={trace}
          speed={speed}
          title="ECG · Lead II"
          badge={<ConnectionBadge connection={connection} paused={paused} />}
          counts={state.counts}
          note={traceNote(connection.kind, record, state)}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 xl:grid-cols-1">
          <LiveHeartRate heartRate={state.heartRate} />
          <RhythmChip rhythm={state.rhythm} status={status} />
          <SignalQuality quality={state.quality} />
        </div>
      </div>
      <div className="flex flex-col gap-6 xl:flex-row">
        <RecentAlertsPanel
          alerts={liveForPatient}
          title="Live alerts"
          limit={6}
          emptyText={NO_ALERTS}
          className="min-w-0 flex-1"
        />
        {isClinician ? (
          <PatientRoster
            rows={rows}
            activeId={activeId}
            onOpen={(id) => {
              setOpenId(id);
              setPaused(false);
            }}
            className="flex-[1.4]"
          />
        ) : (
          <ConnectedDevicesPanel devices={devices} className="xl:w-[360px] xl:shrink-0" />
        )}
      </div>
      <div className="flex flex-col gap-6 xl:flex-row">
        <HeartRateTrendCard className="min-w-0 flex-1" />
        {isClinician ? (
          <ConnectedDevicesPanel devices={devices} className="xl:w-[360px] xl:shrink-0" />
        ) : null}
      </div>
      <Disclaimer />
      <RecentAnalysesCard userId={user.id} />
    </>
  );
}
