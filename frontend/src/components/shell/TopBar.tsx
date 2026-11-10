import type { ReactNode } from "react";
import { SearchPill } from "./SearchPill";

export function TopBar({
  title,
  subtitle,
  actions,
  search = false,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Shows the search pill next to the actions. */
  search?: boolean;
}) {
  return (
    <header className="flex w-full flex-wrap items-center gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-max">
        <h1 className="text-[28px] leading-9 font-semibold sm:text-[32px] sm:leading-10 tracking-[-0.03em] text-[var(--color-text-primary)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {search ? <SearchPill /> : null}
      {actions}
    </header>
  );
}
