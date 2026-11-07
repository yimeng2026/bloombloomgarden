import { expect, test } from "bun:test";
import { enrichRoundContentWithLLM } from "../../src/lib/competition-round-content.ts";

const scores = [
  { competitorId: "reviewer-1", name: "Reviewer", score: 8.5 },
  { competitorId: "a", name: "A", score: 7 },
  { competitorId: "b", name: "B", score: 6 },
  { competitorId: "unused", name: "Unused", score: 9 },
];

test("enriches reviewer and bracket entries without mutating the source items", () => {
  const source = [
    { type: "review", reviewerId: "reviewer-1", retained: true },
    {
      type: "match",
      competitorA: { id: "a", name: "A" },
      competitorB: { id: "b", name: "B" },
    },
    { type: "note", text: "unchanged" },
  ];
  const llmContents = [
    { competitorId: "reviewer-1", content: "review text" },
    { competitorId: "a", content: "answer A" },
    { competitorId: "b", content: "answer B" },
    { competitorId: "unused", content: "summary only" },
  ];
  const result = enrichRoundContentWithLLM(source, llmContents, scores);

  expect(source[0].llmContent).toBeUndefined();
  expect(result[0]).toMatchObject({ retained: true, llmContent: "review text", llmScore: 8.5 });
  expect(result[1]).toMatchObject({
    llmContentA: "answer A",
    llmScoreA: 7,
    llmContentB: "answer B",
    llmScoreB: 6,
  });
  expect(result[2]).toEqual({ type: "note", text: "unchanged" });
  expect(result[3].type).toBe("llm_competitor_responses");
  expect(result[3].competitorResponses).toHaveLength(4);
  expect(result[3].competitorResponses[3]).toEqual({
    competitorId: "unused",
    content: "summary only",
    score: 9,
  });
});

test("returns the original array for no results and does not enrich empty responses", () => {
  const source = [{ competitorId: "a", content: "base" }];
  expect(enrichRoundContentWithLLM(source, [], [])).toBe(source);

  const result = enrichRoundContentWithLLM(
    source,
    [{ competitorId: "a", content: "" }],
    [{ competitorId: "a", name: "A", score: -1 }],
  );
  expect(result).toHaveLength(1);
  expect(result[0].llmContent).toBeUndefined();
  expect(result[0].llmScore).toBeUndefined();
});

test("keeps content but records null for a failed score", () => {
  const result = enrichRoundContentWithLLM(
    [{ competitorId: "a" }],
    [{ competitorId: "a", content: "usable text" }],
    [{ competitorId: "a", name: "A", score: -1 }],
  );
  expect(result[0].llmContent).toBe("usable text");
  expect(result[0].llmScore).toBeUndefined();
  expect(result[1].competitorResponses).toEqual([
    { competitorId: "a", content: "usable text", score: null },
  ]);
});
