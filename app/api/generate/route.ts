import { streamChat } from "@/lib/openai";
import { GENERATE_SYSTEM } from "@/lib/prompts/generate";
import { checkAndCount } from "@/lib/ratelimit";
import { assertWithinLimits } from "@/lib/validate";
import { getClientIp } from "@/lib/http";

export async function POST(req: Request) {
  const { masterResume, jobPosting, analysis } = await req.json();
  try { assertWithinLimits({ resumeText: masterResume, jobPosting }); }
  catch { return new Response("INPUT_TOO_LONG", { status: 400 }); }
  if (!checkAndCount(getClientIp(req)).ok) return new Response("RATE_LIMITED", { status: 429 });

  const user = `[채용공고]\n${jobPosting}\n\n[검토자 분석]\n${analysis}\n\n[마스터 이력서 풀]\n${masterResume}`;
  const stream = await streamChat(GENERATE_SYSTEM, user);
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
