import { MeshBackground } from "@/components/shell/MeshBackground";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuthCard } from "./AuthCard";
import type { AuthMode } from "./Blade";

export function AuthPage({ mode }: { mode: AuthMode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-5 px-4 py-10">
      <MeshBackground />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <AuthCard initialMode={mode} />
      <p className="w-full max-w-[1120px] text-sm leading-5 text-[var(--color-text-subtle)]">
        QALB is a university project that uses simulated data. Do not enter real
        patient information.
      </p>
    </div>
  );
}
