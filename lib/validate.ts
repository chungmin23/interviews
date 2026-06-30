export function assertWithinLimits(input: { resumeText?: string; jobPosting?: string; resumeText2?: string }) {
  const r = Math.max((input.resumeText ?? "").length, (input.resumeText2 ?? "").length);
  if (r > 60000) throw new Error("INPUT_TOO_LONG");
  if ((input.jobPosting ?? "").length > 30000) throw new Error("INPUT_TOO_LONG");
}
