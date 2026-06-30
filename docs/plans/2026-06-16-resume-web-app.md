# 이력서 웹앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채용공고+이력서를 입력하면 서류 검토자 분석을 보여주고, 마스터 이력서는 공고 맞춤 이력서를 생성·편집·PDF 출력하며, 면접 예상 질문을 추출하는 웹앱을 만든다.

**Architecture:** Next.js(App Router) 단일 앱. UI는 React, OpenAI 호출은 서버 API 라우트에서만(키 은닉). DB 없이 localStorage에 문서 보관. 하네스 스킬을 OpenAI system 프롬프트로 이식.

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind, OpenAI SDK, react-markdown, pdf-parse, nanoid, Vitest(단위), Playwright(E2E, 선택).

## Global Constraints

- **DB 금지.** 영속 상태는 브라우저 localStorage만. 서버는 무상태(인메모리 rate limit 제외).
- **OpenAI 키는 서버 전용.** `process.env.OPENAI_API_KEY`. 클라이언트 번들/응답에 키·프롬프트 원문 노출 금지.
- **기본 모델 `gpt-4o`**, `process.env.OPENAI_MODEL`로 교체 가능.
- **프롬프트 상수는 `lib/prompts/`에 두고** 하네스 스킬과 1:1 대응(파일 상단에 출처 스킬 경로 주석).
- **입력 길이 상한:** 이력서 60,000자, 공고 30,000자 (초과 시 400).
- 작업 디렉토리: `이력서/resume-web-app/` (이하 모든 경로는 이 폴더 기준).
- 커밋: 각 Task 끝에서 1회. 메시지는 Conventional Commits.

---

### Task 0: 프로젝트 스캐폴드

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `.env.local.example`, `.gitignore`, `vitest.config.ts`

**Interfaces:**
- Produces: 실행 가능한 빈 Next.js 앱(`npm run dev`), Vitest 실행 환경.

- [ ] **Step 1: 폴더에서 git 초기화 + Next 의존성 설치**

```bash
cd "이력서/resume-web-app"
git init
npm init -y
npm i next@latest react react-dom openai react-markdown nanoid pdf-parse
npm i -D typescript @types/react @types/node tailwindcss postcss autoprefixer vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom
npx tailwindcss init -p
```

- [ ] **Step 2: 설정 파일 작성**

`package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020", "lib": ["dom","dom.iterable","esnext"], "allowJs": true,
    "strict": true, "noEmit": true, "esModuleInterop": true, "module": "esnext",
    "moduleResolution": "bundler", "jsx": "preserve", "incremental": true,
    "plugins": [{ "name": "next" }], "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts","**/*.ts","**/*.tsx",".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = { serverExternalPackages: ["pdf-parse"] };
export default nextConfig;
```

`tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { accent: "#1f5fbf", accentDark: "#16478f" } } },
  plugins: [],
};
export default config;
```

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true },
  resolve: { alias: { "@": new URL(".", import.meta.url).pathname } },
});
```

`.env.local.example`:
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
DAILY_LIMIT=30
APP_PASSWORD=
```

`.gitignore`:
```
node_modules
.next
.env.local
```

- [ ] **Step 3: 레이아웃 + 빈 홈**

`app/layout.tsx`:
```tsx
import "./globals.css";
export const metadata = { title: "이력서 도우미" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
```

`app/page.tsx`:
```tsx
export default function Home() {
  return <main className="p-8 text-xl">이력서 웹앱 (스캐폴드)</main>;
}
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공(0 errors).

- [ ] **Step 5: Commit**

```bash
cp .env.local.example .env.local
git add -A && git commit -m "chore: scaffold next.js app with tailwind and vitest"
```

---

### Task 1: localStorage 저장 라이브러리

**Files:**
- Create: `lib/types.ts`, `lib/storage.ts`, `lib/storage.test.ts`

**Interfaces:**
- Produces:
  - `type SavedDoc = { id:string; title:string; kind:"master"|"general"; createdAt:string; jobPosting:string; analysis:string; resumeMd:string|null; interviewMd:string|null }`
  - `type MasterResume = { text:string; updatedAt:string }`
  - `listDocs(): SavedDoc[]`
  - `getDoc(id:string): SavedDoc | undefined`
  - `upsertDoc(doc: SavedDoc): void`
  - `deleteDoc(id:string): void`
  - `getMaster(): MasterResume | null`
  - `setMaster(text:string): void`
  - keys: `"resume-app:documents"`, `"resume-app:masterResume"`

- [ ] **Step 1: 타입 정의**

`lib/types.ts`:
```ts
export type DocKind = "master" | "general";
export type SavedDoc = {
  id: string; title: string; kind: DocKind; createdAt: string;
  jobPosting: string; analysis: string;
  resumeMd: string | null; interviewMd: string | null;
};
export type MasterResume = { text: string; updatedAt: string };
```

- [ ] **Step 2: 실패하는 테스트 작성**

`lib/storage.test.ts`:
```ts
import { beforeEach, expect, test } from "vitest";
import { listDocs, upsertDoc, getDoc, deleteDoc, getMaster, setMaster } from "./storage";
import type { SavedDoc } from "./types";

const make = (id: string): SavedDoc => ({
  id, title: "t", kind: "general", createdAt: "2026-06-16",
  jobPosting: "jd", analysis: "a", resumeMd: null, interviewMd: null,
});

beforeEach(() => localStorage.clear());

test("upsert then list/get", () => {
  upsertDoc(make("1"));
  expect(listDocs().map(d => d.id)).toEqual(["1"]);
  expect(getDoc("1")?.jobPosting).toBe("jd");
});

test("upsert replaces same id", () => {
  upsertDoc(make("1"));
  upsertDoc({ ...make("1"), title: "new" });
  expect(listDocs()).toHaveLength(1);
  expect(getDoc("1")?.title).toBe("new");
});

test("delete removes", () => {
  upsertDoc(make("1")); deleteDoc("1");
  expect(listDocs()).toHaveLength(0);
});

