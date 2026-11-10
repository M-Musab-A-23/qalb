"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DemoBadge } from "@/components/shell/DemoBadge";
import { TopBar } from "@/components/shell/TopBar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { GlassCard } from "@/components/ui/GlassCard";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-[var(--color-border-subtle)] py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <p className="text-sm leading-5 font-medium text-[var(--color-text-primary)]">
          {label}
        </p>
        <p className="text-xs leading-4 tracking-[0.2px] text-[var(--color-text-secondary)]">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

const roleLabels = { clinician: "Clinician", patient: "Patient" } as const;

export function SettingsView() {
  const { user } = useAuth();

  return (
    <>
      <TopBar title="Settings" subtitle="Account, appearance and data source" />
      {user ? (
        <GlassCard className="flex max-w-[720px] flex-col gap-2">
          <h2 className="text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
            Account
          </h2>
          <SettingRow label="Name" description={user.email}>
            <span className="text-sm leading-5 font-medium text-[var(--color-text-primary)]">
              {user.name}
            </span>
          </SettingRow>
          <SettingRow
            label="Role"
            description={
              user.role === "clinician"
                ? "Sees every patient, alert and device"
                : "Sees only their own device and analyses"
            }
          >
            <span className="flex items-center gap-2 text-sm leading-5 font-medium text-[var(--color-text-primary)]">
              {roleLabels[user.role]}
              {user.demo ? <DemoBadge /> : null}
            </span>
          </SettingRow>
        </GlassCard>
      ) : null}
      <GlassCard className="flex max-w-[720px] flex-col gap-2">
        <h2 className="text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
          Appearance
        </h2>
        <SettingRow
          label="Theme"
          description="Switch between the light and dark interface"
        >
          <ThemeToggle />
        </SettingRow>
      </GlassCard>
      <GlassCard className="flex max-w-[720px] flex-col gap-2">
        <h2 className="text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
          Data source
        </h2>
        <SettingRow
          label="Simulated data"
          description="Patients, devices, alerts and ECG are generated in the browser"
        >
          <span className="font-mono text-[13px] leading-4 font-medium text-[var(--color-signal-line)]">
            ON
          </span>
        </SettingRow>
      </GlassCard>
    </>
  );
}
