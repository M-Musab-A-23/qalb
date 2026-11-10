import Link from "next/link";
import { DeviceChip } from "@/components/ui/DeviceChip";
import { VitalsTile } from "@/components/ui/VitalsTile";
import { cn } from "@/lib/cn";
import { HeroHeart } from "./HeroHeart";

const stats = [
  { value: "< 1 s", label: "Alert latency" },
  { value: "250 Hz", label: "ECG sampling" },
  { value: "MQTT", label: "Secure messaging" },
];

const buttonBase =
  "inline-flex items-center justify-center rounded-[var(--radius-md)] px-6 py-3 text-sm leading-5 font-medium whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

export function HeroSection() {
  return (
    <section className="relative grid items-center gap-12 pt-16 pb-12 lg:grid-cols-[minmax(0,1fr)_560px] lg:pt-24 lg:pb-20">
      <div className="flex flex-col items-start gap-6">
        <p className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-brand-text)] uppercase">
          Remote cardiac monitoring
        </p>
        <h1 className="max-w-[600px] text-5xl leading-[1.05] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-6xl lg:text-[72px] lg:leading-[76px]">
          Hear your heart, from anywhere.
        </h1>
        <p className="max-w-[540px] text-lg leading-7 text-[var(--color-text-secondary)]">
          QALB streams a patient’s ECG from a connected device to the cloud,
          spots irregular rhythms at the edge, and shows them on a live
          dashboard within a second.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/dashboard"
            className={cn(
              buttonBase,
              "bg-[var(--color-brand-fill)] text-[var(--color-text-on-brand)] hover:bg-[var(--color-brand-fill-hover)]",
            )}
          >
            Open live dashboard
          </Link>
          <Link
            href="#how"
            className={cn(
              buttonBase,
              "border border-[var(--color-border-strong)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-raised)]",
            )}
          >
            How it works
          </Link>
        </div>
        <dl className="mt-2 flex flex-wrap gap-x-10 gap-y-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-[2px]">
              <dd className="order-1 font-mono text-[32px] leading-9 font-bold tracking-[-0.02em] whitespace-nowrap text-[var(--color-signal-line)]">
                {stat.value}
              </dd>
              <dt className="order-2 text-xs leading-4 font-medium tracking-[0.2px] text-[var(--color-text-secondary)]">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
      <div className="relative mx-auto aspect-square w-full max-w-[560px]">
        <HeroHeart className="size-full" />
        <DeviceChip
          name="ESP32-01"
          className="glass-strong absolute top-4 right-0 shadow-lg"
        />
        <VitalsTile
          glass
          label="Heart rate"
          value={72}
          unit="BPM"
          className="absolute bottom-6 left-0 w-[240px] max-sm:hidden"
        />
        <p className="absolute right-0 bottom-0 left-[30%] hidden text-xs leading-4 font-medium tracking-[0.2px] text-[var(--color-text-subtle)] lg:block">
          Placeholder: export the 3D heart from Spline and place it here
        </p>
      </div>
    </section>
  );
}
