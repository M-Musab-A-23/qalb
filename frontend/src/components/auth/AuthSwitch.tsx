import type { MouseEvent } from "react";

export function AuthSwitch({
  prompt,
  action,
  href,
  onSwitch,
}: {
  prompt: string;
  action: string;
  href: string;
  onSwitch: () => void;
}) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    onSwitch();
  }
  return (
    <p className="flex items-center gap-[6px] whitespace-nowrap">
      <span className="text-sm leading-5 text-[var(--color-text-secondary)]">
        {prompt}
      </span>
      <a
        href={href}
        onClick={onClick}
        className="text-xs leading-4 font-medium tracking-[0.2px] text-[var(--color-brand-text)] underline underline-offset-2"
      >
        {action}
      </a>
    </p>
  );
}
