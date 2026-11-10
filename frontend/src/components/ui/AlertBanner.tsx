import type { ReactNode } from "react";
import { AlertIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { statusClasses } from "@/lib/status";
import { Button } from "./Button";

export type AlertBannerProps = {
  severity?: "warning" | "critical";
  title: string;
  description: ReactNode;
  onAcknowledge?: () => void;
  className?: string;
};

export function AlertBanner({
  severity = "warning",
  title,
  description,
  onAcknowledge,
  className,
}: AlertBannerProps) {
  const c = statusClasses[severity];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-4 rounded-[var(--radius-lg)] border p-[var(--space-4)]",
        c.bg,
        severity === "critical"
          ? "border-[var(--color-status-crit-fg)]"
          : "border-[var(--color-status-warn-fg)]",
        className,
      )}
    >
      <AlertIcon className={cn("shrink-0", c.fg)} />
      <div className="flex min-w-0 flex-1 flex-col gap-[2px] text-sm leading-5">
        <p className={cn("font-medium", c.fg)}>{title}</p>
        <p className="text-[var(--color-text-primary)]">{description}</p>
      </div>
      {onAcknowledge ? (
        <Button variant="secondary" size="s" onClick={onAcknowledge}>
          Acknowledge
        </Button>
      ) : null}
    </div>
  );
}
