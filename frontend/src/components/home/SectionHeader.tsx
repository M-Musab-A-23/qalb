export function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-brand-text)] uppercase">
        {eyebrow}
      </p>
      <h2 className="max-w-[820px] text-3xl leading-tight font-semibold tracking-[-0.03em] text-[var(--color-text-primary)] md:text-[40px] md:leading-[48px]">
        {title}
      </h2>
      {description ? (
        <p className="max-w-[640px] text-lg leading-7 text-[var(--color-text-secondary)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
