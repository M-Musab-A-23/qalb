import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SearchPill } from "./SearchPill";

export function TopBar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex w-full flex-wrap items-center gap-4">
      <div className="flex min-w-max flex-1 flex-col gap-1">
        <h1 className="text-[32px] leading-10 font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      <SearchPill />
      {actions}
      <ThemeToggle />
    </header>
  );
}
