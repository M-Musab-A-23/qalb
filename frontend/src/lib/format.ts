/** Formats a message age such as "0.4 s ago" or "2 min ago". */
export function formatMessageAge(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)} s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}
