"use client";
import ReactMarkdown from "react-markdown";
export default function MarkdownView({ md }: { md: string }) {
  return (
    <div className="prose max-w-none whitespace-pre-wrap text-sm leading-relaxed
      [&_table]:border-collapse [&_td]:border [&_th]:border [&_td]:px-2 [&_th]:px-2">
      <ReactMarkdown>{md.replace(/\[확인 필요[^\]]*\]/g, (m) => `**🔴${m}**`)}</ReactMarkdown>
    </div>
  );
}
