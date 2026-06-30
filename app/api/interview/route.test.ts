import { beforeEach, expect, test, vi } from "vitest";
vi.mock("@/lib/openai", () => ({
  streamChat: vi.fn(async () => new ReadableStream({ start(c){ c.enqueue(new TextEncoder().encode("## 인성")); c.close(); } })),
}));
import { POST } from "./route";
import { __reset } from "@/lib/ratelimit";

beforeEach(() => { __reset(); process.env.DAILY_LIMIT = "5"; });

test("200 stream", async () => {
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ resumeText: "r" }) }));
  expect(res.status).toBe(200);
  expect(await res.text()).toContain("인성");
});
