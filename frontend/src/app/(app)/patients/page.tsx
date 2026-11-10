import type { Metadata } from "next";
import { PatientsView } from "@/components/patients/PatientsView";

export const metadata: Metadata = { title: "Patients · QALB" };

export default function PatientsPage() {
  return <PatientsView />;
}
