import { expect, test } from "bun:test";
import { requireLlmText } from "../../src/lib/llm-content.ts";

test("LLM response accepts only explicit answer text", () => {
  expect(requireLlmText("answer", "openai")).toBe("answer");
  expect(
    requireLlmText(
      [
        { type: "text", text: "first" },
        { type: "reasoning", text: "hidden" },
        { type: "text", text: "second" },
      ],
      "anthropic",
    ),
  ).toBe("first\nsecond");
});

test("empty content and reasoning-only payloads are rejected", () => {
  expect(() => requireLlmText(undefined, "kimi")).toThrow("正文为空");
  expect(() => requireLlmText("", "kimi")).toThrow("正文为空");
  expect(() => requireLlmText([{ type: "reasoning", text: "hidden" }], "kimi")).toThrow("正文为空");
});
