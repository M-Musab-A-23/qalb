"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/validation";

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = {
      name: validateName(String(data.get("name") ?? "")),
      email: validateEmail(String(data.get("email") ?? "")),
      password: validatePassword(String(data.get("password") ?? "")),
    };
    setErrors(next);
    // Registration is simulated for now: any valid input opens the dashboard.
    if (!next.name && !next.email && !next.password) router.push("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Input
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          helper="Shown on the dashboard header"
          error={errors.name}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          helper="Use your university email"
          error={errors.email}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
          helper="At least 8 characters"
          error={errors.password}
        />
      </div>
      <Button type="submit" className="w-full">
        Create account
      </Button>
    </form>
  );
}
