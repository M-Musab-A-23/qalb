"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthError, DEFAULT_PATH, type AuthFieldErrors } from "@/lib/auth";
import {
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/validation";
import { useAuth } from "./AuthProvider";
import { FormError } from "./FormError";

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const next = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(next);
    setFormError(undefined);
    if (next.name || next.email || next.password) return;

    setSubmitting(true);
    try {
      await register({ name, email, password });
      router.push(DEFAULT_PATH);
    } catch (caught) {
      if (caught instanceof AuthError) {
        setErrors(caught.fields);
        if (Object.keys(caught.fields).length === 0) setFormError(caught.message);
      } else {
        setFormError("Could not create the account. Try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <Input
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          error={errors.name}
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password}
        />
      </div>
      <div className="flex flex-col gap-2">
        <FormError message={formError} />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account" : "Create account"}
        </Button>
      </div>
    </form>
  );
}
