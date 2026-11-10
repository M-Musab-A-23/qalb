import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AlertsSection } from "./_sections/AlertsSection";
import { BadgesSection } from "./_sections/BadgesSection";
import { ButtonsSection } from "./_sections/ButtonsSection";
import { DeviceChipsSection } from "./_sections/DeviceChipsSection";
import { GlassSection } from "./_sections/GlassSection";
import { InputsSection } from "./_sections/InputsSection";
import { NavItemsSection } from "./_sections/NavItemsSection";
import { VitalsSection } from "./_sections/VitalsSection";

export default function DesignPage() {
  return (
    <main className="mx-auto flex max-w-[1168px] flex-col gap-10 px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-[32px] leading-10 font-semibold">Styleguide</h1>
        <ThemeToggle />
      </header>
      <ButtonsSection />
      <BadgesSection />
      <InputsSection />
      <VitalsSection />
      <AlertsSection />
      <DeviceChipsSection />
      <NavItemsSection />
      <GlassSection />
    </main>
  );
}
