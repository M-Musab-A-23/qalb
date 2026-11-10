"use client";

import { useRouter } from "next/navigation";
import { LogoutIcon } from "@/components/icons";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/cn";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { logout } = useAuth();

  async function onClick() {
    await logout();
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      aria-label="Sign out"
      title="Sign out"
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-[var(--radius-full)] text-[var(--color-text-secondary)] transition-colors outline-none hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]",
        className,
      )}
    >
      <LogoutIcon />
    </button>
  );
}