test("master resume set/get", () => {
  expect(getMaster()).toBeNull();
  setMaster("master text");
  expect(getMaster()?.text).toBe("master text");
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run lib/storage.test.ts`
Expected: FAIL (storage.ts 없음).

- [ ] **Step 4: 구현**

`lib/storage.ts`:
```ts
import type { SavedDoc, MasterResume } from "./types";
const DOCS = "resume-app:documents";
const MASTER = "resume-app:masterResume";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; }
  catch { return fallback; }
}
function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function listDocs(): SavedDoc[] { return read<SavedDoc[]>(DOCS, []); }
export function getDoc(id: string) { return listDocs().find(d => d.id === id); }
export function upsertDoc(doc: SavedDoc) {
  const docs = listDocs().filter(d => d.id !== doc.id);
  write(DOCS, [doc, ...docs]);
}
export function deleteDoc(id: string) { write(DOCS, listDocs().filter(d => d.id !== id)); }
export function getMaster(): MasterResume | null { return read<MasterResume | null>(MASTER, null); }
export function setMaster(text: string) { write(MASTER, { text, updatedAt: new Date().toISOString() }); }
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run lib/storage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib && git commit -m "feat: localStorage document store"
```

---

### Task 2: IP 일일 호출 제한 + 입력 검증 라이브러리

**Files:**
- Create: `lib/ratelimit.ts`, `lib/ratelimit.test.ts`, `lib/validate.ts`, `lib/validate.test.ts`

**Interfaces:**
- Produces:
  - `checkAndCount(ip:string, now?:number): { ok:boolean; remaining:number }` — `DAILY_LIMIT`(기본 30) 초과 시 `ok:false`. 24h 슬라이딩 day 버킷.
  - `assertWithinLimits(input:{ resumeText?:string; jobPosting?:string; resumeText2?:string }): void` — 상한 초과 시 `throw new Error("INPUT_TOO_LONG")`. 이력서 60000, 공고 30000.

- [ ] **Step 1: 실패 테스트 (ratelimit)**

`lib/ratelimit.test.ts`:
```ts
import { beforeEach, expect, test } from "vitest";
import { __reset, checkAndCount } from "./ratelimit";

beforeEach(() => __reset());

test("counts down and blocks after limit", () => {
  process.env.DAILY_LIMIT = "3";
  expect(checkAndCount("1.1.1.1").remaining).toBe(2);
  checkAndCount("1.1.1.1"); checkAndCount("1.1.1.1");
  expect(checkAndCount("1.1.1.1").ok).toBe(false);
});

