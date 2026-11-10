import { BoltIcon, DatabaseIcon, ShieldIcon } from "@/components/icons";
import { FeatureCard } from "./FeatureCard";
import { SectionHeader } from "./SectionHeader";

export function FeaturesSection() {
  return (
    <section className="flex flex-col gap-12 py-16 lg:py-24">
      <SectionHeader
        eyebrow="Why QALB"
        title="Built to react at the edge, not just record"
      />
      <div className="flex flex-col gap-6 lg:flex-row">
        <FeatureCard
          icon={<BoltIcon />}
          title="Edge-first alerts"
          body="The device side detects each beat and flags irregular rhythms locally, so alerts do not wait for the cloud."
        />
        <FeatureCard
          icon={<DatabaseIcon />}
          title="Real clinical data"
          body="Detection is trained and tested on labelled ECG recordings from the PhysioNet MIT-BIH Arrhythmia Database."
        />
        <FeatureCard
          icon={<ShieldIcon />}
          title="Secure by design"
          body="MQTT with authentication and TLS keeps readings private between the device, the broker and the cloud."
        />
      </div>
    </section>
  );
}
