import { expect, test } from "bun:test";
import { GraphRAG, graphIngestStatus } from "../../src/lib/graphrag.ts";

test("GraphRAG ingestion status exposes complete, partial and failed extraction", () => {
  expect(graphIngestStatus(3, 0)).toBe("indexed");
  expect(graphIngestStatus(3, 1)).toBe("partial");
  expect(graphIngestStatus(3, 3)).toBe("extraction_failed");
  expect(graphIngestStatus(0, 0)).toBe("extraction_failed");
});

test("invalid extraction JSON fails explicitly instead of becoming an empty graph", () => {
  const graph = new GraphRAG();
  expect(() => graph.parseExtractResult("not JSON")).toThrow("invalid JSON");
  expect(graph.parseExtractResult('{"entities":[],"relations":[]}')).toEqual({
    entities: [],
    relations: [],
  });
});
