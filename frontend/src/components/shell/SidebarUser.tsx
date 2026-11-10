import { DemoBadge } from "./DemoBadge";

export function SidebarUser({
  name,
  role,
  initials: initialsOverride,
  demo = false,
}: {
  name: string;
  role: string;
  /** Overrides the initials derived from the name. */
  initials?: string;
  /** Shows the Demo badge next to the role. */
  demo?: boolean;
}) {
  const initials =
    initialsOverride ??
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="glass-strong flex items-center gap-3 rounded-[var(--radius-md)] p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-tint)] font-mono text-[13px] leading-4 font-medium text-[var(--color-brand-text)]">
        {initials}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm leading-5 font-medium text-[var(--color-text-primary)]">
          {name}
        </span>
        <span className="flex items-center gap-2 text-xs leading-4 tracking-[0.2px] text-[var(--color-text-secondary)]">
          <span className="truncate">{role}</span>
          {demo ? <DemoBadge /> : null}
        </span>
      </span>
    </div>
  );
}
