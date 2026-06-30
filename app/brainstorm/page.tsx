"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import Sidebar from "@/components/Sidebar";
import { useUI } from "@/components/UIProvider";
import { listBrainstorms, upsertBrainstorm, deleteBrainstorm } from "@/lib/storage";
import type { Brainstorm } from "@/lib/types";

const GREETING =
  "어떤 경험을 정리해볼까요? 막연해도 좋아요 — 떠오르는 프로젝트나 상황을 한 문장으로 던져 주세요. (예: \"결제 시스템 만든 적 있어\")";

function fmt(iso: string) {
  try { return new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }); }
  catch { return ""; }
}

export default function BrainstormListPage() {
  const r = useRouter();
  const ui = useUI();
  const [items, setItems] = useState<Brainstorm[]>([]);
  useEffect(() => setItems(listBrainstorms()), []);

  function create() {
    const b: Brainstorm = {
      id: nanoid(8), title: "새 브레인스토밍", createdAt: new Date().toISOString(),
      messages: [{ role: "assistant", content: GREETING }],
    };
    upsertBrainstorm(b);
    r.push(`/brainstorm/${b.id}`);
  }
  async function remove(e: React.MouseEvent, b: Brainstorm) {
    e.preventDefault();
    if (!(await ui.confirm(`"${b.title}" 대화를 삭제할까요?`))) return;
    deleteBrainstorm(b.id); setItems(listBrainstorms()); ui.toast("삭제했어요.", "success");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 max-w-3xl space-y-4">
        <header>
          <h1>경험 브레인스토밍</h1>
          <p className="help mt-1.5">
            막연한 기억을 질문으로 끌어내 구체적 경험(문제·역할·성과)으로 정리하고, 마스터 이력서에 추가해요.
          </p>
        </header>

        <button className="btn btn-primary" onClick={create}>+ 새 브레인스토밍</button>

        {items.length === 0 ? (
          <p className="help">아직 정리한 대화가 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {items.map(b => (
              <li key={b.id} className="card flex items-center gap-2 py-3">
                <Link href={`/brainstorm/${b.id}`} className="flex-1 min-w-0">
                  <span className="block truncate font-medium text-gray-800">{b.title}</span>
                  <span className="block text-[11px] text-gray-500">{fmt(b.createdAt)} · {b.messages.length}개 메시지</span>
                </Link>
                <button onClick={(e) => remove(e, b)} className="text-gray-400 hover:text-red-500 px-2 text-base" aria-label="삭제" title="삭제">×</button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
