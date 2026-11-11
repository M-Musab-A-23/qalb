import { useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type SelectOption = { value: string; label: string };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  options: SelectOption[];
  id?: string;
};

/** A native select styled like Input, so it keeps keyboard and screen reader behaviour. */
export function Select({ label, options, id, className, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cn("flex min-w-0 flex-col gap-[6px]", className)}>
      <label
        htmlFor={selectId}
        className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase"
      >
        {label}
      </label>
      <select
        id={selectId}
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] px-3 py-2 text-sm leading-5 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-focus-ring)] focus:shadow-[0_0_0_1px_var(--color-focus-ring)] disabled:cursor-not-allowed disabled:text-[var(--color-text-subtle)]"
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
