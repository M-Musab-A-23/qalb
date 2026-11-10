export function AuthCopy({
  eyebrow,
  title,
  body,
  className,
}: {
  eyebrow: string;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div
      className={`flex w-[420px] flex-col gap-4 text-[var(--neutral-0)] ${className ?? ""}`}
    >
      <p className="text-xs leading-4 font-semibold tracking-[0.08em] uppercase opacity-75">
        {eyebrow}
      </p>
      <p className="text-[40px] leading-[48px] font-semibold tracking-[-0.0375em]">
        {title}
      </p>
      <p className="w-[380px] text-base leading-6 opacity-85">{body}</p>
    </div>
  );
}
