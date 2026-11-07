import { expect, test } from "bun:test";
import { buildResearchModuleFilter, groupResearchModulesByCategory } from "../../src/lib/research-modules.ts";

test("research module filters include discipline, status and supported contains search", () => {
  expect(buildResearchModuleFilter({ discipline: "math", status: "active", search: "prime" })).toEqual({
    discipline: "math",
    status: "active",
    OR: [
      { name: { contains: "prime" } },
      { displayName: { contains: "prime" } },
    ],
  });
  expect(buildResearchModuleFilter({})).toEqual({});
});

test("research modules group by category and use 未分类 for empty categories", () => {
  const grouped = groupResearchModulesByCategory([
    { id: "a", category: "math" },
    { id: "b", category: null },
    { id: "c", category: "math" },
    { id: "d", category: "" },
  ]);
  expect(grouped.math.map((module) => module.id)).toEqual(["a", "c"]);
  expect(grouped["未分类"].map((module) => module.id)).toEqual(["b", "d"]);
});
