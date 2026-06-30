export type DocKind = "master" | "general";
export type SavedDoc = {
  id: string; title: string; kind: DocKind; createdAt: string;
  jobPosting: string; analysis: string;
  resumeMd: string | null; interviewMd: string | null;
  selectionReason: string | null;
  sourceResume: string;
};
export type MasterResume = { text: string; updatedAt: string };

export type ChatRole = "user" | "assistant";
export type ChatMsg = { role: ChatRole; content: string };
export type Brainstorm = { id: string; title: string; createdAt: string; messages: ChatMsg[] };
