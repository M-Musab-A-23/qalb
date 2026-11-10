"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatClock, formatPercent } from "@/lib/analysis/summary";
import type { Beat } from "@/lib/analysis/types";
import { ClassBadge } from "./ClassBadge";

const PAGE = 50;
const columns = "grid grid-cols-[110px_minmax(0,1fr)_110px] items-center gap-4";
const heading =
  "text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase";

export function BeatsTable({ beats }: { beats: Beat[] }) {
  const [shown, setShown] = useState(PAGE);
  const visible = beats.slice(0, shown);

  return (
    <GlassCard flush className="overflow-x-auto">
      <div className="min-w-[420px]">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 className="text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
            Beats
          </h2>
          <span className="text-xs leading-4 font-medium tracking-[0.2px] text-[var(--color-text-secondary)]">
            {beats.length === 0 ? "None detected" : `${Math.min(shown, beats.length)} of ${beats.length}`}
          </span>
        </div>
        <div className={`${columns} glass-strong rounded-none border-0 px-5 py-[14px]`}>
          <span className={heading}>Time</span>
          <span className={heading}>Class</span>
          <span className={`${heading} text-right`}>Confidence</span>
        </div>
        {beats.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--color-text-secondary)]">
            No beats were detected in this recording.
          </p>
        ) : (
          visible.map((beat, index) => (
            <div
              key={`${beat.sample}-${index}`}
              className={`${columns} border-b border-[var(--color-border-subtle)] px-5 py-2 last:border-b-0`}
            >
              <time className="font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)]">
                {formatClock(beat.timeS)}
              </time>
              <ClassBadge cls={beat.cls} showName />
              <span className="text-right font-mono text-[13px] leading-4 font-medium text-[var(--color-text-primary)] tabular-nums">
                {formatPercent(beat.confidence)}
              </span>
            </div>
          ))
        )}
        {shown < beats.length ? (
          <div className="flex justify-center px-5 py-4">
            <Button variant="secondary" size="s" onClick={() => setShown((n) => n + PAGE)}>
              Show more beats
            </Button>
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}
