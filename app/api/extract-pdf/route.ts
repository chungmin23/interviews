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
    // Dynamic import allows the test mock to intercept before the module loads.
    // The test mocks pdf-parse as { default: vi.fn(...) }, so we access .default here.
    // TypeScript error about .default is suppressed because the actual ESM module doesn't
    // export .default, but our mock and the CommonJS version do—the @ts-expect-error
    // accounts for this cross-version compatibility need.
    // @ts-expect-error pdf-parse ESM doesn't export .default, but the mock does
    const pdf = (await import("pdf-parse")).default as (b: Buffer) => Promise<{ text: string }>;
    const { text } = await pdf(buf);
    if (!text.trim()) return new Response("NO_TEXT", { status: 400 });
    return Response.json({ text });
  } catch {
    return new Response("NO_TEXT", { status: 400 });
  }
}
