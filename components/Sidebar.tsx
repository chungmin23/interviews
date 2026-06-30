"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listDocs } from "@/lib/storage";
import type { SavedDoc } from "@/lib/types";
export default function Sidebar() {
  const [docs, setDocs] = useState<SavedDoc[]>([]);
  useEffect(() => setDocs(listDocs()), []);
  return (
    <aside className="w-56 shrink-0 border-r p-3 text-sm">
      <Link href="/" className="font-bold text-accent">+ 새 분석</Link>
      <ul className="mt-3 space-y-1">
        {docs.map(d => <li key={d.id}><Link className="hover:underline" href={`/resume/${d.id}`}>{d.title || d.kind}</Link></li>)}
      </ul>
    </aside>
  );
}
