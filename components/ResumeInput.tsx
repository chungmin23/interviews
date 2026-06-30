"use client";
import { useState } from "react";
import { extractPdf } from "@/lib/client";
import type { DocKind } from "@/lib/types";

export default function ResumeInput({ onChange }: { onChange: (text: string, kind: DocKind) => void }) {
  const [text, setText] = useState(""); const [kind, setKind] = useState<DocKind>("master"); const [busy, setBusy] = useState(false);
  async function onFile(f: File) {
    setBusy(true);
    try { const t = await extractPdf(f); setText(t); onChange(t, kind); }
    catch { alert("PDF에서 텍스트를 못 읽었어요. md/텍스트로 붙여넣어 주세요."); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-3 text-sm">
        <label><input type="radio" checked={kind==="master"} onChange={()=>{setKind("master");onChange(text,"master");}}/> 마스터 이력서</label>
        <label><input type="radio" checked={kind==="general"} onChange={()=>{setKind("general");onChange(text,"general");}}/> 일반 이력서</label>
      </div>
      <textarea className="w-full h-48 border p-2 text-sm" placeholder="이력서 md/텍스트 붙여넣기"
        value={text} onChange={(e)=>{setText(e.target.value);onChange(e.target.value,kind);}}/>
      <input type="file" accept="application/pdf" onChange={(e)=>e.target.files?.[0]&&onFile(e.target.files[0])}/>
      {busy && <span className="text-xs text-gray-500">PDF 읽는 중…</span>}
    </div>
  );
}
