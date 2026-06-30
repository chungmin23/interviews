"use client";
import { useState } from "react";
import { fetchJob, extractImage } from "@/lib/client";
import { useUI } from "@/components/UIProvider";
export default function JobPostingInput({ onChange, invalid }: { onChange: (t: string) => void; invalid?: boolean }) {
  const ui = useUI();
  const [text, setText] = useState(""); const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false);
  async function tryUrl() {
    if (!url) return;
    setBusy(true);
    try { const t = await fetchJob(url); setText(t); onChange(t); }
    catch { ui.toast("링크에서 공고를 못 가져왔어요(로그인 필요 등). 공고 전문을 붙여넣어 주세요.", "error"); }
    finally { setBusy(false); }
  }
  async function onImage(f: File) {
    setBusy(true);
    try {
      const t = await extractImage(f);
      const next = text ? `${text}\n${t}` : t;
      setText(next); onChange(next);
    } catch { ui.toast("이미지에서 텍스트를 못 읽었어요.", "error"); }
    finally { setBusy(false); }
  }
  return (
    <div className="card space-y-3">
      <p className="label">채용공고</p>
      <div className="flex gap-2">
        <input className="field flex-1" placeholder="공고 링크(선택)" value={url} onChange={(e)=>setUrl(e.target.value)} aria-label="공고 링크"/>
        <button className="btn btn-ghost btn-sm shrink-0" onClick={tryUrl} type="button" disabled={busy || !url}>
          {busy ? "가져오는 중…" : "가져오기"}
        </button>
      </div>
      <textarea
        className={`field h-32 resize-y ${invalid ? "field-invalid" : ""}`}
        placeholder="공고 텍스트 붙여넣기"
        value={text}
        onChange={(e)=>{setText(e.target.value);onChange(e.target.value);}}
        aria-label="공고 본문"
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="text-gray-600">공고 이미지(스크린샷)
          <input type="file" accept="image/*" onChange={(e)=>e.target.files?.[0]&&onImage(e.target.files[0])} className="ml-1" aria-label="공고 이미지 업로드"/>
        </label>
        {busy && <span className="help">이미지 읽는 중…</span>}
      </div>
    </div>
  );
}
