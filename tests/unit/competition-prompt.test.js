import { expect, test } from "bun:test";
import { buildCompetitionUserPrompt } from "../../src/lib/competition-prompt.ts";

test("competition prompt includes round, format, specialty and all competitor names", () => {
  const prompt = buildCompetitionUserPrompt({
    topic: "证明素数四元组",
    domain: "mathematics",
    mode: "competition",
    format: "elimination",
    roundNumber: 3,
    specialty: "number_theory",
    competitors: [
      { name: "甲", specialty: "algebra" },
      { name: "乙", specialty: "analysis" },
    ],
  });
  expect(prompt).toContain("【学术竞赛 第 3 轮】");
  expect(prompt).toContain("竞赛格式：elimination");
  expect(prompt).toContain("你的专长：number_theory");
  expect(prompt).toContain("题目：证明素数四元组");
  expect(prompt).toContain("其他参赛者：甲, 乙");
});

test("competition prompt uses explicit defaults without inventing competitors", () => {
  const prompt = buildCompetitionUserPrompt({ topic: "", domain: "", mode: "" });
  expect(prompt).toContain("【学术竞赛 第 1 轮】");
  expect(prompt).toContain("竞赛格式：tournament");
  expect(prompt).toContain("你的专长：general");
  expect(prompt).toContain("题目：未指定题目");
  expect(prompt).not.toContain("其他参赛者：");
});
