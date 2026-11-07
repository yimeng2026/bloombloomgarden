import { expect, test } from "bun:test";
import { buildTaskFilter, buildTaskUpdate } from "../../src/lib/research-tasks.ts";
import { execErrorOutput } from "../../src/lib/process-error.ts";

test("task filters preserve all supplied constraints and omit missing ones", () => {
  expect(buildTaskFilter("assigned", "prove", "lean")).toEqual({
    status: "assigned",
    type: "prove",
    targetModule: "lean",
  });
  expect(buildTaskFilter(null, null, null)).toEqual({});
});

test("completed tasks receive the injected completion date and editable fields", () => {
  const now = new Date("2026-11-07T12:00:00.000Z");
  expect(buildTaskUpdate({
    status: "completed",
    result: "proved",
    leanCode: "theorem demo : True := trivial",
    score: 9.5,
  }, now)).toEqual({
    status: "completed",
    completedAt: now,
    result: "proved",
    leanCode: "theorem demo : True := trivial",
    score: 9.5,
  });
});

test("reopened tasks clear completion while other statuses do not invent a date", () => {
  expect(buildTaskUpdate({ status: "in-progress" })).toEqual({
    status: "in-progress",
    completedAt: null,
  });
  expect(buildTaskUpdate({ status: "failed" })).toEqual({ status: "failed" });
  expect(buildTaskUpdate({})).toEqual({});
});

test("task updates reject invalid editable field types", () => {
  expect(() => buildTaskUpdate({ result: 42 })).toThrow("result must be a string");
  expect(() => buildTaskUpdate({ score: Number.NaN })).toThrow("score must be a finite number");
});

test("exec errors preserve stdout, then stderr or message, with a safe fallback", () => {
  expect(execErrorOutput({ stdout: "pull output", stderr: "warning" })).toBe("pull output");
  expect(execErrorOutput({ stdout: "", stderr: "git failed" })).toBe("git failed");
  expect(execErrorOutput(new Error("offline"))).toBe("offline");
  expect(execErrorOutput({ stdout: 42 })).toBe("Git pull failed");
  expect(execErrorOutput(null)).toBe("Git pull failed");
});
