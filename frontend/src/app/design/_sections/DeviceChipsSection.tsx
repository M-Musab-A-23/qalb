import { DeviceChip } from "@/components/ui/DeviceChip";
import { Section } from "./Section";

export function DeviceChipsSection() {
  return (
    <Section title="Device chips">
      <DeviceChip name="ESP32-01" connected />
      <DeviceChip name="ESP32-01" connected={false} />
    </Section>
  );
}
