"use client";

import { cn } from "@/lib/cn";

export type FilterOption<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-3">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-4 py-2 text-xs leading-4 font-medium tracking-[0.2px] text-[var(--color-text-primary)] transition-colors outline-none hover:bg-[var(--color-bg-raised)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]",
              active && "glass-strong",
            )}
          >
            {option.label}
            {option.count !== undefined ? ` ${option.count}` : ""}
          </button>
        );
      })}
    </div>
  );
}
