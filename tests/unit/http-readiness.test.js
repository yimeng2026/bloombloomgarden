import { expect, test } from "bun:test";
import { waitForHttpReady } from "../../scripts/http-readiness.mjs";

test("a read-only readiness probe tolerates a transient reset before writes", async () => {
  let calls = 0;
  await waitForHttpReady({
    origin: "http://service.test",
    attempts: 3,
    delayMs: 0,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("fetch failed", { cause: { code: "ECONNRESET" } });
      return new Response("ok", { status: 200 });
    },
  });
  expect(calls).toBe(2);
});

test("readiness failures remain bounded and preserve the connection error", async () => {
  let calls = 0;
  await expect(waitForHttpReady({
    origin: "http://service.test",
    attempts: 3,
    delayMs: 0,
    fetchImpl: async () => {
      calls += 1;
      throw new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } });
    },
  })).rejects.toThrow("ECONNREFUSED");
  expect(calls).toBe(3);
});
