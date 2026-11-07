import { expect, test } from "bun:test";
import { buildCompetitionFilter } from "../../src/lib/competition-filter.ts";

test("competition filters preserve domain, status and format", () => {
  expect(buildCompetitionFilter({ domain: "mathematics", status: "active", format: "tournament" })).toEqual({
    domain: "mathematics",
    status: "active",
    format: "tournament",
  });
});

test("competition filters omit missing values", () => {
  expect(buildCompetitionFilter({})).toEqual({});
  expect(buildCompetitionFilter({ domain: "", status: null, format: undefined })).toEqual({});
});
