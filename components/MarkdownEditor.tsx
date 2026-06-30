"use client";
import MarkdownView from "./MarkdownView";
export default function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="flex flex-col min-w-0">
        <span className="help mb-1">편집 (마크다운)</span>
        <textarea
          className="field font-mono resize-none h-[60vh] overflow-auto"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="이력서 마크다운 편집"
        />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="help mb-1">미리보기</span>
        <div className="rounded-lg border border-gray-200 bg-white p-3 overflow-auto h-[60vh]">
          <MarkdownView md={value} />
        </div>
      </div>
    </div>
  );
}
