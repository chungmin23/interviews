"use client";
import { useState } from "react";

export default function Gate() {
  const [pw, setPw] = useState("");

  async function submit() {
    const res = await fetch("/api/gate", { method: "POST", body: JSON.stringify({ pw }) });
    if (res.ok) location.href = "/"; else alert("비밀번호가 틀렸어요.");
  }

  return <main className="p-8 space-y-2"><input type="password" className="border p-2" value={pw} onChange={(e)=>setPw(e.target.value)} />
    <button className="border px-3 py-2 ml-2" onClick={submit}>입장</button></main>;
}
