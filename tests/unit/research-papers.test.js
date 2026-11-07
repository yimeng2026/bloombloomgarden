import { expect, test } from "bun:test";
import { buildResearchPaperFilter, groupResearchPapersByType } from "../../src/lib/research-papers.ts";

test("research paper filters include field, status and supported contains search", () => {
  expect(buildResearchPaperFilter({ field: "math", status: "active", search: "prime" })).toEqual({
    field: "math",
    status: "active",
    OR: [
      { title: { contains: "prime" } },
      { abstract: { contains: "prime" } },
    ],
  });
  expect(buildResearchPaperFilter({})).toEqual({});
});

test("research papers group by type and use Unknown for empty types", () => {
  const grouped = groupResearchPapersByType([
    { id: "a", type: "Hilbert" },
    { id: "b", type: null },
    { id: "c", type: "Hilbert" },
    { id: "d", type: "" },
  ]);
  expect(grouped.Hilbert.map((paper) => paper.id)).toEqual(["a", "c"]);
  expect(grouped.Unknown.map((paper) => paper.id)).toEqual(["b", "d"]);
});
