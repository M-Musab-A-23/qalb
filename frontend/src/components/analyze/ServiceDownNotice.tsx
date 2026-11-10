import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";

/** Shown when the ML service cannot be reached; offers a clearly labelled demo result. */
export function ServiceDownNotice({
  message,
  onShowOffline,
}: {
  message: string;
  onShowOffline: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <AlertBanner severity="critical" title="Analysis is unavailable" description={message} />
      <div className="glass-strong flex flex-col items-start gap-3 rounded-[var(--radius-lg)] p-[var(--space-4)]">
        <p className="text-sm leading-5 text-[var(--color-text-primary)]">
          You can still look around with an offline demo result. It is stored example
          output for a sample recording, not an analysis of your file.
        </p>
        <Button variant="secondary" size="s" onClick={onShowOffline}>
          Show offline demo result
        </Button>
      </div>
    </div>
  );
}
