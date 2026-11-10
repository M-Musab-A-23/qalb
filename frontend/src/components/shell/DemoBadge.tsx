/** Small marker shown in the shell while a demo account is active. */
export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-[var(--radius-full)] bg-[var(--color-brand-tint)] px-2 py-[2px] text-[10px] leading-4 font-semibold tracking-[0.08em] text-[var(--color-brand-text)] uppercase">
      Demo
    </span>
  );
}
