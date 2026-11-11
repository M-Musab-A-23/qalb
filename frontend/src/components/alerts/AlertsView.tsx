"use client";

import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { FilterTabs, type FilterOption } from "@/components/ui/FilterTabs";
import { VitalsTile } from "@/components/ui/VitalsTile";
import { downloadText, toCsv } from "@/lib/csv";
import {
  acknowledgeAllLiveAlerts,
  acknowledgeLiveAlert,
  getAlertStats,
  getAlerts,
  SOURCE_LABELS,
} from "@/lib/data";
import { useLiveAlerts } from "@/lib/hooks/useAlerts";
import { AlertsTable } from "./AlertsTable";

type Filter = "all" | "open" | "acknowledged";

const options: FilterOption<Filter>[] = [
  { id: "all", label: "All alerts" },
  { id: "open", label: "Open" },
  { id: "acknowledged", label: "Acknowledged" },
];

export function AlertsView() {
  const [seeded, setSeeded] = useState(getAlerts);
  const live = useLiveAlerts();
  const [filter, setFilter] = useState<Filter>("all");
  // Alerts raised by the live feed this session come first.
  const alerts = [...live, ...seeded];
  const stats = getAlertStats(alerts);

  function acknowledge(id: string) {
    if (live.some((alert) => alert.id === id)) {
      acknowledgeLiveAlert(id);
      return;
    }
    setSeeded((list) =>
      list.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert,
      ),
    );
  }

  function acknowledgeAll() {
    acknowledgeAllLiveAlerts();
    setSeeded((list) => list.map((alert) => ({ ...alert, acknowledged: true })));
  }

  function exportCsv() {
    const csv = toCsv(
      ["Time", "Severity", "Patient", "Device", "Details", "Source", "Acknowledged"],
      alerts.map((alert) => [
        alert.time,
        alert.severity,
        alert.patientId,
        alert.deviceId,
        alert.detail,
        alert.source ? SOURCE_LABELS[alert.source] : "Seeded",
        alert.acknowledged ? "yes" : "no",
      ]),
    );
    downloadText("qalb-alerts.csv", csv);
  }

  const visible = alerts.filter((alert) =>
    filter === "all"
      ? true
      : filter === "open"
        ? !alert.acknowledged
        : alert.acknowledged,
  );

  return (
    <>
      <TopBar
        title="Alerts"
        subtitle="Arrhythmia and rhythm alerts from every connected patient"
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv}>
              Export CSV
            </Button>
            <Button onClick={acknowledgeAll}>Acknowledge all</Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <VitalsTile
          glass
          label="Open critical alerts"
          value={stats.openCritical}
          status={stats.openCritical > 0 ? "critical" : "normal"}
          statusLabel={stats.openCritical > 0 ? "Needs action" : "All handled"}
        />
        <VitalsTile
          glass
          label="Open warnings"
          value={stats.openWarnings}
          status={stats.openWarnings > 0 ? "warning" : "normal"}
          statusLabel={stats.openWarnings > 0 ? "Review soon" : "All handled"}
        />
        <VitalsTile
          glass
          label="Acknowledged today"
          value={stats.acknowledgedToday}
          status="normal"
          statusLabel="All handled"
        />
      </div>
      <FilterTabs
        label="Filter alerts"
        options={options}
        value={filter}
        onChange={setFilter}
      />
      <AlertsTable alerts={visible} onAcknowledge={acknowledge} />
    </>
  );
}
