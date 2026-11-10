export type ParsedSignal = {
  samples: number[];
  /** Samples per second. */
  fs: number;
  /** Where the rate came from: a time column, or the value the person entered. */
  rateFrom: "time-column" | "entered";
};

export class SignalParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignalParseError";
  }
}

const numberPattern = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

function splitRow(line: string): string[] {
  return line
    .trim()
    .split(/[,;\t]|\s+/)
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function isNumeric(cell: string): boolean {
  return numberPattern.test(cell);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Reads ECG samples from CSV, TSV or plain text for plotting.
 *
 * One column holds samples at `fs`. Two or more columns are read as time then
 * value; the rate comes from the time step, in seconds or milliseconds. This
 * mirrors the upload rules of the analysis service, which does the real
 * validation: this parser only has to be good enough to draw the trace.
 */
export function parseSignalText(text: string, fs: number): ParsedSignal {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) throw new SignalParseError("The file is empty.");

  let rows = lines.map(splitRow);
  // A first row that is not numeric is a header.
  if (!rows[0].every(isNumeric)) rows = rows.slice(1);
  if (rows.length === 0) throw new SignalParseError("The file has no data rows.");

  const width = rows[0].length;
  const bad = rows.findIndex(
    (row) => row.length !== width || !row.every(isNumeric),
  );
  if (bad !== -1) {
    throw new SignalParseError(
      `Row ${bad + 1} is not numeric or has a different number of columns.`,
    );
  }

  const numbers = rows.map((row) => row.map(Number));
  if (width === 1) {
    return { samples: numbers.map((row) => row[0]), fs, rateFrom: "entered" };
  }

  const times = numbers.map((row) => row[0]);
  const steps: number[] = [];
  for (let i = 1; i < times.length; i += 1) steps.push(times[i] - times[i - 1]);
  if (steps.length === 0 || steps.some((step) => step <= 0)) {
    throw new SignalParseError("The time column must increase on every row.");
  }
  // Steps above one are milliseconds: a second-based step of 1 s would be 1 Hz.
  const stepSeconds = median(steps) > 1 ? median(steps) / 1000 : median(steps);
  return {
    samples: numbers.map((row) => row[1]),
    fs: 1 / stepSeconds,
    rateFrom: "time-column",
  };
}
