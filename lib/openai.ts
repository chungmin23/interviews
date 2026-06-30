import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 긴 출력(면접질문 48문항 트리, 전체 이력서)이 잘리지 않도록 상한을 높인다.
// OPENAI_MAX_TOKENS 로 조절 가능. gpt-4o 출력 상한(16384) 이내 기본값.
const MAX_TOKENS = () => Number(process.env.OPENAI_MAX_TOKENS ?? "16000");

/** 작업 종류 */
export type Task = "analyze" | "generate" | "interview";

// 모델 티어 — 기본(고품질) / 절약(저비용)
const tier = {
  default: () => process.env.OPENAI_MODEL ?? "gpt-4o",
  economy: () => process.env.OPENAI_MODEL_ECONOMY ?? "gpt-4o-mini",
} as const;

// 작업별 기본 티어: 분석·생성은 기본(품질), 면접질문만 절약
const TASK_TIER: Record<Task, keyof typeof tier> = {
  analyze: "default",
  generate: "default",
  interview: "economy",
};

/**
 * 작업에 쓸 모델 결정.
 * 우선순위: OPENAI_MODEL_<TASK> (개별 지정) > 작업별 티어 기본값
 * 예) OPENAI_MODEL_ANALYZE=gpt-4o 로 분석만 기본 모델로 올릴 수 있음
 */
export function modelFor(task: Task): string {
  const override = process.env[`OPENAI_MODEL_${task.toUpperCase()}`];
  return override || tier[TASK_TIER[task]]();
}

/** 이미지(data URL)에서 텍스트를 그대로 추출(OCR). 비전 모델 사용. */
export async function extractImageText(dataUrl: string): Promise<string> {
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL_VISION ?? "gpt-4o-mini",
    temperature: 0,
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "이미지에 있는 텍스트를 그대로 추출해줘. 표·불릿·줄바꿈 등 구조를 최대한 보존하고, 설명이나 요약 없이 본문 텍스트만 출력해." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function streamMessages(
  messages: ChatMessage[],
  opts?: { model?: string; maxTokens?: number; temperature?: number },
): Promise<ReadableStream<Uint8Array>> {
  const completion = await client.chat.completions.create({
    model: opts?.model ?? tier.default(),
    stream: true,
    temperature: opts?.temperature ?? 0.4,
    max_tokens: opts?.maxTokens ?? MAX_TOKENS(),
    messages,
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

export async function streamChat(
  system: string,
  user: string,
  opts?: { model?: string; maxTokens?: number; temperature?: number },
): Promise<ReadableStream<Uint8Array>> {
  return streamMessages([{ role: "system", content: system }, { role: "user", content: user }], opts);
}
