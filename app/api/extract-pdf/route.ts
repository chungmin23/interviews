// Helper to check if value is a Blob-like object (handles cross-context issues in Node.js)
function isBlob(value: any): value is Blob {
  return value instanceof Blob || (value && typeof value.arrayBuffer === "function" && typeof value.slice === "function");
}

export async function POST(req: Request) {
  const fd = await req.formData();
  const file = fd.get("file");
  if (!isBlob(file)) return new Response("NO_FILE", { status: 400 });
  const data = new Uint8Array(await file.arrayBuffer());
  try {
    // pdf-parse v2: PDFParse 클래스 기반 API (v1의 함수 호출 방식과 다름).
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data });
    try {
      const { text } = await parser.getText();
      // v2가 페이지마다 끼워 넣는 "-- N of M --" 구분 표시를 제거하고 빈 줄 정리
      const cleaned = text.replace(/^\s*-- \d+ of \d+ --\s*$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
      if (!cleaned) return new Response("NO_TEXT", { status: 400 });
      return Response.json({ text: cleaned });
    } finally {
      await parser.destroy();
    }
  } catch {
    return new Response("NO_TEXT", { status: 400 });
  }
}
