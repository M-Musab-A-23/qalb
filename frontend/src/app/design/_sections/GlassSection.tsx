import { GlassCard } from "@/components/ui/GlassCard";
import { Section } from "./Section";

export function GlassSection() {
  return (
    <Section title="Glass cards">
      <GlassCard className="w-[240px]">
        <p className="text-sm text-[var(--color-text-primary)]">Default glass</p>
      </GlassCard>
      <GlassCard strong className="w-[240px]">
        <p className="text-sm text-[var(--color-text-primary)]">Strong glass</p>
      </GlassCard>
      <GlassCard lift className="w-[240px]">
        <p className="text-sm text-[var(--color-text-primary)]">
          Hover to lift 5 px
        </p>
      </GlassCard>
    </Section>
  );
}
