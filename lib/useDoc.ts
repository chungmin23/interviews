"use client";
import { useEffect, useRef, useState } from "react";
import { getDoc, upsertDoc } from "./storage";
import type { SavedDoc } from "./types";

export type SaveState = "idle" | "saving" | "saved";

/** localStorage 문서 로드 + 디바운스 자동저장 공통 훅 */
export function useDoc(id: string) {
  // undefined = 로딩 중, null = 없음
  const [doc, setDoc] = useState<SavedDoc | null | undefined>(undefined);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { setDoc(getDoc(id) ?? null); }, [id]);

  function save(next: SavedDoc) {
    setDoc(next);
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      upsertDoc(next);
      setSaveState("saved");
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState("idle"), 2000);
    }, 500);
  }

  return { doc, save, saveState };
}
