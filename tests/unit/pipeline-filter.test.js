import { expect, test } from "bun:test";
import { buildPipelineFilter } from "../../src/lib/pipeline-filter.ts";

test("pipeline filter includes status when supplied", () => {
  expect(buildPipelineFilter("active")).toEqual({ status: "active" });
});

test("pipeline filter is empty without status", () => {
  expect(buildPipelineFilter(null)).toEqual({});
  expect(buildPipelineFilter("")).toEqual({});
});
