import { beforeEach, expect, test } from "vitest";
import { listDocs, upsertDoc, getDoc, deleteDoc, getMaster, setMaster } from "./storage";
import type { SavedDoc } from "./types";

const make = (id: string): SavedDoc => ({
  id, title: "t", kind: "general", createdAt: "2026-06-16",
  jobPosting: "jd", analysis: "a", resumeMd: null, interviewMd: null,
});

beforeEach(() => localStorage.clear());

test("upsert then list/get", () => {
  upsertDoc(make("1"));
  expect(listDocs().map(d => d.id)).toEqual(["1"]);
  expect(getDoc("1")?.jobPosting).toBe("jd");
});

test("upsert replaces same id", () => {
  upsertDoc(make("1"));
  upsertDoc({ ...make("1"), title: "new" });
  expect(listDocs()).toHaveLength(1);
  expect(getDoc("1")?.title).toBe("new");
});

test("delete removes", () => {
  upsertDoc(make("1")); deleteDoc("1");
  expect(listDocs()).toHaveLength(0);
});

test("master resume set/get", () => {
  expect(getMaster()).toBeNull();
  setMaster("master text");
  expect(getMaster()?.text).toBe("master text");
});
