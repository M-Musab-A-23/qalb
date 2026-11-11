import { MeshBackground } from "@/components/shell/MeshBackground";
import { CtaBand } from "./CtaBand";
import { FeaturesSection } from "./FeaturesSection";
import { HeroSection } from "./HeroSection";
import { HomeFooter } from "./HomeFooter";
import { HomeNav } from "./HomeNav";
import { HowItWorks } from "./HowItWorks";
import { LiveMonitoringSection } from "./LiveMonitoringSection";

type Props = {
  /** Heart rate for the hero heart, for example from a live feed. */
  bpm?: number;
};

export function HomePage({ bpm }: Props) {
  return (
    <div className="relative">
      <MeshBackground />
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-7 sm:px-8 lg:px-[136px]">
        <HomeNav />
        <HeroSection bpm={bpm} />
        <HowItWorks />
        <LiveMonitoringSection />
        <FeaturesSection />
        <CtaBand />
        <HomeFooter />
      </div>
    </div>
  );
}
