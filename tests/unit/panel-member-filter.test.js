import { expect, test } from "bun:test";
import { buildPanelMemberFilter } from "../../src/lib/panel-member-filter.ts";

test("panel member filters preserve panel, specialty and role", () => {
  expect(buildPanelMemberFilter("panel-1", "number_theory", "reviewer")).toEqual({
    panelId: "panel-1",
    specialty: "number_theory",
    role: "reviewer",
  });
});

test("panel member filters include only the panel when optional filters are absent", () => {
  expect(buildPanelMemberFilter("panel-1", null, null)).toEqual({ panelId: "panel-1" });
});
