import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-start gap-4 p-8">
      <h1 className="text-3xl font-semibold">QALB</h1>
      <p className="text-secondary">Web portal under construction.</p>
      <ThemeToggle className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm" />
    </main>
  );
}
