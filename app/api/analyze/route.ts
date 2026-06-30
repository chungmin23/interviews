import { streamChat } from "@/lib/openai";
import { ANALYZE_SYSTEM } from "@/lib/prompts/analyze";
import { checkAndCount } from "@/lib/ratelimit";
import { assertWithinLimits } from "@/lib/validate";
import { getClientIp } from "@/lib/http";

export async function POST(req: Request) {
  const { resumeText, jobPosting } = await req.json();
  try { assertWithinLimits({ resumeText, jobPosting }); }
  catch { return new Response("INPUT_TOO_LONG", { status: 400 }); }
  if (!checkAndCount(getClientIp(req)).ok) return new Response("RATE_LIMITED", { status: 429 });

  const user = `[채용공고]\n${jobPosting}\n\n[이력서]\n${resumeText}`;
  const stream = await streamChat(ANALYZE_SYSTEM, user);
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
