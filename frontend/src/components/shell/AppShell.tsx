import type { ReactNode } from "react";
import { MeshBackground } from "./MeshBackground";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-stretch gap-4 p-4 lg:flex-row lg:items-start">
      <MeshBackground />
      <MobileNav />
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col gap-6 px-2 pt-2 pb-10 sm:px-4 lg:px-8 lg:pt-7">
        {children}
      </main>
    </div>
  );
}
