import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type NavItemProps = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  className?: string;
};

export function NavItem({ href, label, icon, active, className }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-md)] p-[var(--space-3)] text-sm leading-5 font-medium transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]",
        active
          ? "bg-[var(--color-brand-tint)] text-[var(--color-brand-text)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-text-primary)]",
        className,
      )}
    >
      <span className="shrink-0 [&>svg]:size-5">{icon}</span>
      {label}
    </Link>
  );
}
