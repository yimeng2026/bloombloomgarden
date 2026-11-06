import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { appendProtocolReviews, createProtocolRequest, getProtocolRequest } from "../src/lib/protocol-requests.ts";

test("truncated model reviews remain in progress and retain finishReason", (t) => {
  const previous = process.env.PROTOCOL_REQUESTS_DIR;
  const store = `.tmp/protocol-review-status-${process.pid}`;
  process.env.PROTOCOL_REQUESTS_DIR = store;
  fs.rmSync(store, { recursive: true, force: true });
  t.after(() => {
    if (previous === undefined) delete process.env.PROTOCOL_REQUESTS_DIR;
    else process.env.PROTOCOL_REQUESTS_DIR = previous;
    fs.rmSync(store, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  createProtocolRequest({
    id: "review-status",
    title: "Review status fixture",
    documents: [{ documentChemblId: "CHEMBL1146805", title: "Fixture", methodStatus: "method_incomplete" }],
  });
  appendProtocolReviews("review-status", [{
    role: "skeptical-reviewer", provider: "relay", model: "gpt-5.5", content: "partial", finishReason: "length",
  }]);
  let request = getProtocolRequest("review-status");
  assert.equal(request.reviews[0].finishReason, "length");
  assert.equal(request.workItems.find((item) => item.id === "panel-review").status, "in_progress");

  appendProtocolReviews("review-status", [{
    role: "skeptical-reviewer", provider: "relay", model: "gpt-5.5", content: "complete", finishReason: "completed",
  }]);
  request = getProtocolRequest("review-status");
  assert.equal(request.workItems.find((item) => item.id === "panel-review").status, "done");
});
