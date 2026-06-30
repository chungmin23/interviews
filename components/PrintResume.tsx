"use client";
import MarkdownView from "./MarkdownView";
export default function PrintResume({ md }: { md: string }) {
  return <div className="print-area"><MarkdownView md={md} /></div>;
}
