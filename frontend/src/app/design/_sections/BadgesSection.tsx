import { StatusBadge } from "@/components/ui/StatusBadge";
import { Section } from "./Section";

export function BadgesSection() {
  return (
    <Section title="Status badges">
      <StatusBadge status="normal" />
      <StatusBadge status="warning" />
      <StatusBadge status="critical" />
    </Section>
  );
}
