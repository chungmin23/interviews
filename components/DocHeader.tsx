"use client";
import Link from "next/link";
import DocTabs from "./DocTabs";
import type { SavedDoc } from "@/lib/types";
import type { SaveState } from "@/lib/useDoc";

export default function DocHeader({
  doc,
  onTitle,
  saveState,
}: {
  doc: SavedDoc;
  onTitle: (v: string) => void;
  saveState: SaveState;
}) {
  return (
    <div className="space-y-3">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 hover:underline">← 목록</Link>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="field font-bold flex-1 min-w-[12rem]"
          value={doc.title}
          onChange={(e) => onTitle(e.target.value)}
          aria-label="문서 제목"
        />
        <span className="text-xs text-gray-400 w-14 text-right" aria-live="polite">
          {saveState === "saving" ? "저장 중…" : saveState === "saved" ? "저장됨" : ""}
        </span>
      </div>
      <DocTabs id={doc.id} />
    </div>
  );
}
