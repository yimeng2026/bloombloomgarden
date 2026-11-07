import { expect, test } from "bun:test";
import {
  buildValidationFilter,
  buildValidationGroupUpdate,
  buildValidationResultFilter,
  buildValidatorFilter,
} from "../../src/lib/research-validations.ts";

test("validation filters preserve module, type, status and empty constraints", () => {
  expect(buildValidationFilter("lean", "symbolic", "active")).toEqual({
    targetModule: "lean",
    validationType: "symbolic",
    status: "active",
  });
  expect(buildValidationFilter(null, null, null)).toEqual({});
});

test("validation group updates preserve editable fields and serialize strategies", () => {
  expect(buildValidationGroupUpdate({
    name: "  交叉验证  ",
    description: "检查证明依赖",
    status: "completed",
    validationType: "cross_reference",
    strategy: { independent: true },
  })).toEqual({
    name: "交叉验证",
    description: "检查证明依赖",
    status: "completed",
    validationType: "cross_reference",
    strategy: '{"independent":true}',
  });
});

test("validation group updates omit missing fields and preserve null strategies", () => {
  expect(buildValidationGroupUpdate({})).toEqual({});
  expect(buildValidationGroupUpdate({ strategy: null })).toEqual({ strategy: "null" });
  expect(() => buildValidationGroupUpdate({ description: 42 })).toThrow(
    "description must be a string"
  );
});

test("validation result filters always retain the group", () => {
  expect(buildValidationResultFilter("group-1", "verified")).toEqual({
    groupId: "group-1",
    conclusion: "verified",
  });
  expect(buildValidationResultFilter("group-1", null)).toEqual({ groupId: "group-1" });
});

test("validator filters retain group, role and supported specialty search", () => {
  expect(buildValidatorFilter("group-1", "checker", "lean")).toEqual({
    groupId: "group-1",
    role: "checker",
    specialty: { contains: "lean" },
  });
  expect(buildValidatorFilter("group-1", null, null)).toEqual({ groupId: "group-1" });
});
