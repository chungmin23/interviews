"use client";
import { useState } from "react";

export default function Gate() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw) { setErr("접근 코드를 입력하세요."); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/gate", { method: "POST", body: JSON.stringify({ pw }) });
      if (res.ok) location.href = "/";
      else { setErr("접근 코드가 올바르지 않습니다."); setPw(""); }
    } catch { setErr("연결에 실패했습니다. 잠시 후 다시 시도하세요."); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1>이력서 맞춤화 도구</h1>
          <p className="help mt-1">접근 코드를 입력하면 시작합니다.</p>
        </div>
        <div className="space-y-1.5">
          <input
            type="password"
            autoFocus
            className={`field ${err ? "field-invalid" : ""}`}
            placeholder="접근 코드"
            value={pw}
            onChange={(e) => { setPw(e.target.value); if (err) setErr(""); }}
            aria-label="접근 코드"
            aria-invalid={!!err}
          />
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {busy ? "확인 중…" : "입장"}
        </button>
      </form>
    </main>
  );
}
