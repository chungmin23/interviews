export type DocKind = "master" | "general";
export type SavedDoc = {
  id: string; title: string; kind: DocKind; createdAt: string;
  jobPosting: string; analysis: string;
  resumeMd: string | null; interviewMd: string | null;
};
export type MasterResume = { text: string; updatedAt: string };
