import { AlertBanner } from "@/components/ui/AlertBanner";
import { Section } from "./Section";

export function AlertsSection() {
  return (
    <Section title="Alert banners">
      <div className="flex w-full max-w-[680px] flex-col gap-4">
        <AlertBanner
          severity="warning"
          title="Irregular rhythm"
          description="Patient P-0042 · 3 premature beats in the last minute"
        />
        <AlertBanner
          severity="critical"
          title="Arrhythmia detected"
          description="Patient P-0042 · ventricular tachycardia pattern, 14:32:08"
        />
      </div>
    </Section>
  );
}
