"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand";
import { NavItem } from "@/components/ui/NavItem";
import { useNavEntries } from "@/lib/hooks/useNavEntries";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { CurrentUser } from "./CurrentUser";
import { SignOutButton } from "./SignOutButton";

export function Sidebar() {
  const pathname = usePathname();
  const entries = useNavEntries();

  return (
    <aside className="glass hidden h-full w-[260px] shrink-0 flex-col gap-2 rounded-[24px] lg:flex px-5 pt-7 pb-6">
      <Link href="/dashboard" aria-label="QALB home" className="w-fit">
        <Logo />
      </Link>
      <nav aria-label="Main" className="mt-6 flex flex-col gap-2">
        {entries.map(({ href, label, icon: Icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={<Icon />}
            active={pathname === href || pathname.startsWith(`${href}/`)}
          />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        <CurrentUser />
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
