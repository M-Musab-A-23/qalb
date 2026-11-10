function escapeCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Builds CSV text from a header row and data rows. */
export function toCsv(header: string[], rows: string[][]): string {
  return [header, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\n");
}

/** Starts a browser download of the given text as a file. */
export function downloadText(filename: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
