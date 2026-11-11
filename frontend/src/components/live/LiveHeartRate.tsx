import { VitalsTile } from "@/components/ui/VitalsTile";
import { heartRateBand } from "@/lib/live/state";

/** Heart rate over the latest 10 second window, from the model's beat detection. */
export function LiveHeartRate({
  heartRate,
  className,
}: {
  heartRate: number | null;
  className?: string;
}) {
  const band = heartRateBand(heartRate);
  return (
    <VitalsTile
      glass
      label="Heart rate"
      value={heartRate === null ? "--" : Math.round(heartRate)}
      unit="BPM"
      status={band.status}
      statusLabel={band.label}
      className={className}
    />
  );
}
