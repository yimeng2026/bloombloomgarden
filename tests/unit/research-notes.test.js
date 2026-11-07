import { expect, test } from "bun:test";
import { buildResearchNoteFilter } from "../../src/lib/research-notes.ts";

test("research note filter includes tags.contains when a tag is supplied", () => {
  expect(buildResearchNoteFilter("proof")).toEqual({ tags: { contains: "proof" } });
});

test("research note filter is empty without a tag", () => {
  expect(buildResearchNoteFilter(null)).toEqual({});
  expect(buildResearchNoteFilter("")).toEqual({});
});
