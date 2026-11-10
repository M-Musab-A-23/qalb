import { cn } from "@/lib/cn";
import { classInfo } from "@/lib/analysis/classes";
import type { BeatClass } from "@/lib/analysis/types";

/** The class letter in a tinted circle, with the class name beside it when asked. */
export function ClassBadge({
  cls,
  showName = false,
  className,
}: {
  cls: BeatClass;
  showName?: boolean;
  className?: string;
}) {
  const info = classInfo[cls];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs leading-4 font-semibold",
          info.fill,
          info.text,
        )}
      >
        {cls}
      </span>
      {showName ? (
        <span className="text-sm leading-5 font-medium text-[var(--color-text-primary)]">
          {info.name}
        </span>
      ) : (
        <span className="sr-only">{info.name}</span>
      )}
    </span>
  );
}
