"use client";

import { useRef, useState, type DragEvent } from "react";
import { UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/** Drag-and-drop area with a file picker for CSV, TXT or a WFDB .dat and .hea pair. */
export function Dropzone({
  onFiles,
  disabled = false,
  selectedLabel,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  /** Name of the file or files currently chosen. */
  selectedLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    onFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "glass-strong flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border-[1.5px] border-dashed px-6 py-8 text-center transition-colors",
        dragging
          ? "border-[var(--color-focus-ring)] bg-[var(--color-brand-tint)]"
          : "border-[var(--color-border-strong)]",
      )}
    >
      <UploadIcon size={32} className="text-[var(--color-brand-text)]" />
      <div className="flex flex-col gap-1">
        <p className="text-base leading-6 font-medium text-[var(--color-text-primary)]">
          {selectedLabel ?? "Drop an ECG file here"}
        </p>
        <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
          CSV or TXT, or a WFDB record: select the .dat and .hea files together
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".csv,.txt,.dat,.hea"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose ECG file"
        disabled={disabled}
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          // Allow choosing the same file again after an error.
          event.target.value = "";
        }}
      />
      <Button
        variant="secondary"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Choose file
      </Button>
    </div>
  );
}
