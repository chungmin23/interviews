"use client";
import { useEffect, useState } from "react";
import { extractPdf, extractImage } from "@/lib/client";
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

  // 종류 전환: 마스터=저장본 자동 채움 / 일반=직접 붙여넣도록 비움(직접 입력한 텍스트는 보존)
  function selectKind(k: DocKind) {
    setKind(k);
    const m = getMaster();
    if (k === "master") {
      if (m?.text) { setText(m.text); setPrefilled(true); onChange(m.text, "master"); return; }
      setPrefilled(false); onChange(text, "master");
    } else {
      if (prefilled && m?.text && text === m.text) { setText(""); onChange("", "general"); }
      else onChange(text, "general");
      setPrefilled(false);
    }
  }

  async function onFile(f: File) {
    setBusy(true);
    try { const t = await extractPdf(f); setText(t); setPrefilled(false); onChange(t, kind); }
    catch { ui.toast("PDF에서 텍스트를 못 읽었어요. md/텍스트로 붙여넣어 주세요.", "error"); }
    finally { setBusy(false); }
  }
  async function onImage(f: File) {
    setBusy(true);
    try {
      const t = await extractImage(f);
      const next = text ? `${text}\n${t}` : t;
      setText(next); setPrefilled(false); onChange(next, kind);
    } catch { ui.toast("이미지에서 텍스트를 못 읽었어요.", "error"); }
    finally { setBusy(false); }
  }

  return (
    <fieldset className="card space-y-3">
      <legend className="label px-1">이력서</legend>
      <div className="space-y-1.5 text-sm">
        <label className="flex items-start gap-2 cursor-pointer">
          <input className="mt-1" type="radio" name="resume-kind" checked={kind==="master"} onChange={()=>selectKind("master")}/>
          <span>
            <span className="font-medium">마스터 이력서</span>
            <span className="block help">여러 경험을 모아둔 원본. 공고마다 맞춤 이력서를 생성할 수 있어요.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input className="mt-1" type="radio" name="resume-kind" checked={kind==="general"} onChange={()=>selectKind("general")}/>
          <span>
            <span className="font-medium">일반 이력서</span>
            <span className="block help">이 공고에 대한 분석만 제공돼요(맞춤 생성 없음). 직접 붙여넣거나 파일·이미지로 올려요.</span>
          </span>
        </label>
      </div>
      {prefilled && kind === "master" && (
        <p className="help">저장된 마스터 이력서를 불러왔어요. 수정하려면 <a href="/master" className="text-accent hover:underline">내 이력서</a>에서 관리하세요.</p>
      )}
      <textarea
        className={`field h-48 resize-y ${invalid ? "field-invalid" : ""}`}
        placeholder={kind === "general" ? "일반 이력서 md/텍스트 붙여넣기" : "이력서 md/텍스트 붙여넣기"}
        value={text}
        onChange={(e)=>{setText(e.target.value);setPrefilled(false);onChange(e.target.value,kind);}}
        aria-label="이력서 본문"
      />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="text-gray-600">PDF
          <input type="file" accept="application/pdf" onChange={(e)=>e.target.files?.[0]&&onFile(e.target.files[0])} className="ml-1" aria-label="PDF 업로드"/>
        </label>
        <label className="text-gray-600">이미지
          <input type="file" accept="image/*" onChange={(e)=>e.target.files?.[0]&&onImage(e.target.files[0])} className="ml-1" aria-label="이미지 업로드"/>
        </label>
        {busy && <span className="help">읽는 중…</span>}
      </div>
    </fieldset>
  );
}
