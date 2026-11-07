import { expect, test } from "bun:test";
import { formatWorkshopStatement } from "../../src/lib/workshop-content.ts";

test("workshop statements preserve role, specialty and content", () => {
  expect(formatWorkshopStatement({
    role: "reviewer",
    specialty: "lean4",
    content: "检查公理依赖",
  }, 400)).toBe("[reviewer / lean4]: 检查公理依赖");
});

test("workshop statements apply defaults and bound content length", () => {
  expect(formatWorkshopStatement({ content: "abcdef" }, 3)).toBe("[member]: abc");
  expect(formatWorkshopStatement({}, 400)).toBe("[member]: ");
});

test("non-record statements fail closed without inventing content", () => {
  expect(formatWorkshopStatement("plain text", 400)).toBe("[member]: ");
  expect(formatWorkshopStatement(null, 400)).toBe("[member]: ");
  expect(formatWorkshopStatement({ role: 42, content: false }, 400)).toBe("[member]: ");
});
