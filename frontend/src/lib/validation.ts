const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "Enter your email address";
  if (!emailPattern.test(value.trim())) return "Enter a valid email address";
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return "Enter a password";
  if (value.length < 8) return "Use at least 8 characters";
  return undefined;
}

export function validateName(value: string): string | undefined {
  if (!value.trim()) return "Enter your name";
  return undefined;
}
