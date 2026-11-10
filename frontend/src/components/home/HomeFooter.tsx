import Link from "next/link";
import { Logo } from "@/components/brand";

function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      <p className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase">
        {title}
      </p>
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="text-sm leading-5 font-medium whitespace-nowrap text-[var(--color-text-primary)] hover:underline"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function HomeFooter() {
  return (
    <footer className="flex flex-col gap-10 border-t border-[var(--color-border-subtle)] py-12 md:flex-row md:gap-12">
      <div className="flex flex-1 flex-col gap-3">
        <Logo />
        <p className="max-w-[420px] text-sm leading-5 text-[var(--color-text-secondary)]">
          QALB is a university IoT project that uses simulated patient data. It
          is not a medical device.
        </p>
      </div>
      <LinkColumn
        title="Product"
        links={[
          { label: "Overview", href: "/" },
          { label: "Live monitor", href: "/dashboard" },
          { label: "Alerts", href: "/alerts" },
          { label: "How it works", href: "#how" },
        ]}
      />
      <LinkColumn
        title="Project"
        links={[
          { label: "CS-335 Internet of Things", href: "/" },
          { label: "NUST SEECS", href: "/" },
          { label: "GitHub", href: "https://github.com/M-Musab-A-23/qalb" },
        ]}
      />
    </footer>
  );
}
