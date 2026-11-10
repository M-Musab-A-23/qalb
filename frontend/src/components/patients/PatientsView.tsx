"use client";

import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { FilterTabs, type FilterOption } from "@/components/ui/FilterTabs";
import { getPatients } from "@/lib/data";
import type { Status } from "@/lib/status";
import { PatientsTable } from "./PatientsTable";

type Filter = "all" | Status;

export function PatientsView() {
  const patients = getPatients();
  const [filter, setFilter] = useState<Filter>("all");

  const count = (status: Status) =>
    patients.filter((patient) => patient.status === status).length;

  const options: FilterOption<Filter>[] = [
    { id: "all", label: "All", count: patients.length },
    { id: "critical", label: "Critical", count: count("critical") },
    { id: "warning", label: "Warning", count: count("warning") },
    { id: "normal", label: "Normal", count: count("normal") },
  ];

  const visible =
    filter === "all"
      ? patients
      : patients.filter((patient) => patient.status === filter);

  return (
    <>
      <TopBar
        title="Patients"
        subtitle={`${patients.length} simulated patients, each replaying a MIT-BIH record`}
        actions={<Button>Add patient</Button>}
      />
      <FilterTabs
        label="Filter patients by status"
        options={options}
        value={filter}
        onChange={setFilter}
      />
      <PatientsTable patients={visible} />
    </>
  );
}
