import { GridIcon, PulseIcon } from "@/components/icons";
import { NavItem } from "@/components/ui/NavItem";
import { Section } from "./Section";

export function NavItemsSection() {
  return (
    <Section title="Nav items">
      <div className="flex w-[220px] flex-col gap-2">
        <NavItem href="#" label="Overview" icon={<GridIcon />} />
        <NavItem href="#" label="Live monitor" icon={<PulseIcon />} active />
      </div>
    </Section>
  );
}
