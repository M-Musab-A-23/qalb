import { useId, type InputHTMLAttributes } from "react";
import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "id"
> & {
  label: string;
  id?: string;
};

export function Checkbox({ label, id, className, ...rest }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex cursor-pointer items-center gap-2 text-sm leading-5 text-[var(--color-text-secondary)]",
        className,
      )}
    >
      <input id={inputId} type="checkbox" className="peer sr-only" {...rest} />
      <span
        aria-hidden
        className="flex size-4 items-center justify-center rounded-[4px] border-[1.5px] border-[var(--color-border-strong)] text-transparent transition-colors peer-checked:border-[var(--color-brand-fill)] peer-checked:bg-[var(--color-brand-fill)] peer-checked:text-[var(--color-text-on-brand)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-focus-ring)]"
      >
        <CheckIcon size={12} strokeWidth={2.5} />
      </span>
      {label}
    </label>
  );
}
