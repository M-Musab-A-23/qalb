import type { ReactNode } from "react";
import { MeshBackground } from "./MeshBackground";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-start gap-4 p-4">
      <MeshBackground />
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col gap-6 px-8 pt-7 pb-10">
        {children}
      </main>
    </div>
  );
}
