import { GlassCard } from "@/components/ui/GlassCard";

const steps = [
  "Choose a file or a sample and check the sampling rate.",
  "The trained model finds each beat and labels it N, S, V, F or Q.",
  "You get the trace, rhythm summary, alerts and a beat table. The analysis is saved to your history.",
];

/** What the page shows before anything has been analysed. */
export function EmptyResults() {
  return (
    <GlassCard className="flex flex-col gap-3">
      <h2 className="text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
        No analysis yet
      </h2>
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-5 text-[var(--color-text-secondary)]">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </GlassCard>
  );
}