test("separate ips independent", () => {
  process.env.DAILY_LIMIT = "1";
  expect(checkAndCount("a").ok).toBe(true);
  expect(checkAndCount("b").ok).toBe(true);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/ratelimit.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현 ratelimit**

`lib/ratelimit.ts`:
```ts
type Bucket = { day: string; count: number };
const store = new Map<string, Bucket>();
const today = (now: number) => new Date(now).toISOString().slice(0, 10);

export function checkAndCount(ip: string, now = Date.now()) {
  const limit = Number(process.env.DAILY_LIMIT ?? "30");
  const day = today(now);
  const b = store.get(ip);
  const cur = b && b.day === day ? b.count : 0;
  if (cur >= limit) return { ok: false, remaining: 0 };
  store.set(ip, { day, count: cur + 1 });
  return { ok: true, remaining: limit - (cur + 1) };
}
export function __reset() { store.clear(); }
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib/ratelimit.test.ts`
Expected: PASS.

- [ ] **Step 5: 실패 테스트 (validate)**

`lib/validate.test.ts`:
```ts
import { expect, test } from "vitest";
import { assertWithinLimits } from "./validate";

test("passes within limits", () => {
  expect(() => assertWithinLimits({ resumeText: "x", jobPosting: "y" })).not.toThrow();
});
test("throws when resume too long", () => {
  expect(() => assertWithinLimits({ resumeText: "x".repeat(60001) })).toThrow("INPUT_TOO_LONG");
});
test("throws when posting too long", () => {
  expect(() => assertWithinLimits({ jobPosting: "x".repeat(30001) })).toThrow("INPUT_TOO_LONG");
});
```

- [ ] **Step 6: 구현 validate**

`lib/validate.ts`:
```ts
export function assertWithinLimits(input: { resumeText?: string; jobPosting?: string; resumeText2?: string }) {
  const r = Math.max((input.resumeText ?? "").length, (input.resumeText2 ?? "").length);
  if (r > 60000) throw new Error("INPUT_TOO_LONG");
  if ((input.jobPosting ?? "").length > 30000) throw new Error("INPUT_TOO_LONG");
}
```

- [ ] **Step 7: 통과 + Commit**

Run: `npx vitest run lib/ratelimit.test.ts lib/validate.test.ts`
Expected: PASS (5 tests).
```bash
git add lib && git commit -m "feat: ip daily rate limit and input validation"
```

---

### Task 3: OpenAI 클라이언트 + 분석 프롬프트

**Files:**
- Create: `lib/openai.ts`, `lib/prompts/analyze.ts`

**Interfaces:**
- Produces:
  - `streamChat(system:string, user:string): Promise<ReadableStream<Uint8Array>>` — OpenAI 스트리밍을 text/plain 스트림으로 변환.
  - `ANALYZE_SYSTEM: string` — reviewer-simulation 이식 프롬프트.

- [ ] **Step 1: OpenAI 클라이언트**

`lib/openai.ts`:
```ts
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = () => process.env.OPENAI_MODEL ?? "gpt-4o";

export async function streamChat(system: string, user: string): Promise<ReadableStream<Uint8Array>> {
  const completion = await client.chat.completions.create({
    model: MODEL(), stream: true, temperature: 0.4, max_tokens: 4000,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
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
```

- [ ] **Step 2: 분석 프롬프트 이식**

`lib/prompts/analyze.ts` (출처: `.claude/skills/resume-reviewer-simulation/SKILL.md`):
```ts
export const ANALYZE_SYSTEM = `당신은 서류 1차 심사관입니다. 제공된 채용공고(JD)와 이력서 텍스트만 근거로 분석하세요.
절대 규칙: 외부 추정·검색 금지. 점수/등급/이모지 금지. 단정 어려우면 "확인 필요" 표기. 근거→해석 구조. 한국어, 간결, 한 불릿 2줄 이내.

다음을 마크다운으로 출력:
## 1. 첫인상/기본 스크리닝 (3~5개 불릿)
## 2. 도메인 적합성
## 3. 기술 역량 매칭
## 4. 문제 해결/Ownership
## 5. 협업/문화 적합성
## 6. 합격 가능성 및 우려 포인트

### 강점 Top 3
| 강점 | 근거(이력서/JD 인용 요약) | 채용 관점 해석 |

### 우려 Top 3
| 우려 | 근거(이력서/JD 인용 요약) | 면접 확인 포인트 |

### 개선 제안
| 개선 대상 | 이력서에 추가/수정할 액션 | 예시 문장(PSR) | 지표/예시 |

### 검토자 결론
강점이 우려를 상쇄하는지, 면접 검증 가치가 있는지 (단정 어려우면 "확인 필요").`;
```

- [ ] **Step 3: 빌드 확인 + Commit**

Run: `npx tsc --noEmit`
Expected: 0 errors.
```bash
git add lib && git commit -m "feat: openai stream client and analyze prompt"
```

---

### Task 4: `/api/analyze` 라우트

**Files:**
- Create: `app/api/analyze/route.ts`, `lib/http.ts`, `app/api/analyze/route.test.ts`

**Interfaces:**
- Consumes: `streamChat`, `ANALYZE_SYSTEM`, `checkAndCount`, `assertWithinLimits`.
- Produces:
  - `getClientIp(req: Request): string` (in `lib/http.ts`)
  - `POST /api/analyze` body `{ resumeText:string; jobPosting:string }` → 200 text 스트림 | 400 INPUT_TOO_LONG | 429 RATE_LIMITED.

- [ ] **Step 1: http 헬퍼**

`lib/http.ts`:
```ts
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff ? xff.split(",")[0] : "") || "local";
}
```

- [ ] **Step 2: 실패 테스트 (openai 모킹)**

`app/api/analyze/route.test.ts`:
```ts
import { beforeEach, expect, test, vi } from "vitest";
vi.mock("@/lib/openai", () => ({
  streamChat: vi.fn(async () => new ReadableStream({ start(c){ c.enqueue(new TextEncoder().encode("OK")); c.close(); } })),
}));
import { POST } from "./route";
import { __reset } from "@/lib/ratelimit";

beforeEach(() => { __reset(); process.env.DAILY_LIMIT = "5"; });

const req = (body: unknown) => new Request("http://x/api/analyze", {
  method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
});

test("returns 200 stream", async () => {
  const res = await POST(req({ resumeText: "r", jobPosting: "j" }));
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("OK");
});

test("400 when too long", async () => {
  const res = await POST(req({ resumeText: "x".repeat(60001), jobPosting: "j" }));
  expect(res.status).toBe(400);
});

test("429 after limit", async () => {
  process.env.DAILY_LIMIT = "1";
  await POST(req({ resumeText: "r", jobPosting: "j" }));
  const res = await POST(req({ resumeText: "r", jobPosting: "j" }));
  expect(res.status).toBe(429);
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run app/api/analyze/route.test.ts`
Expected: FAIL.

- [ ] **Step 4: 구현**

`app/api/analyze/route.ts`:
```ts
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
```

- [ ] **Step 5: 통과 + Commit**

Run: `npx vitest run app/api/analyze/route.test.ts`
Expected: PASS (3 tests).
```bash
git add app lib && git commit -m "feat: /api/analyze route with limits"
```

---

### Task 5: `/api/extract-pdf` 라우트

**Files:**
- Create: `app/api/extract-pdf/route.ts`, `app/api/extract-pdf/route.test.ts`

**Interfaces:**
- Produces: `POST /api/extract-pdf` (multipart, field `file`) → `{ text:string }` | 400 NO_TEXT(추출 실패/빈 텍스트).

- [ ] **Step 1: 실패 테스트 (pdf-parse 모킹)**

`app/api/extract-pdf/route.test.ts`:
```ts
import { expect, test, vi } from "vitest";
vi.mock("pdf-parse", () => ({ default: vi.fn(async () => ({ text: "hello pdf" })) }));
import { POST } from "./route";

function form(bytes: Uint8Array) {
  const fd = new FormData();
  fd.append("file", new Blob([bytes], { type: "application/pdf" }), "r.pdf");
  return new Request("http://x", { method: "POST", body: fd });
}

test("returns extracted text", async () => {
  const res = await POST(form(new Uint8Array([1, 2, 3])));
  expect(res.status).toBe(200);
  expect((await res.json()).text).toBe("hello pdf");
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run app/api/extract-pdf/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

`app/api/extract-pdf/route.ts`:
```ts
import pdf from "pdf-parse";
export async function POST(req: Request) {
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof Blob)) return new Response("NO_FILE", { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const { text } = await pdf(buf);
    if (!text.trim()) return new Response("NO_TEXT", { status: 400 });
    return Response.json({ text });
  } catch {
    return new Response("NO_TEXT", { status: 400 });
  }
}
```

- [ ] **Step 4: 통과 + Commit**

Run: `npx vitest run app/api/extract-pdf/route.test.ts`
Expected: PASS.
```bash
git add app && git commit -m "feat: /api/extract-pdf text extraction"
```

---

### Task 6: `/api/fetch-job` 라우트 (공고 링크)

**Files:**
- Create: `app/api/fetch-job/route.ts`, `app/api/fetch-job/route.test.ts`

**Interfaces:**
- Produces: `POST /api/fetch-job` body `{ url:string }` → `{ text:string }` (성공) | 422 NEED_PASTE (접근 실패/본문 빈약 <400자).
- Consumes: 전역 `fetch`.

- [ ] **Step 1: 실패 테스트**

`app/api/fetch-job/route.test.ts`:
```ts
import { afterEach, expect, test, vi } from "vitest";
import { POST } from "./route";
afterEach(() => vi.restoreAllMocks());
const req = (url: string) => new Request("http://x", { method: "POST", body: JSON.stringify({ url }) });

test("returns text when fetch ok and long", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("<html><body>" + "공고내용 ".repeat(100) + "</body></html>")));
  const res = await POST(req("http://job"));
  expect(res.status).toBe(200);
  expect((await res.json()).text.length).toBeGreaterThan(400);
});

