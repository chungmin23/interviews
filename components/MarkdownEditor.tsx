"use client";
import MarkdownView from "./MarkdownView";
export default function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 h-[70vh]">
      <textarea className="border p-3 text-sm font-mono resize-none" value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="border p-3 overflow-auto"><MarkdownView md={value} /></div>
    </div>
  );
}
