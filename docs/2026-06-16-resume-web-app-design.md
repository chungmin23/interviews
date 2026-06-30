# 이력서 웹앱 설계 (resume-web-app)

작성일: 2026-06-16

## 1. 개요 / 목표

이력서 하네스(분석·맞춤 이력서·면접질문)의 기능을 **웹사이트**로 제공한다. 채용공고와 이력서를 입력하면 서류 검토자 시선의 분석을 보여주고, 마스터 이력서의 경우 공고 맞춤 이력서를 생성·편집·PDF 출력하며, 면접 예상 질문을 추출한다.

**핵심 제약**
- **DB 없음.** 모든 상태는 브라우저 localStorage.
- **OpenAI(ChatGPT) API 사용.** 키는 서버에서만 사용(클라이언트 노출 금지).
- **배포 + 운영자 키 부담(C모드).** 비용/악용 방어 필요.

## 2. 스택

- Next.js (App Router) + TypeScript — UI와 API 라우트 통합, 서버 라우트가 키를 은닉.
- OpenAI API — 서버 라우트 전용. 기본 모델 `gpt-4o`, `OPENAI_MODEL` 환경변수로 교체 가능. 긴 출력은 스트리밍.
- 상태: localStorage (저장 문서 목록 + 마스터 이력서 원본).
- PDF 입력: 서버에서 `pdf-parse`류로 텍스트 추출.
- PDF 출력: md→HTML(리치 스타일 CSS)→브라우저 인쇄(window.print + @media print).
- 스타일: Tailwind.

## 3. 화면 (워크스페이스형, 라우트 2개)

```
/                      홈: 업로드·공고·분석
  - 이력서 입력: md/텍스트 붙여넣기 | PDF 업로드
  - 이력서 종류: [마스터 이력서] / [일반 이력서]
  - 채용공고: 링크 | 텍스트
  - [분석하기] → reviewer-simulation 결과
       · (마스터) [맞춤 이력서 생성] 버튼 → /resume/[id]
       · (일반)  적합도 분석만 표시

/resume/[id]           이력서 작업 화면 (localStorage 한 건)
  - 좌: 저장된 이력서 목록(사이드바)
  - 중: md 에디터 (자기소개·지원동기·경력 포함)
  - 우: 실시간 미리보기
  - 상단: [PDF 출력] [면접질문 추출]
```

전역 레이아웃: 좌측 사이드바에 저장 문서 목록(localStorage).

## 4. 데이터 모델 (localStorage)

```ts
// key: "resume-app:documents"
type SavedDoc = {
  id: string;                  // nanoid
  title: string;
  kind: "master" | "general";
  createdAt: string;
  jobPosting: string;          // 분석에 쓴 공고 원문
  analysis: string;            // reviewer-simulation 결과(md)
  resumeMd: string | null;     // 생성/편집 이력서 md (마스터; 일반은 null 가능)
  interviewMd: string | null;  // 면접질문 캐시
};

// key: "resume-app:masterResume"  ← 마스터 이력서 원본 1건(재사용)
type MasterResume = { text: string; updatedAt: string };
```

- 마스터 이력서는 한 번 올리면 재사용(별도 key). 공고만 바꿔 여러 맞춤 이력서 생성.
- 작업 결과는 `documents` 배열에 누적 → 사이드바 목록.

## 5. 마스터/일반 분기 동작

| 구분 | 입력 | 분석 | 이력서 생성 | 편집·PDF | 면접질문 |
|------|------|------|------------|----------|---------|
| 마스터 이력서 | 마스터 md/PDF + 공고 | reviewer-simulation | ✅ 공고 매칭 2~3개 선택·배치 + 자기소개·지원동기 생성 | ✅ | ✅ |
| 일반 이력서 | 일반 이력서 md/PDF + 공고 | reviewer-simulation | ❌ 적합도 확인만 | — | ✅(원하면) |

- 마스터 생성 = 하네스 `tailored-resume-output` 로직 이식: 풀에서 선택·삽입(경험 본문 불변) + 자기소개·지원동기 각 2~3줄 맞춤 생성. 추상표현·창작 금지, `[확인 필요]` 유지.
- 일반 = reviewer-simulation 분석(6단계 + 강점/우려/개선 표)만.
- 면접질문은 이력서가 있는 화면에서 추출(마스터=생성 이력서, 일반=올린 원문).

## 6. API 라우트 (스킬 → OpenAI 프롬프트 이식)

스킬 본문(마크다운 지시서)을 OpenAI system 프롬프트로 이식한다. 프롬프트 원문은 `lib/prompts/*.ts` 상수로 두고 하네스 스킬과 1:1 대응(동기화 주석 포함).

