import { expect, test } from "bun:test";
import { buildPanelFilter } from "../../src/lib/panel-filter.ts";

test("panel filter includes domain when supplied", () => {
  expect(buildPanelFilter("mathematics")).toEqual({ domain: "mathematics" });
});

test("panel filter is empty without a domain", () => {
  expect(buildPanelFilter(null)).toEqual({});
  expect(buildPanelFilter("")).toEqual({});
});
