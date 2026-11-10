"use client";

import { useEffect, useState } from "react";
import { ResultsView, type SignalState } from "@/components/results/ResultsView";
import { Button } from "@/components/ui/Button";
import { loadStoredSignal } from "@/lib/analysis/signal-source";
import { formatDateTime } from "@/lib/analysis/summary";
import type { StoredAnalysis } from "@/lib/data";

/** One saved analysis opened in full, with the same view as a fresh result. */
export function HistoryDetail({
  analysis,
  onBack,
  onDelete,
}: {
  analysis: StoredAnalysis;
  onBack: () => void;
  /** Omit for read-only analyses. */
  onDelete?: () => void;
}) {
  const [signal, setSignal] = useState<SignalState>(
    analysis.signal ?? (analysis.signalUrl ? "loading" : null),
  );
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let active = true;
    void loadStoredSignal(analysis).then((loaded) => {
      if (active) setSignal(loaded);
    });
    return () => {
      active = false;
    };
  }, [analysis]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="s" onClick={onBack}>
          Back to history
        </Button>
        {onDelete ? (
          confirming ? (
            <>
              <Button size="s" onClick={onDelete}>
                Confirm delete
              </Button>
              <Button variant="ghost" size="s" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="s" onClick={() => setConfirming(true)}>
              Delete
            </Button>
          )
        ) : null}
      </div>
      <ResultsView
        fileName={analysis.fileName}
        result={analysis.result}
        signal={signal}
        meta={`analysed ${formatDateTime(analysis.createdAt)}`}
      />
    </>
  );
}