- **POST `/api/analyze`** ← `resume-reviewer-simulation`
  - in `{ resumeText, jobPosting }` → out 분석 md(스트리밍)
  - 규칙: 제공 텍스트만 근거, 점수·등급·이모지 금지, 6단계 + 강점/우려/개선 표, 근거→해석, "확인 필요" 표기.
- **POST `/api/generate`** ← `tailored-resume-output` (마스터 전용)
  - in `{ masterResume, jobPosting, analysis }` → out 이력서 md
  - 규칙: 매칭 2~3개 선택·삽입(본문 불변), 자기소개·지원동기 각 2~3줄 맞춤 생성, 추상표현·창작 금지, `[확인 필요]` 유지.
- **POST `/api/interview`** ← `interview-questions`
  - in `{ resumeText }` → out 면접질문 md
  - 규칙: 인성/기술 구분, 기술은 경험별 핵심 1 → 꼬리 5 → 각 추가 2 트리, 깊이(선택 근거·트레이드오프·실패 경계·규모·수치 검증).
- **POST `/api/extract-pdf`** → PDF 텍스트 추출.
- **POST `/api/fetch-job`** → 공고 링크 서버 fetch 시도, 실패 시 "텍스트로 붙여넣어 주세요" 반환.

## 7. 편집기 · PDF 출력

- 편집기: md 텍스트 편집(좌) + 실시간 미리보기(우, react-markdown). 변경은 localStorage 디바운스 자동 저장. `[확인 필요]`는 미리보기에서 빨갛게 강조.
- PDF: md→HTML(하네스 `resume-template.html` 리치 스타일 CSS 재사용: 회사명·서비스 파랑, 성과 제목 굵게, 파란 결과줄)→브라우저 인쇄(@media print, A4, page-break-inside:avoid). 서버 의존성 0.

## 8. 비용 / 악용 방어 (C모드)

- IP당 일일 호출 제한 — 서버 인메모리 카운터(재시작 시 리셋, 소규모엔 충분).
- 입력 길이 상한 — 공고·이력서 글자수 제한으로 토큰 폭주 방지.
- 모델 비용 가드 — `max_tokens` 상한, 스트리밍 중단 가능.
- (옵션, 기본 off) 공유 비밀번호 게이트 — 환경변수로 켜면 아는 사람만 사용.

## 9. 에러 처리

- 공고 링크 fetch 실패 → 텍스트 붙여넣기 안내(추측 분석 금지).
- OpenAI 실패/타임아웃 → 1회 재시도 후 에러 표시(입력은 localStorage 보존).
- PDF 텍스트 추출 실패(스캔 이미지) → md/텍스트 붙여넣기 폴백.
- 일일 제한 초과 → 안내.
- localStorage 용량 초과 → 오래된 문서 정리 안내.

## 10. 테스트

- API 라우트 단위 테스트(모킹된 OpenAI 응답으로 파싱·분기 검증).
- 마스터/일반 분기 로직 단위 테스트.
- 핵심 플로우 1개 E2E(업로드→분석→생성→편집→PDF 버튼 노출).
- 실제 OpenAI 호출은 수동 스모크 테스트.

## 11. 폴더 구조

```
resume-web-app/
├─ app/
│  ├─ page.tsx                 # 홈: 업로드·공고·분석
│  ├─ resume/[id]/page.tsx     # 편집·PDF·면접질문
│  └─ api/
│     ├─ analyze/route.ts
│     ├─ generate/route.ts
│     ├─ interview/route.ts
│     ├─ extract-pdf/route.ts
│     └─ fetch-job/route.ts
├─ lib/
│  ├─ prompts/                 # 스킬 이식 프롬프트
│  ├─ openai.ts                # OpenAI 클라이언트(서버 전용)
│  ├─ storage.ts               # localStorage 헬퍼
│  └─ ratelimit.ts             # IP 인메모리 제한
├─ components/
├─ docs/
├─ .env.local                  # OPENAI_API_KEY
└─ package.json
```

## 12. 구현 순서 (단계)

1. **분석** — analyze API + 홈 화면(업로드·공고·종류 선택) + 분석 결과 뷰.
2. **맞춤 이력서 + 편집·PDF** — generate API(마스터) + /resume/[id] 에디터·미리보기·PDF 출력.
3. **면접질문** — interview API + 버튼·결과 뷰.

각 단계 후 동작 확인.

## 13. 범위 밖 (YAGNI)

- 로그인/계정/서버 DB, 결제, 다국어, 협업, 버전 관리.
- CATS 피드백(resume-jd-feedback) — v1은 reviewer-simulation 분석만.
- 자동 PDF 서버 렌더(Puppeteer) — 브라우저 인쇄로 충분.
