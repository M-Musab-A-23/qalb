export type Status = "normal" | "warning" | "critical";

/** Colour classes for each status, built from the status tokens. */
export const statusClasses: Record<
  Status,
  { fg: string; bg: string; dot: string; border: string }
> = {
  normal: {
    fg: "text-[var(--color-status-ok-fg)]",
    bg: "bg-[var(--color-status-ok-bg)]",
    dot: "bg-[var(--color-status-ok-fg)]",
    border: "border border-[var(--color-border-subtle)]",
  },
  warning: {
    fg: "text-[var(--color-status-warn-fg)]",
    bg: "bg-[var(--color-status-warn-bg)]",
    dot: "bg-[var(--color-status-warn-fg)]",
    border: "border-[1.5px] border-[var(--color-status-warn-fg)]",
  },
  critical: {
    fg: "text-[var(--color-status-crit-fg)]",
    bg: "bg-[var(--color-status-crit-bg)]",
    dot: "bg-[var(--color-status-crit-fg)]",
    border: "border-[1.5px] border-[var(--color-status-crit-fg)]",
  },
};

export const statusLabels: Record<Status, string> = {
  normal: "Normal rhythm",
  warning: "Irregular rhythm",
  critical: "Arrhythmia detected",
};
