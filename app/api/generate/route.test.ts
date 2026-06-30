import { beforeEach, expect, test, vi } from "vitest";
vi.mock("@/lib/openai", () => ({
  streamChat: vi.fn(async () => new ReadableStream({ start(c){ c.enqueue(new TextEncoder().encode("# 이력서")); c.close(); } })),
}));
import { POST } from "./route";
import { __reset } from "@/lib/ratelimit";
beforeEach(() => { __reset(); process.env.DAILY_LIMIT = "5"; });
const req = (b: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(b) });

test("200 stream", async () => {
  const res = await POST(req({ masterResume: "m", jobPosting: "j", analysis: "a" }));
  expect(res.status).toBe(200);
  expect(await res.text()).toContain("이력서");
});
test("400 too long", async () => {
  const res = await POST(req({ masterResume: "x".repeat(60001), jobPosting: "j", analysis: "a" }));
  expect(res.status).toBe(400);
});
