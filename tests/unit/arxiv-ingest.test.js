import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  kbCardPath,
  loadDayFile,
  parseAtom,
  retryDelayMs,
} from "../../src/lib/frontier/arxiv-ingest.ts";

function entry(version, title) {
  return `<entry><id>https://arxiv.org/abs/2501.12345${version}</id><title>${title}</title><summary>Abstract ${version}</summary><published>2025-01-01T00:00:00Z</published><updated>2025-01-02T00:00:00Z</updated><author><name>A. Researcher</name></author><category term="quant-ph"/></entry>`;
}

test("arXiv revisions remain distinct and retain versioned links and cards", () => {
  const parsed = parseAtom(`<feed>${entry("v1", "First")}${entry("v2", "Revised")}</feed>`, "quant-ph");
  expect(parsed.map((item) => item.id)).toEqual(["2501.12345v1", "2501.12345v2"]);
  expect(new Set(parsed.map((item) => item.baseId))).toEqual(new Set(["2501.12345"]));
  expect(parsed[1].link).toBe("https://arxiv.org/abs/2501.12345v2");
  expect(kbCardPath("quant-ph", parsed[0].id).endsWith("2501.12345v1.md")).toBe(true);
  expect(kbCardPath("quant-ph", parsed[1].id).endsWith("2501.12345v2.md")).toBe(true);
});

test("arXiv delays are at least three seconds and honor Retry-After", () => {
  expect(retryDelayMs(null)).toBe(3000);
  expect(retryDelayMs("0")).toBe(3000);
  expect(retryDelayMs("7")).toBe(7000);
  expect(retryDelayMs(new Date(10_000).toUTCString(), 0)).toBe(10_000);
});

test("a corrupt day file is rejected instead of overwritten as empty", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "garden-arxiv-"));
  const previous = process.cwd();
  try {
    const directory = path.join(temporary, "data", "frontier");
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "arxiv_2026-10-27.json"), "{broken", "utf-8");
    process.chdir(temporary);
    expect(() => loadDayFile("2026-10-27")).toThrow("拒绝按空文件覆盖");
  } finally {
    process.chdir(previous);
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
