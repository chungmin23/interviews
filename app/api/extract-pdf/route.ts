// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = (require("pdf-parse") as { default: (buf: Buffer) => Promise<{ text: string }> }).default;

// Helper to check if value is a Blob-like object (handles cross-context issues in Node.js)
function isBlob(value: any): value is Blob {
  return value instanceof Blob || (value && typeof value.arrayBuffer === "function" && typeof value.slice === "function");
}

export async function POST(req: Request) {
  const fd = await req.formData();
  const file = fd.get("file");
  if (!isBlob(file)) return new Response("NO_FILE", { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const { text } = await pdf(buf);
    if (!text.trim()) return new Response("NO_TEXT", { status: 400 });
    return Response.json({ text });
  } catch {
    return new Response("NO_TEXT", { status: 400 });
  }
}
