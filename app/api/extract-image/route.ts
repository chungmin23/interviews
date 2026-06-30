import { extractImageText } from "@/lib/openai";
import { checkAndCount } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/http";

export const maxDuration = 30;

export async function POST(req: Request) {
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof Blob)) return new Response("NO_FILE", { status: 400 });
  if (!file.type.startsWith("image/")) return new Response("NOT_IMAGE", { status: 400 });
  if (!checkAndCount(getClientIp(req)).ok) return new Response("RATE_LIMITED", { status: 429 });

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
  try {
    const text = await extractImageText(dataUrl);
    if (!text.trim()) return new Response("NO_TEXT", { status: 400 });
    return Response.json({ text });
  } catch {
    return new Response("EXTRACT_FAILED", { status: 500 });
  }
}
