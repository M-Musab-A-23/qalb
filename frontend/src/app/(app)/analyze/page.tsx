import type { Metadata } from "next";
import { AnalyzeView } from "@/components/analyze/AnalyzeView";

export const metadata: Metadata = { title: "Analyze ECG · QALB" };

export default function AnalyzePage() {
  return <AnalyzeView />;
}
