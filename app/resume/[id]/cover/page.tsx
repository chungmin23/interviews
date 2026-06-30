"use client";
import { use, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DocHeader from "@/components/DocHeader";
import MarkdownEditor from "@/components/MarkdownEditor";
import { useUI } from "@/components/UIProvider";
import { useDoc } from "@/lib/useDoc";
import { getMaster } from "@/lib/storage";
import { postStream } from "@/lib/client";
import { copyText, downloadText, safeFilename } from "@/lib/download";

export default function CoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ui = useUI();
  const { doc, save, saveState } = useDoc(id);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [charLimit, setCharLimit] = useState("");

  async function generate() {
    if (!doc) return;
    if (doc.coverMd && !(await ui.confirm("기존 자소서 내용이 새 결과로 덮어쓰여요.\n계속할까요?"))) return;
    const resume = getMaster()?.text || doc.sourceResume;
    if (!resume) { ui.toast("이력서가 없어요. 내 이력서에서 마스터를 저장하세요.", "error"); return; }
    setBusy(true); let acc = "";
    try {
      await postStream(
        "/api/cover",
        { masterResume: resume, jobPosting: doc.jobPosting, analysis: doc.analysis, prompt: prompt.trim() || undefined, charLimit: charLimit.trim() || undefined },
        (t) => { acc += t; save({ ...doc, coverMd: acc }); }
      );
    } catch (e) {
      ui.toast((e as Error).message === "RATE_LIMITED" ? "오늘 사용 한도를 초과했어요." : "생성 실패: " + (e as Error).message, "error");
    } finally { setBusy(false); }
  }

  if (doc === undefined) return <div className="p-8 text-sm text-gray-400">불러오는 중…</div>;
  if (!doc) return (
    <div className="p-8 space-y-3">
      <p className="text-gray-600">문서를 찾을 수 없어요.</p>
      <Link href="/" className="btn btn-outline-accent">← 새 분석으로 이동</Link>
    </div>
  );

  const generating = busy && doc.coverMd == null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 max-w-5xl space-y-4">
        <DocHeader doc={doc} onTitle={(v) => save({ ...doc, title: v })} saveState={saveState} />

        <div className="card space-y-3">
          <p className="label">자기소개서</p>
          <p className="help">문항이 있으면 붙여넣으세요. 비우면 일반 자기소개서(강점→핵심 경험→성장→목표)를 생성합니다.</p>
          <textarea
            className="field h-24 resize-y"
            placeholder="자소서 문항(선택) — 예: 지원 동기와 입사 후 포부를 작성하세요"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            aria-label="자소서 문항"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="field w-40"
              type="number"
              placeholder="글자수(선택)"
              value={charLimit}
              onChange={(e) => setCharLimit(e.target.value)}
              aria-label="글자수 목표"
            />
            <button className="btn btn-primary btn-sm" onClick={generate} disabled={busy}>
              {busy ? "생성 중…" : doc.coverMd ? "자소서 재생성" : "자소서 생성"}
            </button>
            {doc.coverMd && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={async () => { if (await copyText(doc.coverMd!)) ui.toast("복사했어요.", "success"); else ui.toast("복사 실패", "error"); }}>복사</button>
                <button className="btn btn-ghost btn-sm" onClick={() => downloadText(`${safeFilename(doc.title)}_자소서.md`, doc.coverMd!)}>.md 다운로드</button>
              </>
            )}
          </div>
        </div>

        {generating && (
          <div className="card space-y-2 animate-pulse" aria-hidden>
            <p className="text-sm text-gray-400">자기소개서를 작성하는 중…</p>
            <div className="h-3 w-2/3 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-5/6 rounded bg-gray-200" />
          </div>
        )}

        {doc.coverMd != null
          ? <MarkdownEditor value={doc.coverMd} onChange={(v) => save({ ...doc, coverMd: v })} />
          : !generating && (
            <div className="card text-sm text-gray-500">위의 [자소서 생성]을 눌러 작성을 시작하세요.</div>
          )}
      </main>
    </div>
  );
}
