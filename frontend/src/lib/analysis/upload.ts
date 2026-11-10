export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MIN_SAMPLING_RATE = 50;
export const MAX_SAMPLING_RATE = 5000;
export const DEFAULT_SAMPLING_RATE = 360;

/** What the browser needs to know about a file; lets tests use plain objects. */
export type UploadFile = { name: string; size: number };

export type UploadSelection<T extends UploadFile = File> =
  | { kind: "text"; file: T }
  | { kind: "wfdb"; dat: T; hea: T };

export type SelectionResult<T extends UploadFile = File> =
  | { ok: true; selection: UploadSelection<T> }
  | { ok: false; error: string };

const supportedHelp = "Use a CSV or TXT file, or a WFDB .dat file together with its .hea header.";

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function baseName(name: string): string {
  const dot = name.lastIndexOf(".");
  return (dot === -1 ? name : name.slice(0, dot)).toLowerCase();
}

function sizeProblem(file: UploadFile): string | null {
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name} is larger than the 25 MB limit.`;
  }
  return null;
}

/** Decides what kind of upload a set of chosen files is, or why it cannot be one. */
export function classifySelection<T extends UploadFile>(files: T[]): SelectionResult<T> {
  if (files.length === 0) return { ok: false, error: "Choose a file to analyse." };

  const text = files.filter((file) => ["csv", "txt"].includes(extensionOf(file.name)));
  const dat = files.filter((file) => extensionOf(file.name) === "dat");
  const hea = files.filter((file) => extensionOf(file.name) === "hea");
  const unknown = files.filter(
    (file) => !["csv", "txt", "dat", "hea"].includes(extensionOf(file.name)),
  );

  if (unknown.length > 0) {
    return { ok: false, error: `${unknown[0].name} is not a supported file. ${supportedHelp}` };
  }

  if (text.length > 0) {
    if (files.length > 1) {
      return { ok: false, error: `Choose one CSV or TXT file on its own. ${supportedHelp}` };
    }
    const problem = sizeProblem(text[0]);
    return problem
      ? { ok: false, error: problem }
      : { ok: true, selection: { kind: "text", file: text[0] } };
  }

  if (dat.length === 0) {
    return { ok: false, error: "A WFDB record needs its .dat file as well as the .hea header." };
  }
  if (hea.length === 0) {
    return { ok: false, error: "A WFDB record needs its .hea header as well as the .dat file." };
  }
  if (dat.length > 1 || hea.length > 1) {
    return { ok: false, error: "Choose one WFDB record at a time: one .dat and one .hea." };
  }
  if (baseName(dat[0].name) !== baseName(hea[0].name)) {
    return {
      ok: false,
      error: "The .dat and .hea files must share a name, for example 100.dat and 100.hea.",
    };
  }
  const problem = sizeProblem(dat[0]) ?? sizeProblem(hea[0]);
  return problem
    ? { ok: false, error: problem }
    : { ok: true, selection: { kind: "wfdb", dat: dat[0], hea: hea[0] } };
}

export function validateSamplingRate(
  raw: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Enter the sampling rate in Hz." };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false, error: "The sampling rate must be a number." };
  if (value < MIN_SAMPLING_RATE || value > MAX_SAMPLING_RATE) {
    return {
      ok: false,
      error: `The sampling rate must be between ${MIN_SAMPLING_RATE} and ${MAX_SAMPLING_RATE} Hz.`,
    };
  }
  return { ok: true, value };
}

/** The name shown for a selection, such as "100.dat + 100.hea". */
export function selectionLabel(selection: UploadSelection<UploadFile>): string {
  return selection.kind === "text"
    ? selection.file.name
    : `${selection.dat.name} + ${selection.hea.name}`;
}
