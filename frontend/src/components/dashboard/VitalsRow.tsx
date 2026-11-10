"use client";

import { VitalsTile } from "@/components/ui/VitalsTile";
import { useLiveVitals } from "@/lib/hooks/useLiveVitals";

export function VitalsRow({ paused }: { paused: boolean }) {
  const vitals = useLiveVitals(paused);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <VitalsTile glass label="Heart rate" value={vitals.heartRate} unit="BPM" />
      <VitalsTile
        glass
        label="Blood oxygen (SpO2)"
        value={vitals.spo2}
        unit="%"
      />
      <VitalsTile
        glass
        label="Heart rate variability"
        value={vitals.hrv}
        unit="ms"
      />
      <VitalsTile
        glass
        label="R-R interval"
        value={vitals.rrInterval}
        unit="ms"
      />
    </div>
  );
}
