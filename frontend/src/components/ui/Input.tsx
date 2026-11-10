import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  helper?: string;
  /** Error message. When set, the field is shown in the error state. */
  error?: string;
  id?: string;
};

export function Input({
  label,
  helper,
  error,
  id,
  className,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? helper;

  return (
    <div className={cn("flex w-full flex-col gap-[6px]", className)}>
      <label
        htmlFor={inputId}
        className="text-sm leading-5 font-medium text-[var(--color-text-primary)]"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          "w-full rounded-[var(--radius-md)] bg-[var(--color-bg-raised)] px-[14px] py-3 text-base leading-6 text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-subtle)]",
          error
            ? "border border-[var(--color-status-crit-fg)]"
            : "border border-[var(--color-border-strong)] focus:border-[var(--color-focus-ring)] focus:shadow-[0_0_0_1px_var(--color-focus-ring)]",
        )}
        {...rest}
      />
      {message ? (
        <p
          id={messageId}
          className={cn(
            "text-xs leading-4 font-medium tracking-[0.2px]",
            error
              ? "text-[var(--color-status-crit-fg)]"
              : "text-[var(--color-text-secondary)]",
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
