/**
 * Incremental parser for a Server-Sent Events body. Feed it text chunks as
 * they arrive; it returns the `data` payload of every message completed by
 * that chunk. Messages can be split across chunks at any point.
 */
export type SseParser = {
  push(chunk: string): string[];
};

export function createSseParser(): SseParser {
  let pending = "";
  return {
    push(chunk) {
      pending += chunk.replace(/\r\n?/g, "\n");
      const out: string[] = [];
      let end = pending.indexOf("\n\n");
      while (end !== -1) {
        const block = pending.slice(0, end);
        pending = pending.slice(end + 2);
        const data = block
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, ""));
        // Comment lines and blocks without data are ignored.
        if (data.length > 0) out.push(data.join("\n"));
        end = pending.indexOf("\n\n");
      }
      return out;
    },
  };
}
