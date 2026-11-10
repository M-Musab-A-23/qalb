"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { TopBar } from "@/components/shell/TopBar";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { HistoryDetail } from "./HistoryDetail";
import { HistoryTable } from "./HistoryTable";
import { useHistory } from "./useHistory";

const linkButton =
  "inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-fill)] px-[var(--space-5)] py-[var(--space-3)] text-sm leading-5 font-medium whitespace-nowrap text-[var(--color-text-on-brand)] transition-colors hover:bg-[var(--color-brand-fill-hover)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

export function HistoryView() {
  const { user } = useAuth();
  const isClinician = user?.role === "clinician";
  const { state, remove, clearAll } = useHistory(user?.id ?? "", isClinician);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (state.status === "loading") {
    return (
      <>
        <TopBar title="History" subtitle="Your saved analyses" />
        <p role="status" className="text-sm text-[var(--color-text-secondary)]">
          Loading your history
        </p>
      </>
    );
  }

  if (state.status === "error") {
    return (
      <>
        <TopBar title="History" subtitle="Your saved analyses" />
        <AlertBanner severity="critical" title="History unavailable" description={state.message} />
      </>
    );
  }

  const { items, demoItems } = state;
  const opened = openId
    ? [...items, ...demoItems].find((item) => item.id === openId)
    : undefined;

  if (opened) {
    const own = items.some((item) => item.id === opened.id);
    return (
      <>
        <TopBar title="History" subtitle="A saved analysis" />
        <HistoryDetail
          analysis={opened}
          onBack={() => setOpenId(null)}
          onDelete={
            own
              ? () => {
                  setOpenId(null);
                  void remove(opened.id);
                }
              : undefined
          }
        />
      </>
    );
  }

  return (
    <>
      <TopBar
        title="History"
        subtitle="Analyses you have run, newest first"
        actions={
          <>
            {items.length > 0 ? (
              <Button variant="secondary" onClick={() => setConfirmClear(true)}>
                Clear all
              </Button>
            ) : null}
            <Link href="/analyze" className={linkButton}>
              Analyze ECG
            </Link>
          </>
        }
      />
      {confirmClear ? (
        <GlassCard strong className="flex flex-wrap items-center gap-4">
          <p className="flex-1 text-sm leading-5 text-[var(--color-text-primary)]">
            Delete all {items.length} saved {items.length === 1 ? "analysis" : "analyses"}? This
            cannot be undone.
          </p>
          <Button
            size="s"
            onClick={() => {
              setConfirmClear(false);
              void clearAll();
            }}
          >
            Delete all
          </Button>
          <Button variant="ghost" size="s" onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
        </GlassCard>
      ) : null}

      {items.length === 0 ? (
        <GlassCard className="flex flex-col items-start gap-3">
          <h2 className="text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
            No analyses yet
          </h2>
          <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
            Every file you analyse is saved here so you can open it again later.
          </p>
          <Link href="/analyze" className={linkButton}>
            Analyze your first ECG
          </Link>
        </GlassCard>
      ) : (
        <HistoryTable
          items={items}
          onOpen={setOpenId}
          onDelete={remove}
          emptyText="No analyses saved."
        />
      )}

      {isClinician ? (
        <section className="flex flex-col gap-3" aria-labelledby="demo-patient-analyses">
          <div className="flex flex-col gap-1">
            <h2
              id="demo-patient-analyses"
              className="text-xl leading-7 font-semibold text-[var(--color-text-primary)]"
            >
              Demo patient analyses
            </h2>
            <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
              Seeded analyses from the demo patient account. They are read-only here.
            </p>
          </div>
          <HistoryTable
            items={demoItems}
            onOpen={setOpenId}
            emptyText="The demo patient has no saved analyses."
          />
        </section>
      ) : null}
    </>
  );
}
