"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { recordLabel } from "@/lib/live/config";
import { deriveStatus, type MonitorState } from "@/lib/live/state";
import type { FeedConnection } from "@/lib/live/types";

export type RosterRow = {
  patientId: string;
  deviceId: string;
  record: string;
  online: boolean;
  state: MonitorState;
  connection: FeedConnection | null;
};

function rowStatus(row: RosterRow) {
  if (!row.online) return { status: null, label: "Device offline" } as const;
  if (row.state.heartRate === null) {
    return { status: null, label: "Waiting for data" } as const;
  }
  const status = deriveStatus(row.state);
  return {
    status,
    label:
      status === "critical"
        ? "Arrhythmia detected"
        : status === "warning"
          ? "Irregular rhythm"
          : "Normal rhythm",
  } as const;
}

/** The clinician's patient list: latest heart rate and status for each patient, open any of them. */
export function PatientRoster({
  rows,
  activeId,
  onOpen,
  className,
}: {
  rows: RosterRow[];
  activeId: string | null;
  onOpen: (patientId: string) => void;
  className?: string;
}) {
  return (
    <GlassCard lift className={cn("flex min-w-0 flex-col gap-3", className)}>
      <h2 className="text-xl leading-7 font-semibold whitespace-nowrap text-[var(--color-text-primary)]">
        Patients
      </h2>
      <ul className="flex flex-col">
        {rows.map((row) => {
          const { status, label } = rowStatus(row);
          const active = row.patientId === activeId;
          return (
            <li key={row.patientId}>
              <button
                type="button"
                disabled={!row.online}
                aria-current={active ? "true" : undefined}
                onClick={() => onOpen(row.patientId)}
                className={cn(
                  "flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-md)] border-b border-[var(--color-border-subtle)] px-3 py-3 text-left transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)] enabled:hover:bg-[var(--color-bg-raised)] disabled:cursor-not-allowed disabled:opacity-60",
                  active && "glass-strong",
                )}
              >
                <span className="flex min-w-0 flex-1 basis-40 flex-col gap-[2px]">
                  <span className="font-mono text-sm leading-5 font-medium text-[var(--color-text-primary)]">
                    {row.patientId}
                  </span>
                  <span className="truncate text-xs leading-4 tracking-[0.2px] text-[var(--color-text-secondary)]">
                    {row.deviceId} · {recordLabel(row.record)}
                  </span>
                </span>
                <span className="font-mono text-sm leading-5 font-semibold text-[var(--color-text-primary)] tabular-nums">
                  {row.online && row.state.heartRate !== null
                    ? `${Math.round(row.state.heartRate)} BPM`
                    : "-- BPM"}
                </span>
                {status ? (
                  <StatusBadge status={status} label={label} />
                ) : (
                  <span className="text-xs leading-4 font-medium tracking-[0.2px] text-[var(--color-text-subtle)]">
                    {label}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
