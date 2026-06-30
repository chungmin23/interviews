export async function postStream(path: string, body: unknown, onChunk: (t: string) => void) {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) throw new Error(await res.text());
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(dec.decode(value, { stream: true }));
  }
}
export async function extractPdf(file: File): Promise<string> {
  const fd = new FormData(); fd.append("file", file);
  const res = await fetch("/api/extract-pdf", { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).text;
}
export async function extractImage(file: File): Promise<string> {
  const fd = new FormData(); fd.append("file", file);
  const res = await fetch("/api/extract-image", { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).text;
}
export async function fetchJob(url: string): Promise<string> {
  const res = await fetch("/api/fetch-job", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).text;
}
