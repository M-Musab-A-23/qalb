"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { countsLine, formatDateTime } from "@/lib/analysis/summary";
import { cn } from "@/lib/cn";
import { listAnalyses, type StoredAnalysis } from "@/lib/data";

const SHOWN = 3;

const textLink =
  "text-sm leading-5 font-medium text-[var(--color-brand-text)] underline underline-offset-2";

/** The signed-in user's latest analyses, with a link to the full history. */
export function RecentAnalysesCard({
  userId,
  className,
}: {
  userId: string;
  className?: string;
}) {
  const [items, setItems] = useState<StoredAnalysis[] | null>(null);

  useEffect(() => {
    let active = true;
    void listAnalyses(userId).then((list) => {
      if (active) setItems(list.slice(0, SHOWN));
    });
    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <GlassCard lift className={cn("flex flex-col gap-3 overflow-hidden", className)}>
      <div className="flex items-center gap-3">
        <h2 className="flex-1 text-xl leading-7 font-semibold whitespace-nowrap text-[var(--color-text-primary)]">
          Recent analyses
        </h2>
        <Link href="/history" className={textLink}>
          View all
        </Link>
      </div>
      {items === null ? (
        <p role="status" className="text-sm text-[var(--color-text-secondary)]">
          Loading
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
            You have not analysed an ECG yet.
          </p>
          <Link href="/analyze" className={textLink}>
            Analyze your first ECG
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => {
            const alerts = item.result.alerts.length;
            const high = item.result.alerts.some((alert) => alert.severity === "high");
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] py-[var(--space-3)] last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-[2px] font-medium">
                  <p className="truncate text-sm leading-5 text-[var(--color-text-primary)]">
                    {item.fileName}
                  </p>
                  <p className="truncate text-xs leading-4 tracking-[0.2px] text-[var(--color-text-secondary)]">
                    {formatDateTime(item.createdAt)} · {countsLine(item.result)}
                  </p>
                </div>
                <StatusBadge
                  status={alerts === 0 ? "normal" : high ? "critical" : "warning"}
                  label={alerts === 0 ? "No alerts" : `${alerts} ${alerts === 1 ? "alert" : "alerts"}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
