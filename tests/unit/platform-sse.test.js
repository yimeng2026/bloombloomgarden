import { expect, test } from "bun:test";
import { parseSSEChunks } from "../../src/lib/platform-sse.ts";

test("parses complete SSE events and preserves their event data", () => {
  const result = parseSSEChunks(
    'data: {"event":"message","answer":"A"}\n\ndata: {"event":"message_end"}\n\n',
  );
  expect(result.parsed).toEqual([
    { event: "message", answer: "A" },
    { event: "message_end" },
  ]);
  expect(result.remaining).toBe("");
});

test("retains an incomplete trailing data line", () => {
  const input = 'data: {"event":"message","answer":"A"}\n\ndata: {"event":"mess';
  const result = parseSSEChunks(input);
  expect(result.parsed).toEqual([{ event: "message", answer: "A" }]);
  expect(result.remaining).toBe('data: {"event":"mess');
});

test("ignores malformed JSON without discarding later valid events", () => {
  const result = parseSSEChunks(
    'data: not-json\n\ndata: {"event":"message","data":{"content":"ok"}}\n\n',
  );
  expect(result.parsed).toEqual([
    { event: "message", data: { content: "ok" } },
  ]);
  expect(result.remaining).toBe("");
});
