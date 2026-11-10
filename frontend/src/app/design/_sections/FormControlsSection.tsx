"use client";

import { useState } from "react";
import { AlertRow } from "@/components/ui/AlertRow";
import { Checkbox } from "@/components/ui/Checkbox";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { Section } from "./Section";

type Filter = "all" | "open" | "acknowledged";

export function FormControlsSection() {
  const [filter, setFilter] = useState<Filter>("all");
  return (
    <>
      <Section title="Checkbox">
        <Checkbox label="Keep me signed in" />
        <Checkbox label="Checked" defaultChecked />
      </Section>
      <Section title="Filter tabs">
        <FilterTabs
          label="Example filter"
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "All alerts" },
            { id: "open", label: "Open", count: 3 },
            { id: "acknowledged", label: "Acknowledged", count: 5 },
          ]}
        />
      </Section>
      <Section title="Alert rows">
        <div className="w-full max-w-[340px]">
          <AlertRow
            severity="critical"
            title="Arrhythmia detected"
            detail="P-0042 · ventricular tachycardia"
            time="14:32:08"
          />
          <AlertRow
            severity="warning"
            title="Irregular rhythm"
            detail="P-0042 · premature beats"
            time="14:30:51"
          />
          <AlertRow
            severity="normal"
            title="Back to normal rhythm"
            detail="P-0042 · sinus rhythm restored"
            time="14:21:17"
          />
        </div>
      </Section>
    </>
  );
}
