import { afterEach, expect, test, vi } from "vitest";
import { POST } from "./route";
afterEach(() => vi.restoreAllMocks());
const req = (url: string) => new Request("http://x", { method: "POST", body: JSON.stringify({ url }) });

test("returns text when fetch ok and long", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("<html><body>" + "공고내용 ".repeat(100) + "</body></html>")));
  const res = await POST(req("http://job"));
  expect(res.status).toBe(200);
  expect((await res.json()).text.length).toBeGreaterThan(400);
});

test("422 when content too short", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>로그인 필요</html>")));
  const res = await POST(req("http://job"));
  expect(res.status).toBe(422);
});
