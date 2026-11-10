import { Button } from "@/components/ui/Button";
import { samples, type SampleId } from "@/lib/analysis/demo";

/** One button per bundled sample recording. */
export function SamplePicker({
  onPick,
  disabled = false,
}: {
  onPick: (id: SampleId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase">
        Use a sample
      </p>
      <div className="flex flex-wrap gap-3">
        {samples.map((sample) => (
          <Button
            key={sample.id}
            variant="secondary"
            size="s"
            disabled={disabled}
            title={sample.description}
            onClick={() => onPick(sample.id)}
          >
            {sample.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
