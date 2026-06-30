import type { SavedDoc, MasterResume, Brainstorm } from "./types";
const DOCS = "resume-app:documents";
const MASTER = "resume-app:masterResume";
const GENERAL = "resume-app:generalResume";
const BRAINSTORMS = "resume-app:brainstorms";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; }
  catch { return fallback; }
}
function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function listDocs(): SavedDoc[] { return read<SavedDoc[]>(DOCS, []); }
export function getDoc(id: string) { return listDocs().find(d => d.id === id); }
export function upsertDoc(doc: SavedDoc) {
  const docs = listDocs().filter(d => d.id !== doc.id);
  write(DOCS, [doc, ...docs]);
}
export function deleteDoc(id: string) { write(DOCS, listDocs().filter(d => d.id !== id)); }
export function getMaster(): MasterResume | null { return read<MasterResume | null>(MASTER, null); }
export function setMaster(text: string) { write(MASTER, { text, updatedAt: new Date().toISOString() }); }
export function getGeneral(): MasterResume | null { return read<MasterResume | null>(GENERAL, null); }
export function setGeneral(text: string) { write(GENERAL, { text, updatedAt: new Date().toISOString() }); }

/** 브레인스토밍으로 정리한 경험을 마스터 이력서 풀에 덧붙인다. */
export function appendMaster(text: string) {
  const base = getMaster()?.text ?? "";
  setMaster(base.trim() ? `${base.trimEnd()}\n\n${text.trim()}` : text.trim());
}

export function listBrainstorms(): Brainstorm[] { return read<Brainstorm[]>(BRAINSTORMS, []); }
export function getBrainstorm(id: string) { return listBrainstorms().find(b => b.id === id); }
export function upsertBrainstorm(b: Brainstorm) {
  const rest = listBrainstorms().filter(x => x.id !== b.id);
  write(BRAINSTORMS, [b, ...rest]);
}
export function deleteBrainstorm(id: string) { write(BRAINSTORMS, listBrainstorms().filter(b => b.id !== id)); }
