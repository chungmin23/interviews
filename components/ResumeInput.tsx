"use client";
import { useEffect, useState } from "react";
import { extractPdf } from "@/lib/client";
import { getMaster } from "@/lib/storage";
import { useUI } from "@/components/UIProvider";
import type { DocKind } from "@/lib/types";

export default function ResumeInput({
  onChange,
  invalid,
}: {
  onChange: (text: string, kind: DocKind) => void;
  invalid?: boolean;
}) {
  const ui = useUI();
  const [text, setText] = useState(""); const [kind, setKind] = useState<DocKind>("master"); const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // 저장된 마스터 이력서가 있으면 자동으로 불러온다.
  useEffect(() => {
    const m = getMaster();
    if (m?.text) { setText(m.text); onChange(m.text, "master"); setPrefilled(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function onFile(f: File) {
    setBusy(true);
    try { const t = await extractPdf(f); setText(t); onChange(t, kind); }
    catch { ui.toast("PDF에서 텍스트를 못 읽었어요. md/텍스트로 붙여넣어 주세요.", "error"); }
    finally { setBusy(false); }
  }
  return (
    <fieldset className="card space-y-3">
      <legend className="label px-1">이력서</legend>
      <div className="space-y-1.5 text-sm">
        <label className="flex items-start gap-2 cursor-pointer">
          <input className="mt-1" type="radio" name="resume-kind" checked={kind==="master"} onChange={()=>{setKind("master");onChange(text,"master");}}/>
          <span>
            <span className="font-medium">마스터 이력서</span>
            <span className="block help">여러 경험을 모아둔 원본. 공고마다 맞춤 이력서를 생성할 수 있어요.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input className="mt-1" type="radio" name="resume-kind" checked={kind==="general"} onChange={()=>{setKind("general");onChange(text,"general");}}/>
          <span>
            <span className="font-medium">일반 이력서</span>
            <span className="block help">이 공고에 대한 분석만 제공돼요(맞춤 생성 없음).</span>
          </span>
        </label>
      </div>
      {prefilled && (
        <p className="help">저장된 마스터 이력서를 불러왔어요. 수정하려면 <a href="/master" className="text-accent hover:underline">내 이력서</a>에서 관리하세요.</p>
      )}
      <textarea
        className={`field h-48 resize-y ${invalid ? "field-invalid" : ""}`}
        placeholder="이력서 md/텍스트 붙여넣기"
        value={text}
        onChange={(e)=>{setText(e.target.value);onChange(e.target.value,kind);}}
        aria-label="이력서 본문"
      />
      <div className="flex items-center gap-2">
        <input type="file" accept="application/pdf" onChange={(e)=>e.target.files?.[0]&&onFile(e.target.files[0])} className="text-sm" aria-label="PDF 업로드"/>
        {busy && <span className="help">PDF 읽는 중…</span>}
      </div>
    </fieldset>
  );
}
