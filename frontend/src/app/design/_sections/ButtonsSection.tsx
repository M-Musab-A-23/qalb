import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Section } from "./Section";

const variants: ButtonVariant[] = ["primary", "secondary", "ghost"];

export function ButtonsSection() {
  return (
    <Section title="Buttons">
      <div className="flex flex-col gap-4">
        {variants.map((variant) => (
          <div key={variant} className="flex flex-wrap items-center gap-4">
            <Button variant={variant}>Get started</Button>
            <Button variant={variant} disabled>
              Get started
            </Button>
            <Button variant={variant} size="s">
              Get started
            </Button>
            <Button variant={variant} size="s" disabled>
              Get started
            </Button>
          </div>
        ))}
      </div>
    </Section>
  );
}
