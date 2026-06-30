"use client";
import { useState } from "react";
import { fetchJob } from "@/lib/client";
export default function JobPostingInput({ onChange }: { onChange: (t: string) => void }) {
  const [text, setText] = useState(""); const [url, setUrl] = useState("");
  async function tryUrl() {
    try { const t = await fetchJob(url); setText(t); onChange(t); }
    catch { alert("링크에서 공고를 못 가져왔어요(로그인 필요 등). 공고 전문을 붙여넣어 주세요."); }
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="flex-1 border p-2 text-sm" placeholder="공고 링크(선택)" value={url} onChange={(e)=>setUrl(e.target.value)}/>
        <button className="border px-3 text-sm" onClick={tryUrl} type="button">가져오기</button>
      </div>
      <textarea className="w-full h-32 border p-2 text-sm" placeholder="공고 텍스트 붙여넣기"
        value={text} onChange={(e)=>{setText(e.target.value);onChange(e.target.value);}}/>
    </div>
  );
}
