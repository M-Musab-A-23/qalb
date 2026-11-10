import { Input } from "@/components/ui/Input";
import { Section } from "./Section";

export function InputsSection() {
  return (
    <Section title="Inputs">
      <div className="w-[280px]">
        <Input
          label="Patient ID"
          placeholder="e.g. P-0042"
          helper="Shown on the dashboard header"
        />
      </div>
      <div className="w-[280px]">
        <Input
          label="Patient ID"
          defaultValue="P-0042"
          helper="Click into the field to see the focus ring"
        />
      </div>
      <div className="w-[280px]">
        <Input
          label="Patient ID"
          defaultValue="P-0042"
          error="Enter an ID in the format P-0000"
        />
      </div>
    </Section>
  );
}
