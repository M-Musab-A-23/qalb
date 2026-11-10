import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";

/** Empty state for an account with no device paired. */
export function NoDeviceCard() {
  return (
    <GlassCard className="flex max-w-[720px] flex-col items-start gap-3">
      <h2 className="text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
        No device connected
      </h2>
      <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
        Live monitoring needs an ECG device paired to your account. You can still upload a
        recording and have the model analyse it.
      </p>
      <Link
        href="/analyze"
        className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-fill)] px-[var(--space-5)] py-[var(--space-3)] text-sm leading-5 font-medium text-[var(--color-text-on-brand)] transition-colors hover:bg-[var(--color-brand-fill-hover)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        Analyze ECG
      </Link>
    </GlassCard>
  );
}
