"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { AuthError, DEFAULT_PATH } from "@/lib/auth";
import { validateEmail, validatePassword } from "@/lib/validation";
import { useAuth } from "./AuthProvider";
import { FormError } from "./FormError";

export function SignInForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const next = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(next);
    setFormError(undefined);
    if (next.email || next.password) return;

    setSubmitting(true);
    try {
      await login({ email, password, remember: data.get("remember") === "on" });
      router.push(DEFAULT_PATH);
    } catch (caught) {
      setFormError(
        caught instanceof AuthError ? caught.message : "Could not sign in. Try again.",
      );
      setSubmitting(false);
    }
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
          error={errors.email}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errors.password}
        />
      </div>
      <div className="flex items-center justify-between">
        <Checkbox label="Keep me signed in" name="remember" defaultChecked />
        <a
          href="#"
          className="text-xs leading-4 font-medium tracking-[0.2px] text-[var(--color-brand-text)] hover:underline"
        >
          Forgot password?
        </a>
      </div>
      <div className="flex flex-col gap-2">
        <FormError message={formError} />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in" : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
