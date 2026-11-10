import { Fragment } from "react";
import { ArrowIcon } from "@/components/icons";
import { SectionHeader } from "./SectionHeader";
import { StepCard } from "./StepCard";

const steps = [
  {
    title: "Device",
    body: "A simulated ESP32 replays real ECG recordings from the MIT-BIH database.",
  },
  {
    title: "Edge",
    body: "Filters the signal, finds each beat and raises local alerts, sending only features upstream.",
  },
  {
    title: "Broker",
    body: "MQTT carries readings over TCP/IP, protected with passwords and TLS.",
  },
  {
    title: "Cloud",
    body: "Stores readings, confirms alerts with a trained model and updates the dashboard live.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="flex scroll-mt-8 flex-col gap-12 py-16 lg:py-24">
      <SectionHeader
        eyebrow="How it works"
        title="From heartbeat to dashboard in four steps"
      />
      <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
        {steps.map((step, index) => (
          <Fragment key={step.title}>
            {index > 0 ? (
              <ArrowIcon
                aria-hidden
                className="shrink-0 self-center text-[var(--color-signal-line)] max-lg:rotate-90 lg:mt-24 lg:self-start"
              />
            ) : null}
            <StepCard
              number={String(index + 1).padStart(2, "0")}
              title={step.title}
              body={step.body}
            />
          </Fragment>
        ))}
      </div>
    </section>
  );
}
