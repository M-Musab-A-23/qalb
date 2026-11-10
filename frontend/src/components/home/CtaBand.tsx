import Link from "next/link";
import { cn } from "@/lib/cn";

const buttonBase =
  "inline-flex items-center justify-center rounded-[var(--radius-md)] px-6 py-3 text-sm leading-5 font-medium whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

export function CtaBand() {
  return (
    <section className="pt-12 pb-24">
      <div className="flex flex-col items-center gap-5 rounded-[var(--radius-xl)] border border-[var(--color-brand-fill)] bg-[var(--color-brand-tint)] px-6 py-16 text-center md:px-12 md:py-[72px]">
        <h2 className="text-4xl leading-tight font-semibold tracking-[-0.03em] text-[var(--color-text-primary)] md:text-[56px] md:leading-[62px]">
          See QALB in action
        </h2>
        <p className="max-w-[560px] text-lg leading-7 text-[var(--color-text-secondary)]">
          Open the live dashboard to watch simulated patients stream in and
          trigger an arrhythmia alert.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/dashboard"
            className={cn(
              buttonBase,
              "bg-[var(--color-brand-fill)] text-[var(--color-text-on-brand)] hover:bg-[var(--color-brand-fill-hover)]",
            )}
          >
            Open live dashboard
          </Link>
          <a
            href="https://github.com/M-Musab-A-23/qalb"
            className={cn(
              buttonBase,
              "border border-[var(--color-border-strong)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-raised)]",
            )}
          >
            View the code
          </a>
        </div>
      </div>
    </section>
  );
}
