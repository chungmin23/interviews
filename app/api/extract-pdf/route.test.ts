import { expect, test, vi } from "vitest";
vi.mock("pdf-parse", () => {
  class PDFParse {
    async getText() { return { text: "hello pdf" }; }
    async destroy() {}
  }
  return { PDFParse };
});
import { POST } from "./route";

function form(bytes: Uint8Array) {
  const fd = new FormData();
  fd.append("file", new Blob([bytes as unknown as ArrayBuffer], { type: "application/pdf" }), "r.pdf");
  return new Request("http://x", { method: "POST", body: fd });
}

test("returns extracted text", async () => {
  const res = await POST(form(new Uint8Array([1, 2, 3])));
  expect(res.status).toBe(200);
  expect((await res.json()).text).toBe("hello pdf");
});
