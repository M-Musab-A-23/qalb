"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { FormError } from "@/components/auth/FormError";
import { ResultsView } from "@/components/results/ResultsView";
import { TopBar } from "@/components/shell/TopBar";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { selectionLabel } from "@/lib/analysis/upload";
import { Dropzone } from "./Dropzone";
import { EmptyResults } from "./EmptyResults";
import { SamplePicker } from "./SamplePicker";
import { ServiceDownNotice } from "./ServiceDownNotice";
import { UploadProgress } from "./UploadProgress";
import { useAnalyzeFlow } from "./useAnalyzeFlow";

export function AnalyzeView() {
  const { user } = useAuth();
  // The page sits behind AuthGate, so a user is always present here.
  const flow = useAnalyzeFlow(user?.id ?? "");
  const { phase, busy } = flow;

  return (
    <>
      <TopBar
        title="Analyze ECG"
        subtitle="Upload a recording and the trained model labels every beat"
      />
      <GlassCard className="flex max-w-[720px] flex-col gap-5">
        <Dropzone
          onFiles={flow.chooseFiles}
          disabled={busy}
          selectedLabel={flow.selection ? selectionLabel(flow.selection) : undefined}
        />
        <FormError message={flow.selectionError} />
        <div className="flex flex-wrap items-start gap-4">
          <Input
            label="Sampling rate (Hz)"
            name="fs"
            type="number"
            inputMode="decimal"
            min={50}
            max={5000}
            value={flow.rate}
            onChange={(event) => flow.setRate(event.target.value)}
            helper="Used for files without a time column"
            error={flow.rateError}
            disabled={busy}
            className="w-full sm:w-[220px]"
          />
          <Button className="sm:mt-[26px]" disabled={busy} onClick={flow.analyse}>
            Analyze ECG
          </Button>
        </div>
        <SamplePicker onPick={(id) => void flow.pickSample(id)} disabled={busy} />
        {phase.kind === "uploading" ? (
          <UploadProgress phase="uploading" progress={phase.progress} />
        ) : null}
        {phase.kind === "analysing" ? (
          <UploadProgress phase="analysing" progress={1} />
        ) : null}
      </GlassCard>

      {phase.kind === "error" ? (
        phase.serviceDown ? (
          <ServiceDownNotice message={phase.message} onShowOffline={() => void flow.showOffline()} />
        ) : (
          <AlertBanner severity="critical" title="This file could not be analysed" description={phase.message} />
        )
      ) : null}

      {phase.kind === "done" ? (
        <>
          {phase.shown.offline ? (
            <AlertBanner
              severity="warning"
              title="Offline demo result"
              description="This is stored example output for a sample recording. It is not an analysis of your file and it was not saved."
            />
          ) : phase.shown.saveError ? (
            <AlertBanner severity="warning" title="Not saved to history" description={phase.shown.saveError} />
          ) : (
            <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
              Saved to your history.{" "}
              <Link href="/history" className="font-medium text-[var(--color-brand-text)] underline underline-offset-2">
                Open history
              </Link>
            </p>
          )}
          <ResultsView
            fileName={phase.shown.fileName}
            result={phase.shown.result}
            signal={phase.shown.signal}
            meta={phase.shown.offline ? "offline demo" : "analysed just now"}
          />
        </>
      ) : null}

      {phase.kind === "idle" || phase.kind === "uploading" || phase.kind === "analysing" ? (
        <EmptyResults />
      ) : null}
    </>
  );
}
