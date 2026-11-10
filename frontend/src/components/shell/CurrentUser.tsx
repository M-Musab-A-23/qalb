"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { SidebarUser } from "./SidebarUser";

const roleLabels = { clinician: "Clinician", patient: "Patient" } as const;

/** The signed-in person's card for the sidebar and the mobile menu. */
export function CurrentUser() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <SidebarUser
      name={user.name}
      role={roleLabels[user.role]}
      demo={user.demo}
    />
  );
}
