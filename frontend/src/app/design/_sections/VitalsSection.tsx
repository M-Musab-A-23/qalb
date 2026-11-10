import { VitalsTile } from "@/components/ui/VitalsTile";
import { Section } from "./Section";

export function VitalsSection() {
  return (
    <Section title="Vitals tiles">
      <VitalsTile label="Heart rate" value={72} unit="BPM" status="normal" />
      <VitalsTile label="Heart rate" value={118} unit="BPM" status="warning" />
      <VitalsTile label="Heart rate" value={156} unit="BPM" status="critical" />
    </Section>
  );
}
