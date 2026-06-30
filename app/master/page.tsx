"use client";
import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useUI } from "@/components/UIProvider";
import { getMaster, setMaster } from "@/lib/storage";
import { extractPdf } from "@/lib/client";

type SaveState = "idle" | "saving" | "saved";

export default function MasterPage() {
  const ui = useUI();
  const [text, setText] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const m = getMaster();
    if (m) { setText(m.text); setUpdatedAt(m.updatedAt); }
  }, []);

  function change(v: string) {
    setText(v);
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setMaster(v);
      setUpdatedAt(getMaster()?.updatedAt ?? null);
      setSaveState("saved");
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState("idle"), 2000);
    }, 600);
  }

  async function onFile(f: File) {
    setBusy(true);
    try { const t = await extractPdf(f); change(t); }
    catch { ui.toast("PDF에서 텍스트를 못 읽었어요. md/텍스트로 붙여넣어 주세요.", "error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 max-w-3xl space-y-4">
        <header>
          <h1>내 이력서 (마스터)</h1>
          <p className="help mt-1.5">
            모든 경험을 모아두는 원본 풀이에요. 여기 저장해두면 새 분석할 때 자동으로 불러옵니다.
          </p>
        </header>

        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="label">마스터 이력서</p>
            <span className="text-xs text-gray-400" aria-live="polite">
              {saveState === "saving"
                ? "저장 중…"
                : saveState === "saved"
                ? "저장됨"
                : updatedAt
                ? `마지막 저장: ${new Date(updatedAt).toLocaleString("ko-KR")}`
                : "아직 저장 안 됨"}
            </span>
          </div>
          <textarea
            className="field h-[60vh] resize-y font-mono"
            placeholder="이력서 md/텍스트 붙여넣기"
            value={text}
            onChange={(e) => change(e.target.value)}
            aria-label="마스터 이력서 본문"
          />
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              className="text-sm"
              aria-label="PDF 업로드"
            />
            {busy && <span className="help">PDF 읽는 중…</span>}
          </div>
        </div>
      </main>
    </div>
  );
}
