import { Logo } from "@/components/brand";
import { AuthHeading } from "./AuthHeading";
import { AuthSwitch } from "./AuthSwitch";
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
        description="Monitor simulated patients, ECG streams and rhythm alerts."
      />
      <SignInForm />
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
    <div className="flex flex-col gap-6">
      <Logo />
      <AuthHeading
        title="Create account"
        description="One account for live ECG, alerts and device status."
      />
      <RegisterForm />
      <AuthSwitch
        prompt="Already have an account?"
        action="Sign in"
        href={authPaths.signin}
        onSwitch={onSwitch}
      />
    </div>
  );
}
