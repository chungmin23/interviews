import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = () => process.env.OPENAI_MODEL ?? "gpt-4o";
// 긴 출력(면접질문 48문항 트리, 전체 이력서)이 잘리지 않도록 상한을 높인다.
// OPENAI_MAX_TOKENS 로 조절 가능. gpt-4o 출력 상한(16384) 이내 기본값.
const MAX_TOKENS = () => Number(process.env.OPENAI_MAX_TOKENS ?? "16000");

export async function streamChat(
  system: string,
  user: string,
  maxTokens?: number,
): Promise<ReadableStream<Uint8Array>> {
  const completion = await client.chat.completions.create({
    model: MODEL(),
    stream: true,
    temperature: 0.4,
    max_tokens: maxTokens ?? MAX_TOKENS(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of completion) {
        const t = chunk.choices[0]?.delta?.content ?? "";
        if (t) controller.enqueue(encoder.encode(t));
      }
      controller.close();
    },
  });
}
