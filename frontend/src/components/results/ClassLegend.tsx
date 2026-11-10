import { BEAT_CLASSES } from "@/lib/analysis/types";
import { ClassBadge } from "./ClassBadge";

/** Key to the marker letters used on the plot and the timeline. */
export function ClassLegend() {
  return (
    <ul
      aria-label="Beat class key"
      className="flex flex-wrap items-center gap-x-5 gap-y-2"
    >
      {BEAT_CLASSES.map((cls) => (
        <li key={cls}>
          <ClassBadge cls={cls} showName />
        </li>
      ))}
    </ul>
  );
}
