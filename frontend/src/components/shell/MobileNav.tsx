"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand";
import { CloseIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NavItem } from "@/components/ui/NavItem";
import { navEntries } from "@/lib/nav";
import { SidebarUser } from "./SidebarUser";

function MenuIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

/** Top bar and slide-in menu shown instead of the sidebar below the lg width. */
export function MobileNav() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the menu after navigating to another page.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const transition = { duration: reduceMotion ? 0 : 0.3, ease: "easeOut" as const };

  return (
    <div className="lg:hidden">
      <header className="glass flex items-center gap-3 rounded-full px-4 py-2">
        <Link href="/dashboard" aria-label="QALB home" className="mr-auto">
          <Logo size={32} />
        </Link>
        <ThemeToggle />
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="inline-flex size-10 items-center justify-center rounded-full text-[var(--color-text-primary)] outline-none hover:bg-[var(--color-bg-raised)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <MenuIcon />
        </button>
      </header>
      <motion.div
        aria-hidden={!open}
        inert={!open}
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={transition}
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-40 bg-black/50"
        style={{ pointerEvents: open ? "auto" : "none" }}
      />
      <motion.aside
        aria-label="Menu"
        inert={!open}
        initial={false}
        animate={{ x: open ? "0%" : "-110%" }}
        transition={transition}
        className="glass-strong fixed top-4 bottom-4 left-4 z-50 flex w-[min(300px,calc(100vw-32px))] flex-col gap-2 rounded-[24px] px-5 pt-6 pb-5"
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="inline-flex size-10 items-center justify-center rounded-full text-[var(--color-text-secondary)] outline-none hover:bg-[var(--color-bg-raised)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            <CloseIcon />
          </button>
        </div>
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
      </motion.aside>
    </div>
  );
}
