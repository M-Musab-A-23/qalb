import type { ReactNode } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

export function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <GlassCard lift className="flex flex-1 flex-col gap-4 self-stretch p-8">
      <span className="flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-tint)] text-[var(--color-brand-text)]">
        {icon}
      </span>
      <h3 className="text-2xl leading-8 font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
        {title}
      </h3>
      <p className="text-base leading-6 text-[var(--color-text-secondary)]">
        {body}
      </p>
    </GlassCard>
  );
}
