import { LogoMark } from "./LogoMark";

export type LogoProps = {
  /** Show the QALB wordmark next to the mark. */
  showWordmark?: boolean;
  /** Mark size in px. */
  size?: number;
  className?: string;
};

/** QALB logo: the heart mark, optionally with the wordmark. */
export function Logo({ showWordmark = true, size = 40, className }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-[10px] ${className ?? ""}`}
      role={showWordmark ? undefined : "img"}
      aria-label={showWordmark ? undefined : "QALB"}
    >
      <LogoMark size={size} />
      {showWordmark ? (
        <span className="font-heading text-2xl leading-8 font-semibold tracking-[0.08em] text-primary">
          QALB
        </span>
      ) : null}
    </span>
  );
}
