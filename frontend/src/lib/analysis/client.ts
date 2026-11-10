import { AnalyzeError, isAnalyzeErrorBody } from "./errors";
import { parseAnalysisResult, ResultParseError } from "./parse";
import type { AnalysisResult } from "./types";
import type { UploadSelection } from "./upload";

/** Turns the response of /api/analyze into a result, or throws an AnalyzeError. */
export function interpretResponse(status: number, text: string): AnalysisResult {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new AnalyzeError("ml_error", "The server returned an unreadable answer.");
  }

  if (status >= 200 && status < 300) {
    try {
      return parseAnalysisResult(body);
    } catch (caught) {
      if (caught instanceof ResultParseError) {
        throw new AnalyzeError("ml_error", caught.message);
      }
      throw caught;
    }
  }

  if (isAnalyzeErrorBody(body)) throw new AnalyzeError(body.error, body.detail);
  throw new AnalyzeError("ml_error", `The server failed with status ${status}.`);
}

export type AnalyzeRequest = {
  selection: UploadSelection;
  /** Sampling rate in Hz, used for files without a time column. */
  fs: number;
  /** Called with a fraction from 0 to 1 while the file is being sent. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

/**
 * Sends the upload to /api/analyze. XMLHttpRequest is used because fetch
 * cannot report upload progress.
 */
export function analyzeUpload(request: AnalyzeRequest): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    if (request.selection.kind === "text") {
      form.append("file", request.selection.file, request.selection.file.name);
    } else {
      form.append("file", request.selection.dat, request.selection.dat.name);
      form.append("header", request.selection.hea, request.selection.hea.name);
    }
    form.append("fs", String(request.fs));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/analyze");
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) request.onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      request.onProgress?.(1);
      try {
        resolve(interpretResponse(xhr.status, xhr.responseText));
      } catch (caught) {
        reject(caught);
      }
    };
    xhr.onerror = () =>
      reject(new AnalyzeError("network", "Could not reach the server. Check your connection."));
    xhr.ontimeout = () =>
      reject(new AnalyzeError("ml_timeout", "The analysis took too long to answer."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));

    request.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}
