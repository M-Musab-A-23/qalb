import { SearchIcon } from "@/components/icons";

export function SearchPill({
  placeholder = "Search patients, devices",
}: {
  placeholder?: string;
}) {
  return (
    <label className="glass flex w-full sm:max-w-[230px] items-center gap-[10px] rounded-full px-4 py-[10px] focus-within:outline-2 focus-within:outline-[var(--color-focus-ring)]">
      <SearchIcon size={18} className="shrink-0 text-[var(--color-text-secondary)]" />
      <input
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-secondary)]"
      />
    </label>
  );
}
