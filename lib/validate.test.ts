import { expect, test } from "vitest";
import { assertWithinLimits } from "./validate";

test("passes within limits", () => {
  expect(() => assertWithinLimits({ resumeText: "x", jobPosting: "y" })).not.toThrow();
});
test("throws when resume too long", () => {
  expect(() => assertWithinLimits({ resumeText: "x".repeat(60001) })).toThrow("INPUT_TOO_LONG");
});
test("throws when posting too long", () => {
  expect(() => assertWithinLimits({ jobPosting: "x".repeat(30001) })).toThrow("INPUT_TOO_LONG");
});
