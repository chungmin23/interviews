import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = () => process.env.OPENAI_MODEL ?? "gpt-4o";

export async function streamChat(system: string, user: string): Promise<ReadableStream<Uint8Array>> {
  const completion = await client.chat.completions.create({
    model: MODEL(),
    stream: true,
    temperature: 0.4,
    max_tokens: 4000,
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
