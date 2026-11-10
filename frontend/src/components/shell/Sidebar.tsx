"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand";
import { NavItem } from "@/components/ui/NavItem";
import { navEntries } from "@/lib/nav";
import { SidebarUser } from "./SidebarUser";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass sticky top-4 flex h-[calc(100dvh-32px)] w-[260px] shrink-0 flex-col gap-2 rounded-[24px] px-5 pt-7 pb-6">
      <Link href="/dashboard" aria-label="QALB home" className="w-fit">
        <Logo />
      </Link>
      <nav aria-label="Main" className="mt-6 flex flex-col gap-2">
        {navEntries.map(({ href, label, icon: Icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={<Icon />}
            active={pathname === href || pathname.startsWith(`${href}/`)}
          />
        ))}
      </nav>
      <div className="mt-auto">
        <SidebarUser name="Musab" role="Administrator" initials="MM" />
      </div>
    </aside>
  );
}
