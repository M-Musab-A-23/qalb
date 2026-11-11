import type { Metadata } from "next";
import { LiveMonitorView } from "@/components/live/LiveMonitorView";

export const metadata: Metadata = { title: "Live monitoring · QALB" };

export default function DashboardPage() {
  return <LiveMonitorView />;
}
