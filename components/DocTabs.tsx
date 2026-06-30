"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DocTabs({ id }: { id: string }) {
  const path = usePathname();
  const tabs = [
    { href: `/resume/${id}`, label: "1. 분석" },
    { href: `/resume/${id}/write`, label: "2. 이력서 작성" },
    { href: `/resume/${id}/cover`, label: "3. 자소서" },
    { href: `/resume/${id}/interview`, label: "4. 면접 질문" },
  ];
  return (
    <nav className="flex gap-1 border-b border-gray-200">
      {tabs.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 py-2 text-sm -mb-px border-b-2 transition-colors ${
              active ? "border-accent text-accent font-medium" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
