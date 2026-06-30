import { streamMessages, type ChatMessage } from "@/lib/openai";
import { BRAINSTORM_SYSTEM } from "@/lib/prompts/brainstorm";
import { checkAndCount } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/http";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) return new Response("BAD_INPUT", { status: 400 });
  if (!checkAndCount(getClientIp(req)).ok) return new Response("RATE_LIMITED", { status: 429 });

  // 최근 20턴만, 역할·길이 정리
  const history: ChatMessage[] = messages.slice(-20).map((m: { role?: string; content?: unknown }) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content ?? "").slice(0, 8000),
  }));

  const stream = await streamMessages(
    [{ role: "system", content: BRAINSTORM_SYSTEM }, ...history],
    { temperature: 0.6 },
  );
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
