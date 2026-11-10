import { GlassCard } from "@/components/ui/GlassCard";

export function StepCard({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <GlassCard className="flex flex-1 flex-col gap-3 self-stretch">
      <span className="flex size-9 items-center justify-center rounded-full bg-[var(--color-brand-tint)] font-mono text-[13px] leading-4 font-medium text-[var(--color-brand-text)]">
        {number}
      </span>
      <h3 className="text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
        {title}
      </h3>
      <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
        {body}
      </p>
    </GlassCard>
  );
}
