import { InfoIcon } from "@/components/icons";
import { NOT_A_DIAGNOSIS } from "@/lib/analysis/types";
import { cn } from "@/lib/cn";

/** The notice that must stay visible wherever a result is shown. */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "glass-strong flex items-start gap-3 rounded-[var(--radius-lg)] p-[var(--space-4)]",
        className,
      )}
    >
      <InfoIcon className="mt-[2px] shrink-0 text-[var(--color-brand-text)]" />
      <p className="text-sm leading-5 text-[var(--color-text-primary)]">
        <span className="font-semibold">{NOT_A_DIAGNOSIS}</span> QALB is a research
        prototype. Results can be wrong, especially for supraventricular and fusion
        beats. Do not use them for medical decisions.
      </p>
    </div>
  );
}
