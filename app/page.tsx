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
