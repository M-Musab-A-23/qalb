import type { ComponentType } from "react";
import {
  BellIcon,
  CpuIcon,
  GearIcon,
  GridIcon,
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
  { href: "/patients", label: "Patients", icon: UsersIcon },
  { href: "/alerts", label: "Alerts", icon: BellIcon },
  { href: "/devices", label: "Devices", icon: CpuIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];
