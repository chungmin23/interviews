import { beforeEach, expect, test, vi } from "vitest";
vi.mock("@/lib/openai", () => ({
  streamChat: vi.fn(async () => new ReadableStream({ start(c){ c.enqueue(new TextEncoder().encode("OK")); c.close(); } })),
}));
import { POST } from "./route";
import { __reset } from "@/lib/ratelimit";

beforeEach(() => { __reset(); process.env.DAILY_LIMIT = "5"; });

const req = (body: unknown) => new Request("http://x/api/analyze", {
  method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
});

test("returns 200 stream", async () => {
  const res = await POST(req({ resumeText: "r", jobPosting: "j" }));
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("OK");
});

test("400 when too long", async () => {
  const res = await POST(req({ resumeText: "x".repeat(60001), jobPosting: "j" }));
  expect(res.status).toBe(400);
});

test("429 after limit", async () => {
  process.env.DAILY_LIMIT = "1";
  await POST(req({ resumeText: "r", jobPosting: "j" }));
  const res = await POST(req({ resumeText: "r", jobPosting: "j" }));
  expect(res.status).toBe(429);
});
