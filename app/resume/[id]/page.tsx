"use client";
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DocHeader from "@/components/DocHeader";
import MarkdownView from "@/components/MarkdownView";
import { useUI } from "@/components/UIProvider";
import { useDoc } from "@/lib/useDoc";
import { postStream } from "@/lib/client";

export default function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ui = useUI();
  const { doc, save, saveState } = useDoc(id);
  const [busy, setBusy] = useState(false);
  const autorunRef = useRef(false);

  async function runAnalysis(skipConfirm = false) {
    if (!doc) return;
    if (!doc.sourceResume || !doc.jobPosting) { ui.toast("원본 이력서·공고가 없어 분석할 수 없어요.", "error"); return; }
    if (!skipConfirm && doc.analysis && !(await ui.confirm("기존 분석 결과를 새로 생성한 결과로 대체해요.\n계속할까요?"))) return;
    setBusy(true); let acc = "";
    try {
      await postStream(
        "/api/analyze",
        { resumeText: doc.sourceResume, jobPosting: doc.jobPosting },
        (t) => { acc += t; save({ ...doc, analysis: acc }); }
      );
    } catch (e) {
      ui.toast((e as Error).message === "RATE_LIMITED" ? "오늘 사용 한도를 초과했어요." : "분석 실패: " + (e as Error).message, "error");
    } finally { setBusy(false); }
  }

  // 홈에서 "분석하기"로 넘어온 경우 자동 실행
  useEffect(() => {
    if (!doc || autorunRef.current) return;
    if (typeof window !== "undefined" && sessionStorage.getItem(`run-${doc.id}`) === "1") {
      sessionStorage.removeItem(`run-${doc.id}`);
      autorunRef.current = true;
      if (!doc.analysis) runAnalysis(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  if (doc === undefined) return <div className="p-8 text-sm text-gray-400">불러오는 중…</div>;
  if (!doc) return (
    <div className="p-8 space-y-3">
      <p className="text-gray-600">문서를 찾을 수 없어요.</p>
      <Link href="/" className="btn btn-outline-accent">← 새 분석으로 이동</Link>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 max-w-3xl space-y-4">
        <DocHeader doc={doc} onTitle={(v) => save({ ...doc, title: v })} saveState={saveState} />

        <section className="card">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2>분석 결과</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => runAnalysis()} disabled={busy}>
              {busy ? "분석 중…" : doc.analysis ? "재분석" : "분석하기"}
            </button>
          </div>
          {busy && !doc.analysis ? (
            <div className="space-y-2 animate-pulse" aria-hidden>
              <p className="text-sm text-gray-400">AI가 분석 중…</p>
              <div className="h-3 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-full rounded bg-gray-200" />
              <div className="h-3 w-5/6 rounded bg-gray-200" />
            </div>
          ) : doc.analysis ? (
            <MarkdownView md={doc.analysis} />
          ) : (
            <p className="text-sm text-gray-500">분석 결과가 없습니다. [분석하기]를 눌러 생성하세요.</p>
          )}
        </section>

        {doc.jobPosting && (
          <details className="card">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">채용공고 원문 보기</summary>
            <pre className="mt-3 whitespace-pre-wrap text-xs text-gray-600">{doc.jobPosting}</pre>
          </details>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {doc.kind === "master" ? (
            <Link href={`/resume/${doc.id}/write`} className="btn btn-primary">
              맞춤 이력서 작성하러 가기 →
            </Link>
          ) : (
            <p className="help">일반 이력서는 분석만 제공돼요.</p>
          )}
        </div>
      </main>
    </div>
  );
}
