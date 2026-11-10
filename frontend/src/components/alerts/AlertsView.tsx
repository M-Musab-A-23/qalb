"use client";

import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { FilterTabs, type FilterOption } from "@/components/ui/FilterTabs";
import { VitalsTile } from "@/components/ui/VitalsTile";
import { downloadText, toCsv } from "@/lib/csv";
import { getAlertStats, getAlerts } from "@/lib/data";
import { AlertsTable } from "./AlertsTable";

type Filter = "all" | "open" | "acknowledged";

const options: FilterOption<Filter>[] = [
  { id: "all", label: "All alerts" },
  { id: "open", label: "Open" },
  { id: "acknowledged", label: "Acknowledged" },
];

export function AlertsView() {
  const [alerts, setAlerts] = useState(getAlerts);
  const [filter, setFilter] = useState<Filter>("all");
  const stats = getAlertStats(alerts);

  function acknowledge(id: string) {
    setAlerts((list) =>
      list.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert,
      ),
    );
  }

  function acknowledgeAll() {
    setAlerts((list) => list.map((alert) => ({ ...alert, acknowledged: true })));
  }

  function exportCsv() {
    const csv = toCsv(
      ["Time", "Severity", "Patient", "Device", "Details", "Acknowledged"],
      alerts.map((alert) => [
        alert.time,
        alert.severity,
        alert.patientId,
        alert.deviceId,
        alert.detail,
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
