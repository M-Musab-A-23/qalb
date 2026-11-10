import { EcgChartCard } from "@/components/dashboard/EcgChartCard";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { VitalsTile } from "@/components/ui/VitalsTile";
import { SectionHeader } from "./SectionHeader";

export function LiveMonitoringSection() {
  return (
    <section id="live" className="flex scroll-mt-8 flex-col gap-12 py-16 lg:py-24">
      <SectionHeader
        eyebrow="Live monitoring"
        title="Everything about the heart, on one screen"
        description="Real-time ECG, vitals and rhythm alerts for each connected patient. The values below are simulated."
      />
      <div className="flex flex-col gap-8 lg:flex-row">
        <EcgChartCard paused={false} className="min-w-0 lg:flex-[3]" />
        <div className="flex min-w-0 flex-col gap-6 lg:flex-[2]">
          <VitalsTile glass label="Heart rate" value={72} unit="BPM" />
          <VitalsTile glass label="Blood oxygen (SpO2)" value={98} unit="%" />
        </div>
      </div>
      <AlertBanner
        severity="critical"
        title="Arrhythmia detected"
        description="Patient P-0042 · ventricular tachycardia pattern, 14:32:08"
      />
    </section>
  );
}
