import { ClassBadge } from "@/components/results/ClassBadge";
import { BEAT_CLASSES, type BeatClass } from "@/lib/analysis/types";

/** Key to the marker letters, with how many beats of each class were seen since the stream started. */
export function BeatKey({ counts }: { counts: Record<BeatClass, number> }) {
  return (
    <ul aria-label="Beat class key" className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {BEAT_CLASSES.filter((cls) => cls !== "Q" || counts.Q > 0).map((cls) => (
        <li key={cls} className="flex items-center gap-2">
          <ClassBadge cls={cls} showName />
          <span className="font-mono text-[13px] leading-4 font-medium text-[var(--color-text-secondary)] tabular-nums">
            {counts[cls]}
          </span>
        </li>
      ))}
    </ul>
  );
}
