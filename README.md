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
