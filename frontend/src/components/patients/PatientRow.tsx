import Link from "next/link";
import { ChevronIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Patient } from "@/lib/data";

export const patientColumns =
  "grid grid-cols-[240px_200px_140px_220px_160px_1fr_20px] items-center gap-4";

export function PatientRow({ patient }: { patient: Patient }) {
  return (
    <Link
      href="/dashboard"
      className={`${patientColumns} border-b border-[var(--color-border-subtle)] px-5 py-3 transition-colors outline-none last:border-b-0 hover:bg-[var(--color-glass-fill-strong)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]`}
    >
      <span className="flex min-w-0 flex-col gap-[2px] font-medium">
        <span className="text-sm leading-5 text-[var(--color-text-primary)]">
          {patient.id}
        </span>
        <span className="text-xs leading-4 tracking-[0.2px] text-[var(--color-text-secondary)]">
          {patient.record}
        </span>
      </span>
      <span>
        <StatusBadge status={patient.status} />
      </span>
      <span className="font-mono text-[13px] leading-4 font-medium text-[var(--color-text-primary)]">
        {patient.heartRate} BPM
      </span>
      <span className="flex min-w-0 flex-col gap-[2px] font-medium">
        <span className="text-sm leading-5 text-[var(--color-text-primary)]">
          {patient.lastAlertTime ?? "No alerts today"}
        </span>
        <span className="text-xs leading-4 tracking-[0.2px] text-[var(--color-text-secondary)]">
          {patient.lastAlertLabel ?? " "}
        </span>
      </span>
      <span className="font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)]">
        {patient.deviceId}
      </span>
      <span />
      <ChevronIcon size={20} className="text-[var(--color-text-secondary)]" />
    </Link>
  );
}
