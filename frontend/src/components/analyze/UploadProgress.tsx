/** Progress bar for the upload, then a busy bar while the model runs. */
export function UploadProgress({
  phase,
  progress,
}: {
  phase: "uploading" | "analysing";
  /** Fraction from 0 to 1, used while uploading. */
  progress: number;
}) {
  const percent = Math.round(progress * 100);
  const uploading = phase === "uploading";

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm leading-5 font-medium text-[var(--color-text-primary)]">
        <span>{uploading ? "Uploading file" : "Analysing the recording"}</span>
        {uploading ? (
          <span className="font-mono text-[13px] text-[var(--color-text-secondary)]">
            {percent}%
          </span>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label={uploading ? "Upload progress" : "Analysis in progress"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={uploading ? percent : undefined}
        className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-raised)]"
      >
        <div
          className={
            uploading
              ? "h-full rounded-full bg-[var(--color-brand-fill)] transition-[width] duration-150"
              : "h-full w-1/3 animate-pulse rounded-full bg-[var(--color-brand-fill)]"
          }
          style={uploading ? { width: `${percent}%` } : undefined}
        />
      </div>
    </div>
  );
}
