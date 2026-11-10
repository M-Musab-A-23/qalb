export function SidebarUser({
  name,
  role,
  initials: initialsOverride,
}: {
  name: string;
  role: string;
  /** Overrides the initials derived from the name. */
  initials?: string;
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
        <span className="truncate text-xs leading-4 tracking-[0.2px] text-[var(--color-text-secondary)]">
          {role}
        </span>
      </span>
    </div>
  );
}
