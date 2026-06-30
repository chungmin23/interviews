"use client";
import { use, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DocHeader from "@/components/DocHeader";
import MarkdownView from "@/components/MarkdownView";
import { useUI } from "@/components/UIProvider";
import { useDoc } from "@/lib/useDoc";
import { postStream } from "@/lib/client";

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ui = useUI();
  const { doc, save, saveState } = useDoc(id);
  const [busy, setBusy] = useState(false);

  async function interview() {
    if (!doc) return;
    const text = doc.resumeMd || doc.sourceResume;
    if (!text) { ui.toast("이력서 텍스트가 없어요. 먼저 이력서를 작성하세요.", "error"); return; }
    setBusy(true); let acc = "";
    try { await postStream("/api/interview", { resumeText: text }, (t) => { acc += t; save({ ...doc, interviewMd: acc }); }); }
    catch (e) { ui.toast("면접질문 추출 실패: " + (e as Error).message, "error"); }
    finally { setBusy(false); }
  }

  if (doc === undefined) return <div className="p-8 text-sm text-gray-400">불러오는 중…</div>;
  if (!doc) return (
    <div className="p-8 space-y-3">
      <p className="text-gray-600">문서를 찾을 수 없어요.</p>
      <Link href="/" className="btn btn-outline-accent">← 새 분석으로 이동</Link>
    </div>
  );

  const hasSource = !!(doc.resumeMd || doc.sourceResume);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 max-w-3xl space-y-4">
        <DocHeader doc={doc} onTitle={(v) => save({ ...doc, title: v })} saveState={saveState} />

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary btn-sm" onClick={interview} disabled={busy || !hasSource}>
            {busy ? "추출 중…" : doc.interviewMd ? "면접질문 재추출" : "면접질문 추출"}
          </button>
        </div>

        {busy && !doc.interviewMd && (
          <div className="card space-y-2 animate-pulse" aria-hidden>
            <p className="text-sm text-gray-400">예상 질문을 만드는 중…</p>
            <div className="h-3 w-2/3 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-5/6 rounded bg-gray-200" />
          </div>
        )}

        {doc.interviewMd ? (
          <section className="card">
            <h2 className="mb-2">면접 예상 질문</h2>
            <MarkdownView md={doc.interviewMd} />
          </section>
        ) : !busy && (
          <div className="card text-sm text-gray-500">
            {hasSource
              ? "[면접질문 추출]을 눌러 이 이력서로 나올 예상 질문(인성/기술)을 만들어요."
              : <>이력서가 없어요. 먼저 <Link href={`/resume/${doc.id}/write`} className="text-accent hover:underline">2. 이력서 작성</Link>에서 생성하세요.</>}
          </div>
        )}
      </main>
    </div>
  );
}