test("422 when content too short", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>로그인 필요</html>")));
  const res = await POST(req("http://job"));
  expect(res.status).toBe(422);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run app/api/fetch-job/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

`app/api/fetch-job/route.ts`:
```ts
export async function POST(req: Request) {
  const { url } = await req.json();
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    const html = await r.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ")
                     .replace(/<style[\s\S]*?<\/style>/gi, " ")
                     .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length < 400) return new Response("NEED_PASTE", { status: 422 });
    return Response.json({ text });
  } catch {
    return new Response("NEED_PASTE", { status: 422 });
  }
}
```

- [ ] **Step 4: 통과 + Commit**

Run: `npx vitest run app/api/fetch-job/route.test.ts`
Expected: PASS.
```bash
git add app && git commit -m "feat: /api/fetch-job with paste fallback"
```

---

### Task 7: 공용 클라이언트 헬퍼 (스트림 수신 + API 래퍼)

**Files:**
- Create: `lib/client.ts`, `lib/client.test.ts`

**Interfaces:**
- Produces:
  - `postStream(path:string, body:unknown, onChunk:(t:string)=>void): Promise<void>` — text 스트림을 청크마다 콜백. 비-200이면 `throw new Error(statusText body)`.
  - `extractPdf(file:File): Promise<string>`
  - `fetchJob(url:string): Promise<string>` (422면 `throw new Error("NEED_PASTE")`)

- [ ] **Step 1: 실패 테스트**

`lib/client.test.ts`:
```ts
import { expect, test, vi, afterEach } from "vitest";
import { postStream } from "./client";
afterEach(() => vi.restoreAllMocks());

test("accumulates chunks", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    new ReadableStream({ start(c){ c.enqueue(new TextEncoder().encode("ab")); c.enqueue(new TextEncoder().encode("cd")); c.close(); } }),
    { status: 200 })));
  let out = "";
  await postStream("/api/analyze", {}, (t) => (out += t));
  expect(out).toBe("abcd");
});

test("throws on non-200", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("RATE_LIMITED", { status: 429 })));
  await expect(postStream("/x", {}, () => {})).rejects.toThrow("RATE_LIMITED");
});
```

- [ ] **Step 2: 실패 확인 → 구현**

Run: `npx vitest run lib/client.test.ts` → FAIL, then create:

`lib/client.ts`:
```ts
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
export async function fetchJob(url: string): Promise<string> {
  const res = await fetch("/api/fetch-job", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).text;
}
```

- [ ] **Step 3: 통과 + Commit**

Run: `npx vitest run lib/client.test.ts`
Expected: PASS.
```bash
git add lib && git commit -m "feat: client stream and api helpers"
```

---

### Task 8: 홈 화면 — 입력 + 분석 실행 + 결과 표시 + 저장

**Files:**
- Create: `components/ResumeInput.tsx`, `components/JobPostingInput.tsx`, `components/MarkdownView.tsx`, `components/Sidebar.tsx`, `app/page.tsx` (Modify: 기존 스캐폴드 교체)

**Interfaces:**
- Consumes: `postStream`, `extractPdf`, `fetchJob`, storage `setMaster/getMaster/upsertDoc/listDocs`, `nanoid`.
- Produces: 홈 플로우 — (1) 이력서 입력(붙여넣기|PDF) + 종류 선택, (2) 공고 입력(링크|텍스트), (3) [분석하기]→스트림 표시, (4) 마스터면 [맞춤 이력서 생성] 버튼이 `/resume/[id]`로 이동(분석을 doc에 저장).

- [ ] **Step 1: MarkdownView (재사용 컴포넌트)**

`components/MarkdownView.tsx`:
```tsx
"use client";
import ReactMarkdown from "react-markdown";
export default function MarkdownView({ md }: { md: string }) {
  return (
    <div className="prose max-w-none whitespace-pre-wrap text-sm leading-relaxed
      [&_table]:border-collapse [&_td]:border [&_th]:border [&_td]:px-2 [&_th]:px-2">
      <ReactMarkdown>{md.replace(/\[확인 필요[^\]]*\]/g, (m) => `**🔴${m}**`)}</ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 2: ResumeInput (붙여넣기/PDF + 종류)**

`components/ResumeInput.tsx`:
```tsx
"use client";
import { useState } from "react";
import { extractPdf } from "@/lib/client";
import type { DocKind } from "@/lib/types";

export default function ResumeInput({ onChange }: { onChange: (text: string, kind: DocKind) => void }) {
  const [text, setText] = useState(""); const [kind, setKind] = useState<DocKind>("master"); const [busy, setBusy] = useState(false);
  async function onFile(f: File) {
    setBusy(true);
    try { const t = await extractPdf(f); setText(t); onChange(t, kind); }
    catch { alert("PDF에서 텍스트를 못 읽었어요. md/텍스트로 붙여넣어 주세요."); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-3 text-sm">
        <label><input type="radio" checked={kind==="master"} onChange={()=>{setKind("master");onChange(text,"master");}}/> 마스터 이력서</label>
        <label><input type="radio" checked={kind==="general"} onChange={()=>{setKind("general");onChange(text,"general");}}/> 일반 이력서</label>
      </div>
      <textarea className="w-full h-48 border p-2 text-sm" placeholder="이력서 md/텍스트 붙여넣기"
        value={text} onChange={(e)=>{setText(e.target.value);onChange(e.target.value,kind);}}/>
      <input type="file" accept="application/pdf" onChange={(e)=>e.target.files?.[0]&&onFile(e.target.files[0])}/>
      {busy && <span className="text-xs text-gray-500">PDF 읽는 중…</span>}
    </div>
  );
}
```

- [ ] **Step 3: JobPostingInput (링크/텍스트)**

`components/JobPostingInput.tsx`:
```tsx
"use client";
import { useState } from "react";
import { fetchJob } from "@/lib/client";
export default function JobPostingInput({ onChange }: { onChange: (t: string) => void }) {
  const [text, setText] = useState(""); const [url, setUrl] = useState("");
  async function tryUrl() {
    try { const t = await fetchJob(url); setText(t); onChange(t); }
    catch { alert("링크에서 공고를 못 가져왔어요(로그인 필요 등). 공고 전문을 붙여넣어 주세요."); }
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="flex-1 border p-2 text-sm" placeholder="공고 링크(선택)" value={url} onChange={(e)=>setUrl(e.target.value)}/>
        <button className="border px-3 text-sm" onClick={tryUrl} type="button">가져오기</button>
      </div>
      <textarea className="w-full h-32 border p-2 text-sm" placeholder="공고 텍스트 붙여넣기"
        value={text} onChange={(e)=>{setText(e.target.value);onChange(e.target.value);}}/>
    </div>
  );
}
```

- [ ] **Step 4: Sidebar (저장 목록)**

`components/Sidebar.tsx`:
```tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listDocs } from "@/lib/storage";
import type { SavedDoc } from "@/lib/types";
export default function Sidebar() {
  const [docs, setDocs] = useState<SavedDoc[]>([]);
  useEffect(() => setDocs(listDocs()), []);
  return (
    <aside className="w-56 shrink-0 border-r p-3 text-sm">
      <Link href="/" className="font-bold text-accent">+ 새 분석</Link>
      <ul className="mt-3 space-y-1">
        {docs.map(d => <li key={d.id}><Link className="hover:underline" href={`/resume/${d.id}`}>{d.title || d.kind}</Link></li>)}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 5: 홈 페이지 조립**

`app/page.tsx` (스캐폴드 교체):
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import ResumeInput from "@/components/ResumeInput";
import JobPostingInput from "@/components/JobPostingInput";
import MarkdownView from "@/components/MarkdownView";
import Sidebar from "@/components/Sidebar";
import { postStream } from "@/lib/client";
import { setMaster, upsertDoc } from "@/lib/storage";
import type { DocKind, SavedDoc } from "@/lib/types";

export default function Home() {
  const r = useRouter();
  const [resume, setResume] = useState(""); const [kind, setKind] = useState<DocKind>("master");
  const [jd, setJd] = useState(""); const [analysis, setAnalysis] = useState(""); const [busy, setBusy] = useState(false);

  async function analyze() {
    if (!resume || !jd) { alert("이력서와 공고를 모두 입력하세요."); return; }
    setBusy(true); setAnalysis("");
    try {
      if (kind === "master") setMaster(resume);
      await postStream("/api/analyze", { resumeText: resume, jobPosting: jd }, (t)=>setAnalysis(p=>p+t));
    } catch (e) { alert((e as Error).message === "RATE_LIMITED" ? "오늘 사용 한도를 초과했어요." : "분석 실패: " + (e as Error).message); }
    finally { setBusy(false); }
  }
  function toResume() {
    const doc: SavedDoc = { id: nanoid(8), title: `${kind==="master"?"맞춤":"일반"} 이력서`, kind,
      createdAt: new Date().toISOString(), jobPosting: jd, analysis, resumeMd: null, interviewMd: null };
    upsertDoc(doc); r.push(`/resume/${doc.id}`);
  }
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 max-w-3xl space-y-4">
        <h1 className="text-lg font-bold">이력서 분석</h1>
        <ResumeInput onChange={(t,k)=>{setResume(t);setKind(k);}} />
        <JobPostingInput onChange={setJd} />
        <button className="bg-accent text-white px-4 py-2 rounded disabled:opacity-50" onClick={analyze} disabled={busy}>
          {busy ? "분석 중…" : "분석하기"}
        </button>
        {analysis && (
          <section className="border-t pt-4">
            <MarkdownView md={analysis} />
            <button className="mt-3 border border-accent text-accent px-4 py-2 rounded" onClick={toResume}>
              {kind==="master" ? "맞춤 이력서 생성하기 →" : "이 분석으로 작업 화면 열기 →"}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 6: 수동 스모크 + Commit**

Run: `npm run dev`, 브라우저에서 이력서·공고 붙여넣고 [분석하기] → 분석 md 스트리밍 확인 (실 OPENAI_API_KEY 필요).
```bash
git add app components && git commit -m "feat: home analysis flow with sidebar"
```

---

### Task 9: 맞춤 이력서 생성 — 프롬프트 + `/api/generate`

**Files:**
- Create: `lib/prompts/generate.ts`, `app/api/generate/route.ts`, `app/api/generate/route.test.ts`

**Interfaces:**
- Consumes: `streamChat`, `checkAndCount`, `assertWithinLimits`, `getClientIp`.
- Produces:
  - `GENERATE_SYSTEM: string` (출처 `tailored-resume-output` SKILL).
  - `POST /api/generate` body `{ masterResume:string; jobPosting:string; analysis:string }` → 200 text 스트림(이력서 md) | 400 | 429.

- [ ] **Step 1: 생성 프롬프트**

`lib/prompts/generate.ts`:
```ts
export const GENERATE_SYSTEM = `당신은 기업 맞춤형 이력서 작성가입니다. 입력된 마스터 이력서는 "정돈된 최종 문장들의 풀"입니다.
규칙:
- 풀에서 공고에 맞는 경험 2~3개를 선택해 그대로(verbatim) 가져온다. 경험 본문 문장을 다시 쓰지 않는다. 허용: 선택·배치 순서·매칭 키워드 굵게.
- 새로 쓰는 것은 '자기소개(2~3줄)'와 '지원동기(2~3줄)' 둘뿐. 공고 맞춤으로 작성. "회사에 도움" 식 추상 금지, 팀 기여를 구체적으로.
- 풀에 없는 경험·수치를 창작하지 않는다. 비어 있으면 [확인 필요: ...] 유지.
- 경험은 자연스러운 제목 + 라벨 없는 문단/불릿(문제→해결·트레이드오프→결과, 결과는 →로 수치) 형식.

출력(마크다운):
# {이름} — {지원 직무}
## 자기소개
## 지원동기
## 핵심 역량
## 경력 / 프로젝트
## 기술 스택
## 기타`;
```

- [ ] **Step 2: 실패 테스트**

`app/api/generate/route.test.ts`:
```ts
import { beforeEach, expect, test, vi } from "vitest";
vi.mock("@/lib/openai", () => ({
  streamChat: vi.fn(async () => new ReadableStream({ start(c){ c.enqueue(new TextEncoder().encode("# 이력서")); c.close(); } })),
}));
import { POST } from "./route";
import { __reset } from "@/lib/ratelimit";
beforeEach(() => { __reset(); process.env.DAILY_LIMIT = "5"; });
const req = (b: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(b) });

test("200 stream", async () => {
  const res = await POST(req({ masterResume: "m", jobPosting: "j", analysis: "a" }));
  expect(res.status).toBe(200);
  expect(await res.text()).toContain("이력서");
});
test("400 too long", async () => {
  const res = await POST(req({ masterResume: "x".repeat(60001), jobPosting: "j", analysis: "a" }));
  expect(res.status).toBe(400);
});
```

- [ ] **Step 3: 실패 확인 → 구현**

Run: `npx vitest run app/api/generate/route.test.ts` → FAIL, then:

`app/api/generate/route.ts`:
```ts
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
```

- [ ] **Step 4: 통과 + Commit**

Run: `npx vitest run app/api/generate/route.test.ts`
Expected: PASS.
```bash
git add app lib && git commit -m "feat: /api/generate tailored resume"
```

---

### Task 10: 이력서 작업 화면 `/resume/[id]` — 에디터 + 미리보기 + 자동저장 + 생성 트리거

**Files:**
- Create: `app/resume/[id]/page.tsx`, `components/MarkdownEditor.tsx`

**Interfaces:**
- Consumes: storage `getDoc/upsertDoc/getMaster`, `postStream`, `MarkdownView`, `Sidebar`.
- Produces: 화면 — 좌 Sidebar, 중 md 에디터, 우 미리보기. `resumeMd`가 null이고 kind=master면 [맞춤 이력서 생성] 버튼으로 `/api/generate` 스트림→`resumeMd` 채움. 편집은 500ms 디바운스로 `upsertDoc` 자동저장.

- [ ] **Step 1: MarkdownEditor (편집+미리보기 split)**

`components/MarkdownEditor.tsx`:
```tsx
"use client";
import MarkdownView from "./MarkdownView";
export default function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 h-[70vh]">
      <textarea className="border p-3 text-sm font-mono resize-none" value={value} onChange={(e)=>onChange(e.target.value)} />
      <div className="border p-3 overflow-auto"><MarkdownView md={value} /></div>
    </div>
  );
}
```

- [ ] **Step 2: 작업 페이지**

`app/resume/[id]/page.tsx`:
```tsx
"use client";
import { use, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import MarkdownEditor from "@/components/MarkdownEditor";
import { getDoc, upsertDoc, getMaster } from "@/lib/storage";
import { postStream } from "@/lib/client";
import type { SavedDoc } from "@/lib/types";

export default function ResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = useState<SavedDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setDoc(getDoc(id) ?? null); }, [id]);
  function save(next: SavedDoc) {
    setDoc(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => upsertDoc(next), 500);
  }
  async function generate() {
    if (!doc) return;
    const master = getMaster();
    if (!master) { alert("마스터 이력서가 없어요. 홈에서 마스터 이력서로 분석하세요."); return; }
    setBusy(true); let acc = "";
    try {
      await postStream("/api/generate", { masterResume: master.text, jobPosting: doc.jobPosting, analysis: doc.analysis },
        (t)=>{ acc += t; save({ ...doc, resumeMd: acc }); });
    } catch (e) { alert("생성 실패: " + (e as Error).message); }
    finally { setBusy(false); }
  }
  if (!doc) return <div className="p-6">문서를 찾을 수 없어요.</div>;
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <input className="border px-2 py-1 text-sm font-bold" value={doc.title}
            onChange={(e)=>save({ ...doc, title: e.target.value })} />
          {doc.kind === "master" && (
            <button className="bg-accent text-white px-3 py-1 rounded text-sm" onClick={generate} disabled={busy}>
              {busy ? "생성 중…" : doc.resumeMd ? "재생성" : "맞춤 이력서 생성"}
            </button>
          )}
          {/* PDF·면접질문 버튼은 Task 11, 13에서 추가 */}
        </div>
        {doc.resumeMd != null
          ? <MarkdownEditor value={doc.resumeMd} onChange={(v)=>save({ ...doc, resumeMd: v })} />
          : <div className="text-sm text-gray-500">아직 이력서가 없습니다. {doc.kind==="master" ? "[맞춤 이력서 생성]을 누르세요." : "일반 이력서는 분석만 제공합니다."}
              <div className="mt-3 border-t pt-3"><MarkdownEditorless analysis={doc.analysis} /></div></div>}
      </main>
    </div>
  );
}
function MarkdownEditorless({ analysis }: { analysis: string }) {
  const MV = require("@/components/MarkdownView").default;
  return <MV md={analysis} />;
}
```

- [ ] **Step 3: 수동 스모크 + Commit**

Run: `npm run dev` → 홈에서 마스터 분석 → 작업화면 → [맞춤 이력서 생성] → md 스트리밍·편집·자동저장(새로고침 유지) 확인.
```bash
git add app components && git commit -m "feat: resume workspace editor with autosave and generate"
```

---

### Task 11: PDF 출력 (인쇄용 스타일)

**Files:**
- Create: `components/PrintResume.tsx`, `app/print.css`
- Modify: `app/resume/[id]/page.tsx` ([PDF 출력] 버튼 추가), `app/layout.tsx` (print.css import)

**Interfaces:**
- Consumes: `doc.resumeMd`.
- Produces: `[PDF 출력]` 클릭 → 숨겨진 인쇄 영역을 렌더하고 `window.print()`. @media print에서 인쇄 영역만 A4로 출력(파란 강조·결과줄 스타일).

- [ ] **Step 1: print.css**

`app/print.css`:
```css
.print-area { display: none; }
@media print {
  body * { visibility: hidden; }
  .print-area, .print-area * { visibility: visible; }
  .print-area { display: block; position: absolute; inset: 0; padding: 12mm; }
  @page { size: A4; margin: 12mm; }
  .print-area h1 { font-size: 20pt; }
  .print-area h2 { color: #16478f; border-bottom: 1px solid #ddd; font-size: 13pt; margin-top: 14px; }
  .print-area strong { color: #1a1a1a; }
  .print-area :is(h1,h2,h3,li,p) { page-break-inside: avoid; }
}
```
Modify `app/layout.tsx`: `import "./print.css";` 추가.

- [ ] **Step 2: PrintResume 컴포넌트**

`components/PrintResume.tsx`:
```tsx
"use client";
import MarkdownView from "./MarkdownView";
export default function PrintResume({ md }: { md: string }) {
  return <div className="print-area"><MarkdownView md={md} /></div>;
}
```

- [ ] **Step 3: 버튼 + 렌더 연결**

Modify `app/resume/[id]/page.tsx`:
- import `PrintResume`.
- 버튼 영역에 추가(resumeMd 있을 때만):
```tsx
{doc.resumeMd && <button className="border px-3 py-1 rounded text-sm" onClick={()=>window.print()}>PDF 출력</button>}
```
- main 하단에 인쇄 영역 추가:
```tsx
{doc.resumeMd && <PrintResume md={doc.resumeMd} />}
```

- [ ] **Step 4: 수동 스모크 + Commit**

Run: `npm run dev` → 이력서 화면에서 [PDF 출력] → 인쇄 미리보기에 이력서만 A4로 나오는지 확인 → PDF로 저장.
```bash
git add app components && git commit -m "feat: pdf export via print stylesheet"
```

---

### Task 12: 면접질문 — 프롬프트 + `/api/interview`

**Files:**
- Create: `lib/prompts/interview.ts`, `app/api/interview/route.ts`, `app/api/interview/route.test.ts`

**Interfaces:**
- Consumes: `streamChat`, `checkAndCount`, `assertWithinLimits`, `getClientIp`.
- Produces:
  - `INTERVIEW_SYSTEM: string` (출처 `interview-questions` SKILL).
  - `POST /api/interview` body `{ resumeText:string }` → 200 text 스트림 | 400 | 429.

- [ ] **Step 1: 프롬프트**

`lib/prompts/interview.ts`:
```ts
export const INTERVIEW_SYSTEM = `당신은 까다로운 기술 면접관입니다. 입력된 이력서만 근거로 면접 예상 질문을 만드세요.
규칙: 인성/기술 구분. 기술 질문은 이력서의 주요 경험(2~3개)마다 [핵심 질문 1개 → 꼬리질문 5개 → 각 꼬리당 추가 꼬리 2개] 트리. 기술적 깊이(선택 근거·트레이드오프·실패 경계·규모 한계·수치 검증)로 파고든다. [확인 필요]로 빈 수치를 정조준한 질문을 우선한다. 없는 기술을 가정해 묻지 않는다.

출력(마크다운):
## 인성 나올만한 질문
- 질문 (+ 짧은 후속 1개)
## 기술 나올만한 질문
### 경험 N: {제목}
**핵심 질문:** ...
1. **꼬리질문:** ...
   - (추가) ...
   - (추가) ...
(꼬리 5개, 각 추가 2개)`;
```

- [ ] **Step 2: 실패 테스트**

`app/api/interview/route.test.ts`:
```ts
import { beforeEach, expect, test, vi } from "vitest";
vi.mock("@/lib/openai", () => ({
  streamChat: vi.fn(async () => new ReadableStream({ start(c){ c.enqueue(new TextEncoder().encode("## 인성")); c.close(); } })),
}));
import { POST } from "./route";
import { __reset } from "@/lib/ratelimit";
beforeEach(() => { __reset(); process.env.DAILY_LIMIT = "5"; });
test("200 stream", async () => {
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ resumeText: "r" }) }));
  expect(res.status).toBe(200);
  expect(await res.text()).toContain("인성");
});
```

- [ ] **Step 3: 실패 확인 → 구현**

Run: `npx vitest run app/api/interview/route.test.ts` → FAIL, then:

`app/api/interview/route.ts`:
```ts
import { streamChat } from "@/lib/openai";
import { INTERVIEW_SYSTEM } from "@/lib/prompts/interview";
import { checkAndCount } from "@/lib/ratelimit";
import { assertWithinLimits } from "@/lib/validate";
import { getClientIp } from "@/lib/http";

