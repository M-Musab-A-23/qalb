/** Form-level error shown above the submit button, in the same style as field errors. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="text-xs leading-4 font-medium tracking-[0.2px] text-[var(--color-status-crit-fg)]"
    >
      {message}
    </p>
  );
}
