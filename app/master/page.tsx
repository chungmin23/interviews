"use client";
import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useUI } from "@/components/UIProvider";
import { getMaster, setMaster, getGeneral, setGeneral } from "@/lib/storage";
import { extractPdf, extractImage } from "@/lib/client";
import type { DocKind } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved";

export default function MyResumesPage() {
  const ui = useUI();
  const [tab, setTab] = useState<DocKind>("master");
  const [master, setMasterText] = useState(""); const [masterAt, setMasterAt] = useState<string | null>(null);
  const [general, setGeneralText] = useState(""); const [generalAt, setGeneralAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const m = getMaster(); if (m) { setMasterText(m.text); setMasterAt(m.updatedAt); }
    const g = getGeneral(); if (g) { setGeneralText(g.text); setGeneralAt(g.updatedAt); }
  }, []);

  const text = tab === "master" ? master : general;
  const updatedAt = tab === "master" ? masterAt : generalAt;

  function change(v: string) {
    const t = tab; // 저장 시점 탭 고정
    if (t === "master") setMasterText(v); else setGeneralText(v);
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (t === "master") { setMaster(v); setMasterAt(getMaster()?.updatedAt ?? null); }
      else { setGeneral(v); setGeneralAt(getGeneral()?.updatedAt ?? null); }
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
  async function onImage(f: File) {
    setBusy(true);
    try { const t = await extractImage(f); change(text ? `${text}\n${t}` : t); }
    catch { ui.toast("이미지에서 텍스트를 못 읽었어요.", "error"); }
    finally { setBusy(false); }
  }

  const tabBtn = (k: DocKind, label: string) =>
    `px-3 py-2 text-sm -mb-px border-b-2 transition-colors ${
      tab === k ? "border-accent text-accent font-medium" : "border-transparent text-gray-500 hover:text-gray-800"
    }`;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 max-w-3xl space-y-4">
        <header>
          <h1>내 이력서</h1>
          <p className="help mt-1.5">
            마스터·일반 이력서를 여기서 저장해두면 새 분석할 때 자동으로 불러옵니다.
          </p>
        </header>

        <nav className="flex gap-1 border-b border-gray-200">
          <button className={tabBtn("master", "마스터 이력서")} onClick={() => setTab("master")}>마스터 이력서</button>
          <button className={tabBtn("general", "일반 이력서")} onClick={() => setTab("general")}>일반 이력서</button>
        </nav>

        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="label">{tab === "master" ? "마스터 이력서" : "일반 이력서"}</p>
            <span className="text-xs text-gray-400" aria-live="polite">
              {saveState === "saving" ? "저장 중…"
                : saveState === "saved" ? "저장됨"
                : updatedAt ? `마지막 저장: ${new Date(updatedAt).toLocaleString("ko-KR")}`
                : "아직 저장 안 됨"}
            </span>
          </div>
          <p className="help">
            {tab === "master"
              ? "여러 경험을 모아둔 원본 풀. 공고마다 맞춤 이력서 생성에 사용돼요."
              : "특정 공고 분석용 단일 이력서. 맞춤 생성 없이 분석만 제공돼요."}
          </p>
          <textarea
            className="field h-[60vh] resize-y font-mono"
            placeholder="이력서 md/텍스트 붙여넣기"
            value={text}
            onChange={(e) => change(e.target.value)}
            aria-label={`${tab === "master" ? "마스터" : "일반"} 이력서 본문`}
          />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="text-gray-600">PDF
              <input type="file" accept="application/pdf" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="ml-1" aria-label="PDF 업로드" />
            </label>
            <label className="text-gray-600">이미지
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onImage(e.target.files[0])} className="ml-1" aria-label="이미지 업로드" />
            </label>
            {busy && <span className="help">읽는 중…</span>}
          </div>
        </div>
      </main>
    </div>
  );
}