export async function POST(req: Request) {
  const { resumeText } = await req.json();
  try { assertWithinLimits({ resumeText }); }
  catch { return new Response("INPUT_TOO_LONG", { status: 400 }); }
  if (!checkAndCount(getClientIp(req)).ok) return new Response("RATE_LIMITED", { status: 429 });
  const stream = await streamChat(INTERVIEW_SYSTEM, `[이력서]\n${resumeText}`);
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
```

- [ ] **Step 4: 통과 + Commit**

Run: `npx vitest run app/api/interview/route.test.ts`
Expected: PASS.
```bash
git add app lib && git commit -m "feat: /api/interview questions"
```

---

### Task 13: 면접질문 화면 연결

**Files:**
- Modify: `app/resume/[id]/page.tsx` ([면접질문 추출] 버튼 + 결과 표시)

**Interfaces:**
- Consumes: `postStream`, storage `upsertDoc`, `doc.resumeMd ?? doc.analysis`, `MarkdownView`.
- Produces: [면접질문 추출] 클릭 → `/api/interview`(resumeText = resumeMd 있으면 그것, 없으면 일반 이력서 원문/분석 대상 텍스트) 스트림 → `interviewMd` 저장·표시. 마스터=생성 이력서, 일반=업로드 원문.

> 일반 이력서는 `resumeMd`가 없으므로 원문 텍스트가 필요하다. Task 8에서 일반 분석 시 원문을 `doc`에 보관하도록 보강: `SavedDoc`에 사용한 이력서 원문이 없으면 면접질문 대상이 없다. **이 Task에서 `SavedDoc`에 `sourceResume:string` 필드를 추가**(타입·storage 무관, 단순 추가)하고 홈에서 분석 시 `sourceResume: resume`를 저장한다.

- [ ] **Step 1: 타입 보강**

Modify `lib/types.ts`: `SavedDoc`에 `sourceResume: string;` 추가.
Modify `app/page.tsx` `toResume()`의 doc 생성에 `sourceResume: resume` 추가.

- [ ] **Step 2: 버튼 + 결과**

Modify `app/resume/[id]/page.tsx`:
- 상태 추가: 면접질문은 `doc.interviewMd`.
- 버튼(항상 노출):
```tsx
<button className="border px-3 py-1 rounded text-sm" onClick={interview} disabled={busy}>면접질문 추출</button>
```
- 함수:
```tsx
async function interview() {
  if (!doc) return;
  const text = doc.resumeMd || doc.sourceResume;
  if (!text) { alert("이력서 텍스트가 없어요."); return; }
  setBusy(true); let acc = "";
  try { await postStream("/api/interview", { resumeText: text }, (t)=>{ acc += t; save({ ...doc, interviewMd: acc }); }); }
  catch (e) { alert("추출 실패: " + (e as Error).message); }
  finally { setBusy(false); }
}
```
- 결과 표시(에디터 아래):
```tsx
{doc.interviewMd && <section className="mt-4 border-t pt-3"><h2 className="font-bold mb-2">면접 예상 질문</h2><MarkdownView md={doc.interviewMd} /></section>}
```

- [ ] **Step 3: 수동 스모크 + Commit**

Run: `npm run dev` → 이력서 화면 [면접질문 추출] → 인성/기술 트리 스트리밍·저장 확인. 일반 이력서 문서에서도 동작 확인.
```bash
git add app lib components && git commit -m "feat: interview question extraction in workspace"
```

---

### Task 14: (선택) 공유 비밀번호 게이트

**Files:**
- Create: `middleware.ts`, `app/gate/page.tsx`

**Interfaces:**
- Produces: `APP_PASSWORD`가 설정된 경우에만 작동. 쿠키 `app_auth`가 없으면 `/gate`로 리다이렉트. `/gate`에서 비밀번호 맞으면 쿠키 설정.

- [ ] **Step 1: middleware**

`middleware.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
export function middleware(req: NextRequest) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/gate") || req.nextUrl.pathname.startsWith("/api/gate")) return NextResponse.next();
  if (req.cookies.get("app_auth")?.value === pw) return NextResponse.next();
  return NextResponse.redirect(new URL("/gate", req.url));
}
export const config = { matcher: ["/((?!_next|favicon).*)"] };
```

- [ ] **Step 2: gate 페이지 + API**

`app/gate/page.tsx`:
```tsx
"use client";
import { useState } from "react";
export default function Gate() {
  const [pw, setPw] = useState("");
  async function submit() {
    const res = await fetch("/api/gate", { method: "POST", body: JSON.stringify({ pw }) });
    if (res.ok) location.href = "/"; else alert("비밀번호가 틀렸어요.");
  }
  return <main className="p-8 space-y-2"><input type="password" className="border p-2" value={pw} onChange={(e)=>setPw(e.target.value)} />
    <button className="border px-3 py-2 ml-2" onClick={submit}>입장</button></main>;
}
```
`app/api/gate/route.ts`:
```ts
export async function POST(req: Request) {
  const { pw } = await req.json();
  if (pw && pw === process.env.APP_PASSWORD) {
    return new Response("OK", { headers: { "set-cookie": `app_auth=${pw}; Path=/; HttpOnly; SameSite=Lax` } });
  }
  return new Response("NO", { status: 401 });
}
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts app && git commit -m "feat: optional shared password gate"
```

---

### Task 15: 최종 점검 — 전체 테스트 + README

**Files:**
- Create: `README.md`

**Interfaces:** —

- [ ] **Step 1: 전체 단위 테스트**

Run: `npm test`
Expected: 모든 테스트 PASS.

- [ ] **Step 2: 빌드**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 3: README**

`README.md`:
```markdown
# 이력서 웹앱
채용공고+이력서 분석 → 마스터 이력서 맞춤 생성 → 편집·PDF → 면접질문.

