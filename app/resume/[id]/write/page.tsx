"use client";
import { use, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DocHeader from "@/components/DocHeader";
import MarkdownEditor from "@/components/MarkdownEditor";
import MarkdownView from "@/components/MarkdownView";
import PrintResume from "@/components/PrintResume";
import { useUI } from "@/components/UIProvider";
import { useDoc } from "@/lib/useDoc";
import { getMaster } from "@/lib/storage";
import { postStream } from "@/lib/client";

const SEP = "===SELECTION_REASON===";
// 스트림을 이력서 본문과 선택 이유로 분리. 구분자가 토막나 들어와도 깜빡임 없이 처리.
function splitReason(acc: string): { resume: string; reason: string | null } {
  const idx = acc.indexOf(SEP);
  if (idx !== -1) return { resume: acc.slice(0, idx).trimEnd(), reason: acc.slice(idx + SEP.length).replace(/^\s+/, "") };
  for (let n = Math.min(SEP.length - 1, acc.length); n > 0; n--) {
    if (acc.endsWith(SEP.slice(0, n))) return { resume: acc.slice(0, acc.length - n), reason: null };
  }
  return { resume: acc, reason: null };
}

export default function WritePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ui = useUI();
  const { doc, save, saveState } = useDoc(id);
  const [busy, setBusy] = useState(false);

  async function interview() {
    if (!doc) return;
    const text = doc.resumeMd || doc.sourceResume;
    if (!text) { ui.toast("이력서 텍스트가 없어요.", "error"); return; }
    setBusy(true); let acc = "";
    try { await postStream("/api/interview", { resumeText: text }, (t) => { acc += t; save({ ...doc, interviewMd: acc }); }); }
    catch (e) { ui.toast("면접질문 추출 실패: " + (e as Error).message, "error"); }
    finally { setBusy(false); }
  }

  async function generate() {
    if (!doc) return;
    if (doc.resumeMd && !(await ui.confirm("기존에 작성·편집한 이력서 내용이 새 결과로 덮어쓰여요.\n계속할까요?"))) return;
    const master = getMaster();
    if (!master) { ui.toast("마스터 이력서가 없어요. 홈에서 마스터 이력서로 분석하세요.", "error"); return; }
    setBusy(true); let acc = "";
    try {
      await postStream(
        "/api/generate",
        { masterResume: master.text, jobPosting: doc.jobPosting, analysis: doc.analysis },
        (t) => { acc += t; const { resume, reason } = splitReason(acc); save({ ...doc, resumeMd: resume, selectionReason: reason }); }
      );
    } catch (e) { ui.toast("생성 실패: " + (e as Error).message, "error"); }
    finally { setBusy(false); }
  }

  if (doc === undefined) return <div className="p-8 text-sm text-gray-400">불러오는 중…</div>;
  if (!doc) return (
    <div className="p-8 space-y-3">
      <p className="text-gray-600">문서를 찾을 수 없어요.</p>
      <Link href="/" className="btn btn-outline-accent">← 새 분석으로 이동</Link>
    </div>
  );

  const generating = busy && doc.resumeMd == null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 max-w-5xl space-y-4">
        <DocHeader doc={doc} onTitle={(v) => save({ ...doc, title: v })} saveState={saveState} />

        <div className="flex flex-wrap items-center gap-2">
          {doc.kind === "master" && (
            <button className="btn btn-primary btn-sm" onClick={generate} disabled={busy}>
              {busy ? "생성 중…" : doc.resumeMd ? "맞춤 이력서 재생성" : "맞춤 이력서 생성"}
            </button>
          )}
          {(doc.resumeMd || doc.sourceResume) && (
            <button className="btn btn-ghost btn-sm" onClick={interview} disabled={busy}>면접질문 추출</button>
          )}
          {doc.resumeMd && (
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>PDF 출력</button>
          )}
        </div>

        {generating && (
          <div className="card space-y-2 animate-pulse" aria-hidden>
            <p className="text-sm text-gray-400">맞춤 이력서를 작성하는 중…</p>
            <div className="h-3 w-2/3 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-5/6 rounded bg-gray-200" />
          </div>
        )}

        {doc.resumeMd != null
          ? <MarkdownEditor value={doc.resumeMd} onChange={(v) => save({ ...doc, resumeMd: v })} />
          : !generating && (
            <div className="card text-sm text-gray-500">
              {doc.kind === "master" ? (
                <>위의 [맞춤 이력서 생성]을 눌러 작성을 시작하세요.</>
              ) : (
                <>일반 이력서는 분석만 제공합니다.{" "}
                  <Link href={`/resume/${doc.id}`} className="text-accent hover:underline">← 분석 페이지로</Link>
                </>
              )}
            </div>
          )}
        {doc.resumeMd && <PrintResume md={doc.resumeMd} />}
        {doc.selectionReason && (
          <section className="card border-accent/30">
            <h2 className="mb-2">이 경험을 선택한 이유</h2>
            <p className="help mb-2">공고 요건과 마스터 이력서를 매칭해 위 경험을 고른 근거예요. (이력서/PDF에는 포함되지 않아요)</p>
            <MarkdownView md={doc.selectionReason} />
          </section>
        )}
        {doc.interviewMd && (
          <section className="card">
            <h2 className="mb-2">면접 예상 질문</h2>
            <MarkdownView md={doc.interviewMd} />
          </section>
        )}
      </main>
    </div>
  );
}
