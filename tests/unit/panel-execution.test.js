import { expect, test } from "bun:test";
import { generateStages, parseCustomStages } from "../../src/lib/panel-execution.ts";

const members = [
  { id: "observer", role: "observer", specialty: "观察", weight: 100, systemPrompt: "", model: "kimi" },
  { id: "math", role: "contributor", specialty: "数学", weight: 5, systemPrompt: "", model: "kimi" },
  { id: "physics", role: "chair", specialty: "物理", weight: 9, systemPrompt: "", model: "kimi" },
];

test("sequential stages exclude observers and sort remaining members by descending weight", () => {
  const stages = generateStages("sequential", members);
  expect(stages).toHaveLength(2);
  expect(stages[0].name).toBe("阶段 1: 物理");
  expect(stages[0].description).toContain("主席");
  expect(stages[0].assigneeRoles).toEqual(["chair"]);
  expect(stages[1].name).toBe("阶段 2: 数学");
  expect(stages[1].assigneeRoles).toEqual(["contributor"]);
});

test("custom stages preserve explicit values and apply defaults to missing fields", () => {
  const stages = parseCustomStages({
    customStages: [
      {
        name: "证明审查",
        description: "检查逻辑依赖",
        assigneeRoles: ["reviewer"],
        expectedOutput: "审查报告",
      },
      { name: null, description: null, assigneeRoles: null, expectedOutput: null },
    ],
  });
  expect(stages).toHaveLength(2);
  expect(stages[0]).toEqual({
    name: "证明审查",
    description: "检查逻辑依赖",
    assigneeRoles: ["reviewer"],
    expectedOutput: "审查报告",
  });
  expect(stages[1]).toEqual({
    name: "自定义阶段",
    description: "",
    assigneeRoles: ["contributor"],
    expectedOutput: "",
  });
});

test("invalid strategies have no custom stages", () => {
  expect(parseCustomStages([])).toBeNull();
  expect(parseCustomStages({})).toBeNull();
  expect(parseCustomStages({ customStages: "not-an-array" })).toBeNull();
});