## 실행
1. `cp .env.local.example .env.local` 후 `OPENAI_API_KEY` 입력
2. `npm install`
3. `npm run dev` → http://localhost:3000

## 환경변수
- `OPENAI_API_KEY` (필수), `OPENAI_MODEL`(기본 gpt-4o)
- `DAILY_LIMIT`(IP당 일일 호출, 기본 30)
- `APP_PASSWORD`(설정 시 비밀번호 게이트 활성)

DB 없음 — 작업물은 브라우저 localStorage에 저장됩니다.
```

- [ ] **Step 4: Commit**

```bash
git add README.md && git commit -m "docs: add README"
```

---

## Self-Review

**Spec coverage 점검:**
- §3 화면(홈/resume[id]) → Task 8, 10 ✅
- §4 데이터모델(localStorage) → Task 1 (+ §13 sourceResume 보강) ✅
- §5 마스터/일반 분기 → Task 8(종류 선택), 10(마스터만 생성), 13(둘 다 면접) ✅
- §6 API 3개 + extract-pdf + fetch-job → Task 4,5,6,9,12 ✅
- §7 편집기·PDF → Task 10, 11 ✅
- §8 방어(IP제한·입력상한·비밀번호) → Task 2, 14 ✅
- §9 에러처리 → 각 라우트 400/429/422 + UI alert (Task 5,6,8,10,13) ✅
- §10 테스트 → 각 lib/route 단위 테스트 ✅
- §12 구현 순서(분석→생성/편집/PDF→면접) → Task 4·8 → 9·10·11 → 12·13 ✅

**Placeholder scan:** 모든 코드 스텝에 실제 코드 포함. "적절히 처리" 류 없음. ✅

**Type consistency:** `SavedDoc`(Task1 정의, Task13에서 `sourceResume` 추가), `streamChat`/`postStream`/`checkAndCount`/`assertWithinLimits` 시그니처가 소비처와 일치. `getClientIp` 일관. ✅

**알려진 한정:** 인메모리 rate limit은 서버 재시작·다중 인스턴스에서 리셋됨(스펙 §8에 명시된 소규모 가정과 일치). UI 컴포넌트는 단위 테스트 대신 수동 스모크(스펙 §10의 "수동 스모크" 항목과 일치).
