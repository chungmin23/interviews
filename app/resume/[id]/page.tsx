"use client";
import { use, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import MarkdownEditor from "@/components/MarkdownEditor";
import MarkdownView from "@/components/MarkdownView";
import { getDoc, upsertDoc, getMaster } from "@/lib/storage";
import { postStream } from "@/lib/client";
import type { SavedDoc } from "@/lib/types";

export default function ResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = useState<SavedDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
      await postStream(
        "/api/generate",
        { masterResume: master.text, jobPosting: doc.jobPosting, analysis: doc.analysis },
        (t) => { acc += t; save({ ...doc, resumeMd: acc }); }
      );
    } catch (e) { alert("생성 실패: " + (e as Error).message); }
    finally { setBusy(false); }
  }

  if (!doc) return <div className="p-6">문서를 찾을 수 없어요.</div>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <input
            className="border px-2 py-1 text-sm font-bold"
            value={doc.title}
            onChange={(e) => save({ ...doc, title: e.target.value })}
          />
          {doc.kind === "master" && (
            <button
              className="bg-accent text-white px-3 py-1 rounded text-sm"
              onClick={generate}
              disabled={busy}
            >
              {busy ? "생성 중…" : doc.resumeMd ? "재생성" : "맞춤 이력서 생성"}
            </button>
          )}
          {/* PDF·면접질문 버튼은 Task 11, 13에서 추가 */}
        </div>
        {doc.resumeMd != null
          ? <MarkdownEditor value={doc.resumeMd} onChange={(v) => save({ ...doc, resumeMd: v })} />
          : (
            <div className="text-sm text-gray-500">
              아직 이력서가 없습니다.{" "}
              {doc.kind === "master"
                ? "[맞춤 이력서 생성]을 누르세요."
                : "일반 이력서는 분석만 제공합니다."}
              <div className="mt-3 border-t pt-3">
                <MarkdownView md={doc.analysis} />
              </div>
            </div>
          )}
      </main>
    </div>
  );
}
