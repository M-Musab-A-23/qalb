import { MeshBackground } from "@/components/shell/MeshBackground";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuthCard } from "./AuthCard";
import type { AuthMode } from "./Blade";

export function AuthPage({ mode }: { mode: AuthMode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-10 lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:py-6">
      <MeshBackground />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <AuthCard initialMode={mode} />
      <p className="w-full max-w-[1120px] text-sm leading-5 text-[var(--color-text-subtle)] lg:w-[min(1120px,calc(100vw-48px))]">
        QALB uses simulated data. It is not a medical device. Do not enter real
        patient information.
      </p>
    </div>
  );
}
