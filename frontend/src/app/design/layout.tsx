import { notFound } from "next/navigation";
import type { ReactNode } from "react";

// Development-only styleguide. Not available in production builds.
export default function DesignLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <>{children}</>;
}
