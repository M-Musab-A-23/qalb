import normalFixture from "./fixtures/sample_normal_100.json";
import ventricularFixture from "./fixtures/sample_ventricular_233.json";
import { parseAnalysisResult } from "./parse";
import type { AnalysisResult } from "./types";

export type SampleId = "normal" | "ventricular";

export type Sample = {
  id: SampleId;
  label: string;
  description: string;
  /** File name under /samples. */
  file: string;
  url: string;
  /** Result the model produced for this file, kept for the offline demo. */
  fixture: unknown;
};

export const samples: Sample[] = [
  {
    id: "normal",
    label: "Normal rhythm",
    description: "30 s from MIT-BIH record 100, one column of samples",
    file: "sample_normal_100.csv",
    url: "/samples/sample_normal_100.csv",
    fixture: normalFixture,
  },
  {
    id: "ventricular",
    label: "Ventricular beats",
    description: "30 s from MIT-BIH record 233, time and value columns",
    file: "sample_ventricular_233.csv",
    url: "/samples/sample_ventricular_233.csv",
    fixture: ventricularFixture,
  },
];

export function findSample(id: SampleId): Sample {
  return samples.find((sample) => sample.id === id) ?? samples[0];
}

/** The stored model output for a sample, used when the service is offline. */
export function offlineDemoResult(id: SampleId): AnalysisResult {
  return parseAnalysisResult(findSample(id).fixture);
}
