"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeUpload } from "@/lib/analysis/client";
import { findSample, offlineDemoResult, type SampleId } from "@/lib/analysis/demo";
import { AnalyzeError } from "@/lib/analysis/errors";
import { fetchSampleSignal, readUploadSignal } from "@/lib/analysis/signal-source";
import type { AnalysisResult } from "@/lib/analysis/types";
import {
  DEFAULT_SAMPLING_RATE,
  classifySelection,
  selectionLabel,
  validateSamplingRate,
  type UploadSelection,
} from "@/lib/analysis/upload";
import { saveAnalysis, type StoredSignal } from "@/lib/data";

export type Shown = {
  fileName: string;
  result: AnalysisResult;
  signal: StoredSignal | null;
  /** True for the stored example output shown when the service is down. */
  offline: boolean;
  saved: boolean;
  saveError?: string;
};

export type Phase =
  | { kind: "idle" }
  | { kind: "uploading"; progress: number }
  | { kind: "analysing" }
  | { kind: "done"; shown: Shown }
  | { kind: "error"; message: string; serviceDown: boolean };

const FALLBACK_SAMPLE: SampleId = "ventricular";

/** Everything the Analyze page does: choose, validate, upload, analyse, save. */
export function useAnalyzeFlow(userId: string) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [selection, setSelection] = useState<UploadSelection | null>(null);
  const [selectionError, setSelectionError] = useState<string>();
  const [rate, setRate] = useState(String(DEFAULT_SAMPLING_RATE));
  const [rateError, setRateError] = useState<string>();
  const lastSample = useRef<SampleId | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const busy = phase.kind === "uploading" || phase.kind === "analysing";

  const chooseFiles = useCallback((files: File[]) => {
    const result = classifySelection(files);
    lastSample.current = null;
    setPhase({ kind: "idle" });
    if (result.ok) {
      setSelection(result.selection);
      setSelectionError(undefined);
    } else {
      setSelection(null);
      setSelectionError(result.error);
    }
  }, []);

  const run = useCallback(
    async (chosen: UploadSelection, fs: number) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setPhase({ kind: "uploading", progress: 0 });
      try {
        const [result, signal] = await Promise.all([
          analyzeUpload({
            selection: chosen,
            fs,
            signal: controller.signal,
            onProgress: (fraction) =>
              setPhase(
                fraction >= 1
                  ? { kind: "analysing" }
                  : { kind: "uploading", progress: fraction },
              ),
          }),
          readUploadSignal(chosen, fs),
        ]);
        const fileName = result.input.filename ?? selectionLabel(chosen);
        const shown: Shown = { fileName, result, signal, offline: false, saved: false };
        try {
          await saveAnalysis(userId, { fileName, result, signal });
          shown.saved = true;
        } catch (caught) {
          shown.saveError =
            caught instanceof Error ? caught.message : "This analysis could not be saved.";
        }
        setPhase({ kind: "done", shown });
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        if (caught instanceof AnalyzeError) {
          setPhase({ kind: "error", message: caught.message, serviceDown: caught.serviceDown });
        } else {
          setPhase({
            kind: "error",
            message: "Something went wrong while analysing the file.",
            serviceDown: false,
          });
        }
      }
    },
    [userId],
  );

  const analyse = useCallback(() => {
    if (!selection) {
      setSelectionError("Choose a file to analyse.");
      return;
    }
    const checked = validateSamplingRate(rate);
    if (!checked.ok) {
      setRateError(checked.error);
      return;
    }
    setRateError(undefined);
    void run(selection, checked.value);
  }, [selection, rate, run]);

  const pickSample = useCallback(
    async (id: SampleId) => {
      const sample = findSample(id);
      setSelectionError(undefined);
      setPhase({ kind: "uploading", progress: 0 });
      try {
        const response = await fetch(sample.url);
        if (!response.ok) throw new Error("missing");
        const file = new File([await response.blob()], sample.file, { type: "text/csv" });
        const chosen: UploadSelection = { kind: "text", file };
        lastSample.current = id;
        setSelection(chosen);
        setRate(String(DEFAULT_SAMPLING_RATE));
        setRateError(undefined);
        await run(chosen, DEFAULT_SAMPLING_RATE);
      } catch {
        setPhase({
          kind: "error",
          message: `The sample ${sample.file} could not be loaded.`,
          serviceDown: false,
        });
      }
    },
    [run],
  );

  const showOffline = useCallback(async () => {
    const id = lastSample.current ?? FALLBACK_SAMPLE;
    const sample = findSample(id);
    const signal = await fetchSampleSignal(sample.url);
    setPhase({
      kind: "done",
      shown: {
        fileName: sample.file,
        result: offlineDemoResult(id),
        signal,
        offline: true,
        saved: false,
      },
    });
  }, []);

  const reset = useCallback(() => {
    abort.current?.abort();
    lastSample.current = null;
    setSelection(null);
    setSelectionError(undefined);
    setRateError(undefined);
    setPhase({ kind: "idle" });
  }, []);

  return {
    phase,
    busy,
    selection,
    selectionError,
    rate,
    setRate,
    rateError,
    chooseFiles,
    analyse,
    pickSample,
    showOffline,
    reset,
  };
}
