"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import ResumeInput from "@/components/ResumeInput";
import JobPostingInput from "@/components/JobPostingInput";
import Sidebar from "@/components/Sidebar";
import { setMaster, upsertDoc } from "@/lib/storage";
import type { DocKind, SavedDoc } from "@/lib/types";

export default function Home() {
  const r = useRouter();
  const [resume, setResume] = useState(""); const [kind, setKind] = useState<DocKind>("master");
  const [jd, setJd] = useState(""); const [msg, setMsg] = useState("");
  const [touched, setTouched] = useState(false);

  function startAnalysis() {
    setTouched(true);
    if (!resume || !jd) { setMsg("이력서와 공고를 모두 입력하세요."); return; }
    setMsg("");
    if (kind === "master") setMaster(resume);
    const doc: SavedDoc = {
      id: nanoid(8), title: `${kind === "master" ? "맞춤" : "일반"} 이력서`, kind,
      createdAt: new Date().toISOString(), jobPosting: jd, analysis: "",
      resumeMd: null, interviewMd: null, selectionReason: null, sourceResume: resume,
    };
    upsertDoc(doc);
    sessionStorage.setItem(`run-${doc.id}`, "1"); // 분석 페이지에서 자동 실행 신호
    r.push(`/resume/${doc.id}`);
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 w-full max-w-3xl space-y-5">
        <header>
          <h1>이력서 분석</h1>
          <p className="help mt-1.5">
            이력서와 채용공고를 넣으면 공고 핵심역량 대비 매칭·강점·보완점을 정리해 드려요.
          </p>
        </header>

        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <li><span className="font-semibold text-accent">①</span> 이력서 입력</li>
          <li><span className="font-semibold text-accent">②</span> 채용공고 입력</li>
          <li><span className="font-semibold text-accent">③</span> 분석 후 맞춤 이력서 생성</li>
        </ol>

        <ResumeInput onChange={(t,k)=>{setResume(t);setKind(k);}} invalid={touched && !resume} />
        <JobPostingInput onChange={setJd} invalid={touched && !jd} />
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button className="btn btn-primary" onClick={startAnalysis}>분석하기</button>
      </main>
    </div>
  );
}
