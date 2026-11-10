import type { ComponentType } from "react";
import { canAccess, type Role } from "@/lib/auth";
import {
  BellIcon,
  CpuIcon,
  GearIcon,
  GridIcon,
  HeartpulseIcon,
  HistoryIcon,
  PulseIcon,
  UsersIcon,
  type IconProps,
} from "@/components/icons";

export type NavEntry = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
};

export const navEntries: NavEntry[] = [
  { href: "/", label: "Overview", icon: GridIcon },
  { href: "/dashboard", label: "Live monitor", icon: PulseIcon },
  { href: "/analyze", label: "Analyze ECG", icon: HeartpulseIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/patients", label: "Patients", icon: UsersIcon },
  { href: "/alerts", label: "Alerts", icon: BellIcon },
  { href: "/devices", label: "Devices", icon: CpuIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

/** The entries a role may open, so a patient never sees clinician-only pages. */
export function navEntriesFor(role: Role): NavEntry[] {
  return navEntries.filter((entry) => canAccess(role, entry.href));
}
