"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { bladeDuration, bladeEase } from "@/lib/motion";
import { AuthCopy } from "./AuthCopy";
import { authPaths, RegisterPane, SignInPane } from "./AuthPanes";
import { Blade, type AuthMode } from "./Blade";

export function AuthCard({ initialMode }: { initialMode: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const reduceMotion = useReducedMotion();

  const switchTo = useCallback((next: AuthMode) => {
    setMode(next);
    window.history.pushState(null, "", authPaths[next]);
  }, []);

  // Keep the card in step with the browser back and forward buttons.
  useEffect(() => {
    function onPopState() {
      setMode(
        window.location.pathname === authPaths.register ? "register" : "signin",
      );
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <div className="w-full">
      {/* Below the lg width there is no room for the blade: show one form. */}
      <div className="glass-strong rounded-[24px] p-6 sm:p-10 lg:hidden">
        {mode === "signin" ? (
          <SignInPane onSwitch={() => switchTo("register")} />
        ) : (
          <RegisterPane onSwitch={() => switchTo("signin")} />
        )}
      </div>

      <div className="auth-stage glass-strong relative hidden overflow-hidden rounded-[24px] lg:block">
        <div className="auth-stage-inner relative">
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
            <div className="absolute top-[43px] left-[5.27%] w-[380px]">
              <SignInPane onSwitch={() => switchTo("register")} />
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
            <div className="absolute top-5 left-[55.3%] w-[440px]">
              <RegisterPane onSwitch={() => switchTo("signin")} />
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
}
