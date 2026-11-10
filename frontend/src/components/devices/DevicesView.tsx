"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { getBrokerStatus, getDevicesFor } from "@/lib/data";
import { BrokerPanel } from "./BrokerPanel";
import { DeviceCard } from "./DeviceCard";

export function DevicesView() {
  const { user } = useAuth();
  // The page sits behind AuthGate, so a user is always present here.
  if (!user) return null;

  const devices = getDevicesFor(user);
  const isClinician = user.role === "clinician";

  return (
    <>
      <TopBar
        title="Devices"
        subtitle={
          isClinician
            ? "Simulated ESP32 nodes publishing ECG over MQTT"
            : "The ECG device paired to your account"
        }
        actions={<Button>Register device</Button>}
      />
      {devices.length === 0 ? (
        <GlassCard className="flex max-w-[720px] flex-col items-start gap-3">
          <h2 className="text-xl leading-7 font-semibold text-[var(--color-text-primary)]">
            No device paired
          </h2>
          <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
            You have no ECG device on this account yet. You can still{" "}
            <Link
              href="/analyze"
              className="font-medium text-[var(--color-brand-text)] underline underline-offset-2"
            >
              analyze an uploaded recording
            </Link>
            .
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
      {isClinician ? <BrokerPanel broker={getBrokerStatus()} /> : null}
    </>
  );
}
