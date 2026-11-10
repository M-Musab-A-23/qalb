"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { TopBar } from "@/components/shell/TopBar";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";
import { DeviceChip } from "@/components/ui/DeviceChip";
import { getAlertsFor, getDevicesFor } from "@/lib/data";
import { ConnectedDevicesPanel } from "./ConnectedDevicesPanel";
import { EcgChartCard } from "./EcgChartCard";
import { HeartRateTrendCard } from "./HeartRateTrendCard";
import { NoDeviceCard } from "./NoDeviceCard";
import { RecentAlertsPanel } from "./RecentAlertsPanel";
import { RecentAnalysesCard } from "./RecentAnalysesCard";
import { VitalsRow } from "./VitalsRow";

export function DashboardView() {
  const { user } = useAuth();
  const [paused, setPaused] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // The page sits behind AuthGate, so a user is always present here.
  if (!user) return null;

  const alerts = getAlertsFor(user);
  const devices = getDevicesFor(user);
  const isClinician = user.role === "clinician";
  // An account with no device has nothing to stream.
  const hasStream = isClinician || devices.length > 0;
  const deviceName = devices[0]?.id ?? "ESP32-01";

  const banner = alerts.find(
    (alert) =>
      alert.severity === "critical" &&
      !alert.acknowledged &&
      !dismissed.includes(alert.id),
  );

  if (!hasStream) {
    return (
      <>
        <TopBar
          title="Live monitoring"
          subtitle={`Welcome, ${user.name}`}
        />
        <NoDeviceCard />
        <RecentAnalysesCard userId={user.id} className="max-w-[720px]" />
      </>
    );
  }

  return (
    <>
      <TopBar
        search={isClinician}
        title="Live monitoring"
        subtitle={
          isClinician
            ? "Patient P-0042 · simulated MIT-BIH record 100"
            : `Your device ${deviceName} · simulated MIT-BIH record 100`
        }
        actions={
          <>
            <DeviceChip name={deviceName} connected />
            <Button variant="secondary" onClick={() => setPaused((p) => !p)}>
              {paused ? "Resume stream" : "Pause stream"}
            </Button>
            {isClinician ? <Button>Add patient</Button> : null}
          </>
        }
      />
      {banner ? (
        <AlertBanner
          severity="critical"
          title={banner.title}
          description={`Patient ${banner.patientId} · ${banner.detail.toLowerCase()}, ${banner.time}`}
          onAcknowledge={() => setDismissed((ids) => [...ids, banner.id])}
        />
      ) : null}
      <VitalsRow paused={paused} />
      <div className="flex flex-col gap-6 xl:flex-row">
        <EcgChartCard paused={paused} className="min-w-0 flex-1" />
        <RecentAlertsPanel alerts={alerts} className="xl:w-[360px] xl:shrink-0" />
      </div>
      <div className="flex flex-col gap-6 xl:flex-row">
        <HeartRateTrendCard className="min-w-0 flex-1" />
        <ConnectedDevicesPanel devices={devices} className="xl:w-[360px] xl:shrink-0" />
      </div>
      <RecentAnalysesCard userId={user.id} />
    </>
  );
}
