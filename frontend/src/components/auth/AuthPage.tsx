import { MeshBackground } from "@/components/shell/MeshBackground";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuthCard } from "./AuthCard";
import { GuestGate } from "./GuestGate";
import type { AuthMode } from "./Blade";

export function AuthPage({ mode }: { mode: AuthMode }) {
  return (
    <GuestGate>
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-10 lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:py-6">
        <MeshBackground />
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="auth-frame flex flex-col gap-4">
          <AuthCard initialMode={mode} />
          <p className="text-sm leading-5 text-[var(--color-text-subtle)]">
            QALB is a research prototype. It is not a medical device and not a
            diagnosis. Demo accounts use simulated data.
          </p>
        </div>
      </div>
    </GuestGate>
  );
}
