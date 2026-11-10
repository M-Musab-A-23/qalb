"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/brand";
import { bladeDuration, bladeEase } from "@/lib/motion";
import { AuthCopy } from "./AuthCopy";
import { AuthHeading } from "./AuthHeading";
import { AuthSwitch } from "./AuthSwitch";
import { Blade, type AuthMode } from "./Blade";
import { RegisterForm } from "./RegisterForm";
import { SignInForm } from "./SignInForm";

const paths: Record<AuthMode, string> = {
  signin: "/login",
  register: "/register",
};

export function AuthCard({ initialMode }: { initialMode: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const reduceMotion = useReducedMotion();

  const switchTo = useCallback((next: AuthMode) => {
    setMode(next);
    window.history.pushState(null, "", paths[next]);
  }, []);

  // Keep the card in step with the browser back and forward buttons.
  useEffect(() => {
    function onPopState() {
      setMode(
        window.location.pathname === paths.register ? "register" : "signin",
      );
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <div className="glass-strong relative h-[640px] w-full max-w-[1120px] overflow-hidden rounded-[24px]">
      <Blade mode={mode} />
      {/* The track is two card widths wide and slides with the blade. */}
      <motion.div
        initial={false}
        animate={{ x: mode === "signin" ? "0%" : "-50%" }}
        transition={{
          duration: reduceMotion ? 0 : bladeDuration,
          ease: bladeEase,
        }}
        className="absolute inset-y-0 left-0 flex w-[200%]"
      >
        <div className="relative h-full w-1/2" inert={mode !== "signin"}>
          <div className="absolute top-[43px] left-[5.27%] flex w-[380px] flex-col gap-6">
            <Logo />
            <AuthHeading
              title="Sign in"
              description="Monitor simulated patients, ECG streams and rhythm alerts."
            />
            <SignInForm />
            <AuthSwitch
              prompt="New to QALB?"
              action="Create an account"
              href={paths.register}
              onSwitch={() => switchTo("register")}
            />
          </div>
          <AuthCopy
            className="absolute top-[247px] left-[57%]"
            eyebrow="Welcome back"
            title="Welcome back."
            body="Your patients and their ECG streams are exactly where you left them."
          />
        </div>
        <div className="relative h-full w-1/2" inert={mode !== "register"}>
          <AuthCopy
            className="absolute top-[247px] left-[7%]"
            eyebrow="New to QALB"
            title="Start monitoring."
            body="One account gives you live ECG, rhythm alerts and device status for simulated patients."
          />
          <div className="absolute top-5 left-[55.3%] flex w-[440px] flex-col gap-6">
            <Logo />
            <AuthHeading
              title="Create account"
              description="One account for live ECG, alerts and device status."
            />
            <RegisterForm />
            <AuthSwitch
              prompt="Already have an account?"
              action="Sign in"
              href={paths.signin}
              onSwitch={() => switchTo("signin")}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
