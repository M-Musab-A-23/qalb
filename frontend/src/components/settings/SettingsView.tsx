import type { ReactNode } from "react";
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

export function SettingsView() {
  return (
    <>
      <TopBar title="Settings" subtitle="Appearance and data source" />
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
