"use client";

import { PauseIcon, PlayIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { FilterTabs, type FilterOption } from "@/components/ui/FilterTabs";
import { Select } from "@/components/ui/Select";
import { replayRecords } from "@/lib/live/config";
import { LIVE_SPEEDS, type LiveSpeed } from "@/lib/live/types";

const speedOptions: FilterOption<string>[] = LIVE_SPEEDS.map((speed) => ({
  id: String(speed),
  label: `${speed}x`,
}));

export function ReplayControls({
  paused,
  onTogglePause,
  speed,
  onSpeed,
  record,
  onRecord,
  recordPicker,
}: {
  paused: boolean;
  onTogglePause: () => void;
  speed: LiveSpeed;
  onSpeed: (speed: LiveSpeed) => void;
  record: string;
  onRecord: (record: string) => void;
  /** The record picker is for clinicians; a patient sees only their own stream. */
  recordPicker: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <Button
        variant="secondary"
        onClick={onTogglePause}
        aria-label={paused ? "Resume the stream" : "Pause the stream"}
      >
        {paused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
        {paused ? "Play" : "Pause"}
      </Button>
      <div className="flex flex-col gap-[6px]">
        <span className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase">
          Speed
        </span>
        <FilterTabs
          label="Replay speed"
          options={speedOptions}
          value={String(speed)}
          onChange={(value) => onSpeed(Number(value) as LiveSpeed)}
        />
      </div>
      {recordPicker ? (
        <Select
          label="Record"
          value={record}
          onChange={(event) => onRecord(event.target.value)}
          options={replayRecords.map((r) => ({
            value: r.record,
            label: `${r.record}: ${r.label}`,
          }))}
          className="w-full max-w-[420px] min-w-[240px] flex-1"
        />
      ) : null}
    </div>
  );
}
