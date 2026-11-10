"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { validateEmail, validatePassword } from "@/lib/validation";

export function SignInForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = {
      email: validateEmail(String(data.get("email") ?? "")),
      password: validatePassword(String(data.get("password") ?? "")),
    };
    setErrors(next);
    // Sign-in is simulated for now: any valid input opens the dashboard.
    if (!next.email && !next.password) router.push("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          helper="Use the email your administrator invited"
          error={errors.email}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          helper="At least 8 characters"
          error={errors.password}
        />
      </div>
      <div className="flex items-center justify-between">
        <Checkbox label="Keep me signed in" name="remember" />
        <a
          href="#"
          className="text-xs leading-4 font-medium tracking-[0.2px] text-[var(--color-brand-text)] hover:underline"
        >
          Forgot password?
        </a>
      </div>
      <Button type="submit" className="w-full">
        Sign in
      </Button>
    </form>
  );
}
