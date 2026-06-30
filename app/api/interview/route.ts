import { streamChat, modelFor } from "@/lib/openai";
import { INTERVIEW_SYSTEM } from "@/lib/prompts/interview";
import { checkAndCount } from "@/lib/ratelimit";
import { assertWithinLimits } from "@/lib/validate";
import { getClientIp } from "@/lib/http";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { resumeText } = await req.json();
  try { assertWithinLimits({ resumeText }); }
  catch { return new Response("INPUT_TOO_LONG", { status: 400 }); }
  if (!checkAndCount(getClientIp(req)).ok) return new Response("RATE_LIMITED", { status: 429 });
  const stream = await streamChat(INTERVIEW_SYSTEM, `[이력서]\n${resumeText}`, { model: modelFor("interview") });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
