import { beforeEach, expect, test } from "vitest";
import { __reset, checkAndCount } from "./ratelimit";

beforeEach(() => __reset());

test("counts down and blocks after limit", () => {
  process.env.DAILY_LIMIT = "3";
  expect(checkAndCount("1.1.1.1").remaining).toBe(2);
  checkAndCount("1.1.1.1"); checkAndCount("1.1.1.1");
  expect(checkAndCount("1.1.1.1").ok).toBe(false);
});

test("separate ips independent", () => {
  process.env.DAILY_LIMIT = "1";
  expect(checkAndCount("a").ok).toBe(true);
  expect(checkAndCount("b").ok).toBe(true);
});
