import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { authorizeAgent } from "../../src/lib/agent-auth.ts";
import {
  ControlError,
  executeOperation,
  findOperation,
  listOperations,
  redactSensitive,
} from "../../src/lib/kimi-control.ts";

test("generated catalog covers both real services and dynamic routes", () => {
  expect(listOperations().length).toBeGreaterThan(400);
  expect(findOperation({ service: "research", method: "GET", path: "/api/research/stats" })).not.toBeNull();
  expect(findOperation({ service: "research", method: "GET", path: "/api/research/tasks/task-1" })).not.toBeNull();
  expect(findOperation({ service: "backend", method: "GET", path: "/api/agents" })).not.toBeNull();
  expect(findOperation({ service: "research", method: "GET", path: "/api/kimi-control" })).toBeNull();
  expect(() => findOperation({ service: "research", method: "GET", path: "/api/../secret" })).toThrow("traversal");
});

test("agent authorization is separate, mandatory and constant-time", () => {
  const previous = process.env.GARDEN_AGENT_TOKEN;
  process.env.GARDEN_AGENT_TOKEN = "a".repeat(40);
  try {
    expect(authorizeAgent(new Request("http://localhost/api/research/stats")).status).toBe(401);
    expect(authorizeAgent(new Request("http://localhost", {
      headers: { Authorization: `Bearer ${"a".repeat(40)}` },
    })).ok).toBe(true);
    expect(authorizeAgent(new Request("http://localhost", {
      headers: { "X-Garden-Agent-Key": "wrong" },
    })).status).toBe(401);
  } finally {
    if (previous === undefined) delete process.env.GARDEN_AGENT_TOKEN;
    else process.env.GARDEN_AGENT_TOKEN = previous;
  }
});

test("operation forwarding redacts secrets, preserves metrics and audits without bodies", async () => {
  const auditDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "garden-control-"));
  const previous = {
    token: process.env.GARDEN_AGENT_TOKEN,
    audit: process.env.GARDEN_AUDIT_DIR,
    backend: process.env.GARDEN_BACKEND_URL,
  };
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({
      apiKey: "must-not-leak",
      nested: { access_token: "must-not-leak" },
      total_tokens: 12,
      tokenCount: 12,
      value: 42,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  process.env.GARDEN_AGENT_TOKEN = "b".repeat(40);
  process.env.GARDEN_AUDIT_DIR = auditDirectory;
  process.env.GARDEN_BACKEND_URL = "http://backend.test";
  try {
    const result = await executeOperation(
      { service: "backend", method: "GET", path: "/api/agents", query: { page: 2 } },
      { researchOrigin: "http://research.test", fetchImpl },
    );
    expect(result.status).toBe(200);
    expect(result.data.apiKey).toBe("[REDACTED]");
    expect(result.data.nested.access_token).toBe("[REDACTED]");
    expect(result.data.total_tokens).toBe(12);
    expect(result.data.tokenCount).toBe(12);
    expect(calls[0].url).toBe("http://backend.test/api/agents?page=2");
    expect(calls[0].init.headers["X-Garden-Agent-Key"]).toBe("b".repeat(40));

    await expect(executeOperation(
      { service: "research", method: "POST", path: "/api/research/tasks", body: { title: "not executed" } },
      { researchOrigin: "http://research.test", fetchImpl },
    )).rejects.toMatchObject({ status: 412 });
    expect(calls).toHaveLength(1);

    await expect(executeOperation(
      { service: "research", method: "GET", path: "/api/not-registered" },
      { researchOrigin: "http://research.test", fetchImpl },
    )).rejects.toBeInstanceOf(ControlError);
    const audit = fs.readFileSync(path.join(auditDirectory, "audit.jsonl"), "utf-8");
    expect(audit).not.toContain("must-not-leak");
    expect(audit).not.toContain("not executed");
    expect(audit.trim().split("\n")).toHaveLength(3);
  } finally {
    if (previous.token === undefined) delete process.env.GARDEN_AGENT_TOKEN;
    else process.env.GARDEN_AGENT_TOKEN = previous.token;
    if (previous.audit === undefined) delete process.env.GARDEN_AUDIT_DIR;
    else process.env.GARDEN_AUDIT_DIR = previous.audit;
    if (previous.backend === undefined) delete process.env.GARDEN_BACKEND_URL;
    else process.env.GARDEN_BACKEND_URL = previous.backend;
    fs.rmSync(auditDirectory, { recursive: true, force: true });
  }
});

test("redaction is recursive without destroying numeric token usage", () => {
  expect(redactSensitive({ password: "x", usage: { total_tokens: 9 } })).toEqual({
    password: "[REDACTED]",
    usage: { total_tokens: 9 },
  });
});
