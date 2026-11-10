export function AuthHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-[32px] leading-10 font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
        {title}
      </h2>
      <p className="text-base leading-6 text-[var(--color-text-secondary)]">
        {description}
      </p>
    </div>
  );
}
