"use client";
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import MarkdownView from "@/components/MarkdownView";
import { useUI } from "@/components/UIProvider";
import { postStream } from "@/lib/client";
import { getBrainstorm, upsertBrainstorm, appendMaster } from "@/lib/storage";
import type { Brainstorm, ChatMsg } from "@/lib/types";

// STAR로 정리된 메시지에서 이력서에 넣을 본문만 추출. 정리본이 아니면 null.
function extractSummary(content: string): string | null {
  if (!/상황\s*\(S\)/.test(content) || !/결과\s*\(R\)/.test(content)) return null;
  const idx = content.indexOf("###");
  const block = (idx >= 0 ? content.slice(idx) : content)
    .split("\n")
    .filter((l) => !l.includes("마스터 이력서에 추가")) // AI의 "추가할까요?" 안내 줄 제거
    .join("\n")
    .trim();
  return block || null;
}

export default function BrainstormChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ui = useUI();
  const [bs, setBs] = useState<Brainstorm | null | undefined>(undefined);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setBs(getBrainstorm(id) ?? null); }, [id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [bs?.messages.length, busy]);

  async function send() {
    const content = input.trim();
    if (!content || busy || !bs) return;
    const history: ChatMsg[] = [...bs.messages, { role: "user", content }];
    const hadUser = bs.messages.some(m => m.role === "user");
    setInput("");
    setBusy(true);
    setBs({ ...bs, title: hadUser ? bs.title : content.slice(0, 30), messages: [...history, { role: "assistant" as const, content: "" }] });

    let acc = "";
    try {
      await postStream("/api/brainstorm", { messages: history }, (t) => {
        acc += t;
        setBs(p => (p ? { ...p, messages: [...history, { role: "assistant" as const, content: acc }] } : p));
      });
    } catch (e) {
      ui.toast((e as Error).message === "RATE_LIMITED" ? "오늘 사용 한도를 초과했어요." : "응답 실패: " + (e as Error).message, "error");
      acc = acc || "(응답을 받지 못했어요)";
    } finally {
      setBusy(false);
      setBs(p => {
        const fin = p ? { ...p, messages: [...history, { role: "assistant" as const, content: acc }] } : p;
        if (fin) upsertBrainstorm(fin);
        return fin;
      });
    }
  }

  async function addToMaster(content: string) {
    if (!(await ui.confirm("이 내용을 마스터 이력서에 추가할까요?"))) return;
    appendMaster(content);
    ui.toast("마스터 이력서에 추가했어요.", "success");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  if (bs === undefined) return <div className="p-8 text-sm text-gray-400">불러오는 중…</div>;
  if (!bs) return (
    <div className="p-8 space-y-3">
      <p className="text-gray-600">대화를 찾을 수 없어요.</p>
      <Link href="/brainstorm" className="btn btn-outline-accent">← 브레인스토밍 목록</Link>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 max-w-3xl flex flex-col">
        <Link href="/brainstorm" className="text-sm text-gray-500 hover:text-gray-800 hover:underline">← 목록</Link>
        <h1 className="mt-2 mb-4 truncate">{bs.title}</h1>

        <div className="flex-1 space-y-3 overflow-y-auto pb-4">
          {bs.messages.map((m, i) => {
            if (m.role === "user") return (
              <div key={i} className="ml-auto max-w-[85%] rounded-xl bg-accent text-white px-3 py-2 text-sm whitespace-pre-wrap">
                {m.content}
              </div>
            );
            const summary = m.content ? extractSummary(m.content) : null;
            return (
              <div key={i} className="mr-auto max-w-[90%] rounded-xl border border-gray-200 bg-white px-3 py-2">
                {m.content ? <MarkdownView md={m.content} /> : <span className="text-sm text-gray-400">…</span>}
                {summary && (
                  <button
                    className="mt-2 text-xs text-accent hover:underline"
                    onClick={() => addToMaster(summary)}
                  >+ 마스터 이력서에 추가</button>
                )}
              </div>
            );
          })}
          {busy && <p className="text-xs text-gray-400">작성 중…</p>}
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-0 bg-gray-50 pt-2 flex gap-2 items-end">
          <textarea
            className="field flex-1 h-20 resize-none"
            placeholder="답변을 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="메시지 입력"
          />
          <button className="btn btn-primary" onClick={send} disabled={busy || !input.trim()}>전송</button>
        </div>
      </main>
    </div>
  );
}
