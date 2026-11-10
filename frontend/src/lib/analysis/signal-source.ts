import type { StoredAnalysis, StoredSignal } from "@/lib/data";
import { parseSignalText } from "./signal";
import type { UploadSelection } from "./upload";

/**
 * Reads the trace of an uploaded text file for plotting. WFDB records are
 * binary, so they have no trace here and null is returned: the results show
 * the beat timeline instead. A text file the plot cannot read also gives null;
 * the analysis service does the real validation.
 */
export async function readUploadSignal(
  selection: UploadSelection,
  fs: number,
): Promise<StoredSignal | null> {
  if (selection.kind !== "text") return null;
  try {
    const parsed = parseSignalText(await selection.file.text(), fs);
    return { fs: parsed.fs, samples: parsed.samples };
  } catch {
    return null;
  }
}

/** Fetches and parses one of the bundled sample files. */
export async function fetchSampleSignal(url: string): Promise<StoredSignal | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const parsed = parseSignalText(await response.text(), 360);
    return { fs: parsed.fs, samples: parsed.samples };
  } catch {
    return null;
  }
}

/** The trace of a saved analysis: stored with it, fetched for a sample, or missing. */
export async function loadStoredSignal(
  analysis: Pick<StoredAnalysis, "signal" | "signalUrl">,
): Promise<StoredSignal | null> {
  if (analysis.signal) return analysis.signal;
  if (analysis.signalUrl) return fetchSampleSignal(analysis.signalUrl);
  return null;
}
