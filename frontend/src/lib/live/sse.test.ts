import { describe, expect, it } from "vitest";
import { createSseParser } from "./sse";

describe("createSseParser", () => {
  it("returns the data of each complete message", () => {
    const parser = createSseParser();
    expect(parser.push('data: {"a":1}\n\ndata: {"b":2}\n\n')).toEqual(['{"a":1}', '{"b":2}']);
  });

  it("joins a message split across chunks", () => {
    const parser = createSseParser();
    expect(parser.push('data: {"a"')).toEqual([]);
    expect(parser.push(":1}\n")).toEqual([]);
    expect(parser.push("\n")).toEqual(['{"a":1}']);
  });

  it("handles a separator split between two chunks", () => {
    const parser = createSseParser();
    expect(parser.push("data: x\n")).toEqual([]);
    expect(parser.push("\ndata: y\n\n")).toEqual(["x", "y"]);
  });

  it("accepts CRLF line endings", () => {
    const parser = createSseParser();
    expect(parser.push("data: x\r\n\r\n")).toEqual(["x"]);
  });

  it("ignores comments and messages without data", () => {
    const parser = createSseParser();
    expect(parser.push(": keep-alive\n\nevent: ping\n\ndata: z\n\n")).toEqual(["z"]);
  });

  it("joins multi-line data with a newline", () => {
    const parser = createSseParser();
    expect(parser.push("data: a\ndata: b\n\n")).toEqual(["a\nb"]);
  });

  it("keeps an incomplete trailing message for later", () => {
    const parser = createSseParser();
    expect(parser.push("data: done\n\ndata: part")).toEqual(["done"]);
    expect(parser.push("ial\n\n")).toEqual(["partial"]);
  });
});
