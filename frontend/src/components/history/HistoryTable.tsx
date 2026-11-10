"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  countsLine,
  formatDateTime,
  formatDuration,
} from "@/lib/analysis/summary";
import type { AnalysisResult } from "@/lib/analysis/types";
import type { StoredAnalysis } from "@/lib/data";

const columns =
  "grid grid-cols-[minmax(0,1.5fr)_170px_100px_minmax(0,1.1fr)_130px_190px] items-center gap-4";
const heading =
  "text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase";

function alertBadge(result: AnalysisResult) {
  const count = result.alerts.length;
  if (count === 0) return <StatusBadge status="normal" label="None" />;
  const high = result.alerts.some((alert) => alert.severity === "high");
  return (
    <StatusBadge
      status={high ? "critical" : "warning"}
      label={`${count} ${count === 1 ? "alert" : "alerts"}`}
    />
  );
}

export function HistoryTable({
  items,
  onOpen,
  onDelete,
  emptyText,
}: {
  items: StoredAnalysis[];
  onOpen: (id: string) => void;
  /** Omit to make the list read-only. */
  onDelete?: (id: string) => Promise<void>;
  emptyText: string;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <GlassCard flush className="overflow-x-auto">
      <div className="min-w-[960px]">
        <div className={`${columns} glass-strong rounded-none border-0 px-5 py-[14px]`}>
          <span className={heading}>File</span>
          <span className={heading}>Date</span>
          <span className={heading}>Duration</span>
          <span className={heading}>Beats</span>
          <span className={heading}>Alerts</span>
          <span className={`${heading} text-right`}>Action</span>
        </div>
        {items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--color-text-secondary)]">{emptyText}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`${columns} border-b border-[var(--color-border-subtle)] px-5 py-3 last:border-b-0`}
            >
              <span className="truncate text-sm leading-5 font-medium text-[var(--color-text-primary)]">
                {item.fileName}
              </span>
              <time
                dateTime={item.createdAt}
                className="font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)]"
              >
                {formatDateTime(item.createdAt)}
              </time>
              <span className="font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)]">
                {formatDuration(item.result.durationS)}
              </span>
              <span className="flex min-w-0 flex-col gap-[2px] font-medium">
                <span className="text-sm leading-5 text-[var(--color-text-primary)]">
                  {item.result.rhythm.nBeats} beats
                </span>
                <span className="truncate font-mono text-xs leading-4 text-[var(--color-text-secondary)]">
                  {countsLine(item.result)}
                </span>
              </span>
              <span>{alertBadge(item.result)}</span>
              <span className="flex items-center justify-end gap-2">
                {confirming === item.id && onDelete ? (
                  <>
                    <Button
                      size="s"
                      onClick={() => {
                        setConfirming(null);
                        void onDelete(item.id);
                      }}
                    >
                      Confirm
                    </Button>
                    <Button variant="ghost" size="s" onClick={() => setConfirming(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" size="s" onClick={() => onOpen(item.id)}>
                      Open
                    </Button>
                    {onDelete ? (
                      <Button variant="ghost" size="s" onClick={() => setConfirming(item.id)}>
                        Delete
                      </Button>
                    ) : null}
                  </>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}
