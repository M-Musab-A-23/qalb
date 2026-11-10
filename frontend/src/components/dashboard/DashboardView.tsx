"use client";

import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";
import { DeviceChip } from "@/components/ui/DeviceChip";
import { getAlerts } from "@/lib/data";
import { ConnectedDevicesPanel } from "./ConnectedDevicesPanel";
import { EcgChartCard } from "./EcgChartCard";
import { HeartRateTrendCard } from "./HeartRateTrendCard";
import { RecentAlertsPanel } from "./RecentAlertsPanel";
import { VitalsRow } from "./VitalsRow";

export function DashboardView() {
  const [paused, setPaused] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const banner = getAlerts().find(
    (alert) =>
      alert.severity === "critical" &&
      !alert.acknowledged &&
      !dismissed.includes(alert.id),
  );

  return (
    <>
      <TopBar
        title="Live monitoring"
        subtitle="Patient P-0042 · simulated MIT-BIH record 100"
        actions={
          <>
            <DeviceChip name="ESP32-01" connected />
            <Button variant="secondary" onClick={() => setPaused((p) => !p)}>
              {paused ? "Resume stream" : "Pause stream"}
            </Button>
            <Button>Add patient</Button>
          </>
        }
      />
      {banner ? (
        <AlertBanner
          severity="critical"
          title={banner.title}
          description={`Patient ${banner.patientId} · ${banner.detail.toLowerCase()} pattern, ${banner.time}`}
          onAcknowledge={() => setDismissed((ids) => [...ids, banner.id])}
        />
      ) : null}
      <VitalsRow paused={paused} />
      <div className="flex flex-col gap-6 xl:flex-row">
        <EcgChartCard paused={paused} className="min-w-0 flex-1" />
        <RecentAlertsPanel className="xl:w-[360px] xl:shrink-0" />
      </div>
      <div className="flex flex-col gap-6 xl:flex-row">
        <HeartRateTrendCard className="min-w-0 flex-1" />
        <ConnectedDevicesPanel className="xl:w-[360px] xl:shrink-0" />
      </div>
    </>
  );
}
