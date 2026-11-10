import Link from "next/link";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/cn";

const links = [
  { href: "/", label: "Overview", current: true },
  { href: "#live", label: "Live monitor", current: false },
  { href: "/alerts", label: "Alerts", current: false },
  { href: "#how", label: "How it works", current: false },
];

const buttonBase =
  "inline-flex items-center justify-center rounded-[var(--radius-md)] px-4 py-2 text-xs leading-4 font-medium tracking-[0.2px] whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

export function HomeNav() {
  return (
    <header className="glass relative z-10 flex items-center gap-8 rounded-full px-6 py-4">
      <Link href="/" aria-label="QALB home">
        <Logo />
      </Link>
      <nav
        aria-label="Main"
        className="hidden flex-1 items-center justify-center gap-7 text-sm leading-5 font-medium md:flex"
      >
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            aria-current={link.current ? "page" : undefined}
            className={cn(
              "transition-colors hover:text-[var(--color-text-primary)]",
              link.current
                ? "text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)]",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3 md:ml-0">
        <ThemeToggle />
        <Link
          href="/login"
          className={cn(
            buttonBase,
            "max-sm:hidden",
            "border border-[var(--color-border-strong)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-raised)]",
          )}
        >
          Sign in
        </Link>
        <Link
          href="/dashboard"
          className={cn(
            buttonBase,
            "bg-[var(--color-brand-fill)] text-[var(--color-text-on-brand)] hover:bg-[var(--color-brand-fill-hover)]",
          )}
        >
          Open dashboard
        </Link>
      </div>
    </header>
  );
}
