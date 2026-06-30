"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { listDocs, deleteDoc } from "@/lib/storage";
import { useUI } from "@/components/UIProvider";
import type { SavedDoc } from "@/lib/types";

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }); }
  catch { return ""; }
}

export default function Sidebar() {
  const [docs, setDocs] = useState<SavedDoc[]>([]);
  const pathname = usePathname();
  const r = useRouter();
  const ui = useUI();
  useEffect(() => setDocs(listDocs()), [pathname]);

  async function remove(e: React.MouseEvent, d: SavedDoc) {
    e.preventDefault(); e.stopPropagation();
    if (!(await ui.confirm(`"${d.title || d.kind}" 프로젝트를 삭제할까요?`))) return;
    deleteDoc(d.id);
    setDocs(listDocs());
    ui.toast("삭제했어요.", "success");
    if (pathname.startsWith(`/resume/${d.id}`)) r.push("/");
  }

  function subClass(active: boolean) {
    return `block rounded px-2 py-1 text-[13px] ${active ? "bg-accent/10 text-accent font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`;
  }

  return (
    <aside className="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-gray-200 bg-white p-4 text-sm">
      <div className="space-y-1">
        <Link href="/" className="block font-semibold text-accent hover:text-accentDark">+ 새 분석</Link>
        <Link
          href="/master"
          className={`block rounded px-2 py-1 -mx-2 ${pathname === "/master" ? "bg-accent/10 text-accent font-medium" : "text-gray-700 hover:bg-gray-50"}`}
        >
          내 이력서
        </Link>
      </div>

      {docs.length === 0 ? (
        <p className="mt-4 text-xs text-gray-500">아직 분석한 프로젝트가 없어요.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {docs.map((d) => {
            const base = `/resume/${d.id}`;
            const onAnalysis = pathname === base;
            const onWrite = pathname === `${base}/write`;
            const inProject = onAnalysis || onWrite;
            return (
              <li key={d.id}>
                {/* 프로젝트 헤더 */}
                <div className={`group flex items-center gap-1 rounded-lg px-2 py-1 ${inProject ? "bg-accent/5" : "hover:bg-gray-50"}`}>
                  <Link href={base} className="flex-1 min-w-0">
                    <span className={`block truncate font-medium ${inProject ? "text-accent" : "text-gray-800"}`}>{d.title || d.kind}</span>
                    <span className="block text-[11px] text-gray-500">
                      {d.kind === "master" ? "마스터" : "일반"} · {fmtDate(d.createdAt)}
                    </span>
                  </Link>
                  <button
                    onClick={(e) => remove(e, d)}
                    className="text-gray-400 hover:text-red-500 px-1.5 text-base leading-none opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label={`${d.title || d.kind} 삭제`}
                    title="삭제"
                  >×</button>
                </div>
                {/* 세부 페이지 */}
                <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
                  <li><Link href={base} className={subClass(onAnalysis)}>1. 분석</Link></li>
                  <li><Link href={`${base}/write`} className={subClass(onWrite)}>2. 이력서 작성</Link></li>
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-5 pt-4 border-t border-gray-200 text-[11px] text-gray-500 leading-relaxed">
        문서는 이 브라우저에만 저장돼요. 다른 기기·브라우저에서는 보이지 않아요.
      </p>
    </aside>
  );
}
