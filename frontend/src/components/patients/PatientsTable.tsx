import { GlassCard } from "@/components/ui/GlassCard";
import type { Patient } from "@/lib/data";
import { PatientRow, patientColumns } from "./PatientRow";

const headings = ["Patient", "Status", "Heart rate", "Last alert", "Device"];

export function PatientsTable({ patients }: { patients: Patient[] }) {
  return (
    <GlassCard flush className="overflow-x-auto">
      <div className="min-w-[1000px]">
        <div
          className={`${patientColumns} glass-strong rounded-none border-0 px-5 py-[14px]`}
        >
          {headings.map((heading) => (
            <span
              key={heading}
              className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase"
            >
              {heading}
            </span>
          ))}
          <span />
          <span />
        </div>
        {patients.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--color-text-secondary)]">
            No patients match this filter.
          </p>
        ) : (
          patients.map((patient) => (
            <PatientRow key={patient.id} patient={patient} />
          ))
        )}
      </div>
    </GlassCard>
  );
}
