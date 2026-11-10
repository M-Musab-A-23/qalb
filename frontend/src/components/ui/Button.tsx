import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "m" | "s";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium whitespace-nowrap transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-brand-fill)] text-[var(--color-text-on-brand)] hover:bg-[var(--color-brand-fill-hover)] disabled:bg-[var(--color-bg-raised)] disabled:text-[var(--color-text-subtle)]",
  secondary:
    "border border-[var(--color-border-strong)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-raised)] disabled:border-[var(--color-border-subtle)] disabled:bg-transparent disabled:text-[var(--color-text-subtle)]",
  ghost:
    "text-[var(--color-brand-text)] hover:bg-[var(--color-brand-tint)] disabled:bg-transparent disabled:text-[var(--color-text-subtle)]",
};

const sizes: Record<ButtonSize, string> = {
  m: "px-[var(--space-5)] py-[var(--space-3)] text-sm leading-5",
  s: "px-[var(--space-4)] py-[var(--space-2)] text-xs leading-4 tracking-[0.2px]",
};

export function Button({
  variant = "primary",
  size = "m",
  type = "button",
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    />
  );
}
