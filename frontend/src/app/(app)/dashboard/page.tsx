import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata: Metadata = { title: "Live monitoring · QALB" };

export default function DashboardPage() {
  return <DashboardView />;
}
