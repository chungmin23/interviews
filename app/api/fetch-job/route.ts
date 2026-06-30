export async function POST(req: Request) {
  const { url } = await req.json();
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    const html = await r.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ")
                     .replace(/<style[\s\S]*?<\/style>/gi, " ")
                     .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length < 400) return new Response("NEED_PASTE", { status: 422 });
    return Response.json({ text });
  } catch {
    return new Response("NEED_PASTE", { status: 422 });
  }
}
