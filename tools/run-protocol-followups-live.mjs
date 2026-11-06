import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { researchChat } from "../src/lib/research-llm.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = 3105;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const TOKEN = "live-protocol-followups-token-0123456789abcdef";
process.env.GARDEN_AGENT_TOKEN = TOKEN;
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
}
const REQUEST_ID = "ca-six-2026";
const OUTPUT = path.join(ROOT, "data", "protocol-followups");
const LOG = path.join(ROOT, ".tmp", "protocol-followups-live-next.log");
fs.mkdirSync(path.dirname(LOG), { recursive: true });
const log = fs.openSync(LOG, "w");
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(PORT)], {
  cwd: ROOT,
  env: { ...process.env, GARDEN_AGENT_TOKEN: TOKEN, GARDEN_USE_CLUSTER: "0" },
  stdio: ["ignore", log, log],
});
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const headers = { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" };
function stopTree(child) {
  if (!child || child.exitCode !== null || child.signalCode) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => child.kill(), 5000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  });
}
function safeError(error) {
  return (error instanceof Error ? error.message : String(error)).replace(/sk-[A-Za-z0-9_-]{16,}/g, "[redacted]").slice(0, 300);
}
function writeOnce(filename, value) {
  const target = path.join(OUTPUT, filename);
  if (fs.existsSync(target)) {
    const oldData = JSON.parse(fs.readFileSync(target, "utf8"));
    delete oldData.generatedAt;
    const newData = { ...value };
    delete newData.generatedAt;
    if (JSON.stringify(oldData) === JSON.stringify(newData)) return;
    throw new Error(`Refusing to overwrite a changed research record: ${target}`);
  }
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + "\n");
}
function nextReviewFilename() {
  const base = `${REQUEST_ID}-review-2026-11-06`;
  let attempt = 1;
  while (fs.existsSync(path.join(OUTPUT, `${base}${attempt === 1 ? "" : `-attempt-${attempt}`}.json`))) attempt += 1;
  return `${base}${attempt === 1 ? "" : `-attempt-${attempt}`}.json`;
}
function nextDeterministicFilename(value) {
  const initial = `${REQUEST_ID}.json`;
  if (!fs.existsSync(path.join(OUTPUT, initial))) return initial;
  const oldData = JSON.parse(fs.readFileSync(path.join(OUTPUT, initial), "utf8"));
  delete oldData.generatedAt;
  const newData = { ...value };
  delete newData.generatedAt;
  if (JSON.stringify(oldData) === JSON.stringify(newData)) return initial;
  let version = 2;
  while (fs.existsSync(path.join(OUTPUT, `${REQUEST_ID}-v${version}.json`))) version += 1;
  return `${REQUEST_ID}-v${version}.json`;
}

try {
  let ready = false;
  for (let index = 0; index < 120; index++) {
    try { if ((await fetch(`${ORIGIN}/api/research/scenarios`, { headers })).ok) { ready = true; break; } } catch { /* starting */ }
    await pause(250);
  }
  assert.ok(ready, "Next.js did not start; inspect .tmp/protocol-followups-live-next.log");
  const response = await fetch(`${ORIGIN}/api/research/protocol-requests/${REQUEST_ID}/followups`, { headers });
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.equal(payload.success, true, JSON.stringify(payload));
  assert.equal(payload.data.evidenceUpgrade, false);
  assert.equal(payload.data.summary.sourceDocumentRequestCount, 6);
  fs.mkdirSync(OUTPUT, { recursive: true });
  const deterministicFilename = nextDeterministicFilename(payload.data);
  writeOnce(deterministicFilename, payload.data);

  const roles = [
    { id: "method-gap-auditor", provider: "kimi", instruction: "只检查求援项是否与原始证据一致，逐项指出错误证据归属，不补写任何实验字段。" },
    { id: "provenance-reviewer", provider: "relay", model: "claude-opus-5-5", instruction: "审查求援项的来源边界。引用、数据库、讲座和其他研究不能被当成目标原始协议，不补写方法。" },
    { id: "skeptical-reviewer", provider: "relay", model: "gpt-5.5", instruction: "作为反方检查求援项是否遗漏证据边界、错误晋升证据或产生无依据结论。只指出可验证的问题。" },
  ];
  const material = JSON.stringify({ deterministicFollowups: payload.data, sourceRequest: JSON.parse(fs.readFileSync(path.join(ROOT, "data", "protocol-requests", `${REQUEST_ID}.json`), "utf8")) });
  const reviews = await Promise.allSettled(roles.map((role) => researchChat({
    provider: role.provider,
    model: role.model,
    systemPrompt: role.instruction,
    userPrompt: `请审查下列确定性求援结果及原始证据，只指出与材料不符的求援项、来源边界和必须补证的事项，不把建议写成事实，不提升证据等级。请聚焦实质差异，避免逐文档重复模板。材料：${material}`,
    maxTokens: role.provider === "kimi" ? 4096 : 4096,
    timeoutMs: 120000,
    providerAttempts: 1,
    reasoningEffort: "low",
  })));
  const reviewReport = {
    requestId: REQUEST_ID,
    generatedAt: new Date().toISOString(),
    deterministicRecord: `data/protocol-followups/${deterministicFilename}`,
    status: reviews.every((review) => review.status === "fulfilled" && ["stop", "completed", "end_turn"].includes(review.value.finishReason || "")) ? "complete" : "partial",
    evidenceUpgrade: false,
    reviews: reviews.map((review, index) => review.status === "fulfilled" ? {
      role: roles[index].id,
      provider: review.value.provider,
      model: review.value.model,
      finishReason: review.value.finishReason,
      usage: review.value.usage,
      latencyMs: review.value.latencyMs,
      content: review.value.content,
    } : {
      role: roles[index].id,
      provider: roles[index].provider,
      model: roles[index].model || "kimi-for-coding",
      error: safeError(review.reason),
    }),
  };
  writeOnce(nextReviewFilename(), reviewReport);
  console.log(JSON.stringify({ ok: true, requestId: REQUEST_ID, sourceDocumentRequests: payload.data.summary.sourceDocumentRequestCount, reviewStatus: reviewReport.status, evidenceUpgrade: false, reviews: reviewReport.reviews.map((review) => ({ role: review.role, provider: review.provider, model: review.model, finishReason: review.finishReason, error: review.error })) }, null, 2));
} finally {
  await stopTree(server);
  fs.closeSync(log);
}
