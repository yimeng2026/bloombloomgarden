import { expect, test } from "bun:test";
import { buildCompetitorFilter } from "../../src/lib/competitor-filter.ts";

test("competitor filters preserve role and eliminated=true", () => {
  expect(buildCompetitorFilter("competition-1", "contestant", "true")).toEqual({
    competitionId: "competition-1",
    role: "contestant",
    eliminated: true,
  });
});

test("competitor filters distinguish eliminated=false and missing filters", () => {
  expect(buildCompetitorFilter("competition-1", null, "false")).toEqual({
    competitionId: "competition-1",
    eliminated: false,
  });
  expect(buildCompetitorFilter("competition-1", null, null)).toEqual({
    competitionId: "competition-1",
  });
});
