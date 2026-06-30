"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
export default function MarkdownView({ md }: { md: string }) {
  return (
    <div className="max-w-none text-sm leading-relaxed
      [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-1 [&_h1]:mb-3
      [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:pb-1 [&_h2]:border-b [&_h2]:border-gray-200
      [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1
      [&_p]:my-2 [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-0.5
      [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px]
      [&_thead]:bg-gray-50
      [&_th]:border [&_th]:border-gray-300 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:align-top
      [&_td]:border [&_td]:border-gray-300 [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top">
      <div className="overflow-x-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {md.replace(/\[확인 필요[^\]]*\]/g, (m) => `**🔴${m}**`)}
        </ReactMarkdown>
      </div>
    </div>
  );
}
