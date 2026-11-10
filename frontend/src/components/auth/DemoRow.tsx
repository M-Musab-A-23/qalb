"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DEFAULT_PATH, type Role } from "@/lib/auth";
import { useAuth } from "./AuthProvider";
import { FormError } from "./FormError";

const demoButtons: Array<{ role: Role; label: string }> = [
  { role: "clinician", label: "Demo clinician" },
  { role: "patient", label: "Demo patient" },
];

/** Signs in a seeded demo account with one click. */
export function DemoRow() {
  const router = useRouter();
  const { loginDemo } = useAuth();
  const [pending, setPending] = useState<Role | null>(null);
  const [error, setError] = useState<string>();

  async function start(role: Role) {
    setPending(role);
    setError(undefined);
    try {
      await loginDemo(role);
      router.push(DEFAULT_PATH);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the demo");
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs leading-4 font-semibold tracking-[0.08em] text-[var(--color-text-secondary)] uppercase">
        Try the demo
      </p>
      <div className="flex gap-3">
        {demoButtons.map(({ role, label }) => (
          <Button
            key={role}
            variant="secondary"
            size="s"
            className="flex-1"
            disabled={pending !== null}
            onClick={() => void start(role)}
          >
            {pending === role ? "Opening" : label}
          </Button>
        ))}
      </div>
      <FormError message={error} />
    </div>
  );
}
