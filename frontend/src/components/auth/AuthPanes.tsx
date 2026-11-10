import { Logo } from "@/components/brand";
import { AuthHeading } from "./AuthHeading";
import { AuthSwitch } from "./AuthSwitch";
import { DemoRow } from "./DemoRow";
import { RegisterForm } from "./RegisterForm";
import { SignInForm } from "./SignInForm";

export const authPaths = {
  signin: "/login",
  register: "/register",
} as const;

export function SignInPane({ onSwitch }: { onSwitch: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <Logo />
      <AuthHeading
        title="Sign in"
        description="Analyse ECG recordings and keep your history."
      />
      <SignInForm />
      <DemoRow />
      <AuthSwitch
        prompt="New to QALB?"
        action="Create an account"
        href={authPaths.register}
        onSwitch={onSwitch}
      />
    </div>
  );
}

export function RegisterPane({ onSwitch }: { onSwitch: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Logo />
      <AuthHeading
        title="Create account"
        description="A patient account to analyse ECG files and keep a history."
      />
      <RegisterForm />
      <DemoRow />
      <AuthSwitch
        prompt="Already have an account?"
        action="Sign in"
        href={authPaths.signin}
        onSwitch={onSwitch}
      />
    </div>
  );
}
