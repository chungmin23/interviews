import { expect, test, vi, afterEach } from "vitest";
import { postStream } from "./client";
afterEach(() => vi.restoreAllMocks());

test("accumulates chunks", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    new ReadableStream({ start(c){ c.enqueue(new TextEncoder().encode("ab")); c.enqueue(new TextEncoder().encode("cd")); c.close(); } }),
    { status: 200 })));
  let out = "";
  await postStream("/api/analyze", {}, (t) => (out += t));
  expect(out).toBe("abcd");
});

test("throws on non-200", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("RATE_LIMITED", { status: 429 })));
  await expect(postStream("/x", {}, () => {})).rejects.toThrow("RATE_LIMITED");
});
