import { streamChat } from "@/lib/openai";
import { COVER_SYSTEM } from "@/lib/prompts/cover";
import { checkAndCount } from "@/lib/ratelimit";
import { assertWithinLimits } from "@/lib/validate";
import { getClientIp } from "@/lib/http";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { masterResume, jobPosting, analysis, prompt, charLimit } = await req.json();
  try { assertWithinLimits({ resumeText: masterResume, jobPosting }); }
  catch { return new Response("INPUT_TOO_LONG", { status: 400 }); }
  if (!checkAndCount(getClientIp(req)).ok) return new Response("RATE_LIMITED", { status: 429 });

  let user = `[채용공고]\n${jobPosting}\n\n[마스터 이력서]\n${masterResume}`;
  if (analysis) user += `\n\n[갭 분석]\n${analysis}`;
  if (prompt) user += `\n\n[자소서 문항]\n${prompt}`;
  if (charLimit) user += `\n\n[글자수 목표] 약 ${charLimit}자`;

  const stream = await streamChat(COVER_SYSTEM, user);
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
