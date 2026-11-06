import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createEgyptianFractionSeries, verifyCertificate, verifyPrimeQuadruple } from "../src/lib/math-tournament.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const challengeType = process.argv[2] || "prime_quadruple";
const repeat = Number(process.argv[3] || "1");
if (!["prime_quadruple", "egyptian_fraction"].includes(challengeType)) throw new Error("type must be prime_quadruple or egyptian_fraction");
if (!Number.isInteger(repeat) || repeat < 1 || repeat > 4) throw new Error("repeat must be an integer from 1 to 4");
const PORT = 3102;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const TOKEN = "live-math-competition-token-0123456789abcdef0123456789";
const DATABASE = ".tmp/math-competition-live.db";
const LOG = path.join(ROOT, ".tmp", "math-competition-live-next.log");
fs.rmSync(DATABASE, { force: true });
fs.mkdirSync(path.dirname(LOG), { recursive: true });
const databaseSetup = spawnSync(process.execPath, [path.join(ROOT, "node_modules", "prisma", "build", "index.js"), "db", "push"], {
  cwd: ROOT,
  env: { ...process.env, DATABASE_URL: `file:./${DATABASE}` },
  encoding: "utf8",
  windowsHide: true,
  timeout: 120_000,
});
if (databaseSetup.error) throw databaseSetup.error;
if (databaseSetup.status !== 0) throw new Error(`Temporary database setup failed: ${databaseSetup.stdout || ""}${databaseSetup.stderr || ""}`.slice(0, 1500));
const log = fs.openSync(LOG, "w");
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(PORT)], {
  cwd: ROOT,
  env: { ...process.env, DATABASE_URL: `file:./${DATABASE}`, GARDEN_AGENT_TOKEN: TOKEN, GARDEN_USE_CLUSTER: "0" },
  stdio: ["ignore", log, log],
});
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const headers = { Authorization: `Bearer ${TOKEN}` };
async function call(method, route, body, expected = 200) {
  const response = await fetch(`${ORIGIN}${route}`, {
    method,
    headers: { ...headers, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  assert.equal(response.status, expected, JSON.stringify(payload));
  return payload;
}
function stopTree(child) {
  if (!child || child.exitCode !== null || child.signalCode) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => child.kill(), 5000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  });
}
function findWitness(offset = 0) {
  for (let p = 1_000_000_001 + offset; p < 1_000_500_000; p += 30) {
    if (verifyPrimeQuadruple({ type: "prime_quadruple", start: p, end: p }, { p }).valid) return p;
  }
  throw new Error("No witness found in the bounded local search");
}

try {
  let ready = false;
  for (let index = 0; index < 120; index++) {
    try { if ((await fetch(`${ORIGIN}/api/research/scenarios`, { headers })).ok) { ready = true; break; } } catch { /* starting */ }
    await pause(250);
  }
  assert.ok(ready, "Next.js did not start; inspect .tmp/math-competition-live-next.log");
  const challenges = challengeType === "egyptian_fraction"
    ? createEgyptianFractionSeries(repeat)
    : Array.from({ length: repeat }, (_, index) => {
      const witness = findWitness(index * 30000);
      return { type: "prime_quadruple", start: witness - 999, end: witness + 999 };
    });
  for (const challenge of challenges) {
    if (challenge.type === "prime_quadruple") assert.ok(challenge.start >= 2 && challenge.end - challenge.start + 1 <= 2000);
  }
  const created = await call("POST", "/api/research/competitions", {
    name: challengeType === "egyptian_fraction" ? "互异单位分数证书重复对抗 2026-11-06" : "素数四元组证书对抗 2026-11-06",
    description: "Kimi、OpenAI、Claude 独立构造，双反方复核，确定性整数验证；不是新定理宣称或稳定模型排名。",
    domain: "number_theory",
    format: "tournament",
    status: "active",
    maxRounds: repeat,
    criteria: { mode: "certificate", claimScope: "known_answer_certificate_benchmark" },
  }, 201);
  const competitionId = created.data.id;
  const contestants = [
    { name: "Kimi K3.1 Pro", model: "relay:kimi-k3.1-pro", specialty: "constructive_number_theory" },
    { name: "OpenAI GPT-5.5", model: "relay:gpt-5.5", specialty: "constructive_number_theory" },
    { name: "Claude Opus 5.5", model: "relay:claude-opus-5-5", specialty: "adversarial_number_theory" },
  ];
  for (const contestant of contestants) {
    await call("POST", `/api/research/competitions/${competitionId}/competitors`, {
      ...contestant,
      role: "contestant",
      systemPrompt: "你是严谨的构造性数论研究者。给出候选证书和简短方法，不虚构计算或验证，不宣称新定理。",
    }, 201);
  }
  const rejectedChallenge = challengeType === "egyptian_fraction"
    ? { ...challenges[0], terms: 0 }
    : { type: "prime_quadruple", start: 2, end: 5000 };
  const rejected = await call("POST", `/api/research/competitions/${competitionId}/rounds`, {
    mode: "certificate", challenge: rejectedChallenge,
  }, 400);
  assert.match(rejected.error, challengeType === "egyptian_fraction" ? /terms/ : /range/);

  const summaries = [];
  for (const [index, challenge] of challenges.entries()) {
    if (challenge.type === "egyptian_fraction") {
      const witness = challenge.targetDenominator === 2 ? [3, 7, 78, 91] : [6, 12, 18, 36];
      assert.equal(verifyCertificate(challenge, { denominators: witness }).valid, true, "challenge must have a locally verified witness");
    }
    const result = await call("POST", `/api/research/competitions/${competitionId}/rounds`, {
      mode: "certificate",
      topic: challenge.type === "egyptian_fraction" ? `以四个互异单位分数精确表示 ${challenge.targetNumerator}/${challenge.targetDenominator}` : "在指定的十亿附近区间内构造素数四元组",
      challenge,
    });
    assert.equal(result.success, true);
    assert.equal(result.verificationMode, "deterministic_certificate");
    assert.ok(["complete", "partial"].includes(result.round.content.status));
    assert.equal(result.round.content.results.length, 3);
    assert.equal(result.round.content.reviews.length, 2);
    for (const item of result.round.content.results) {
      assert.equal(item.score, item.verification.valid ? 10 : 0);
      if (item.certificate) assert.equal(verifyCertificate(challenge, item.certificate).valid, item.verification.valid);
      if (item.status === "error") assert.ok(item.error);
      else if (item.status === "evaluated") assert.ok(["stop", "completed", "end_turn"].includes(item.finishReason));
      else assert.ok(!["stop", "completed", "end_turn"].includes(item.finishReason));
    }
    const readback = await call("GET", `/api/research/math-tournaments/${result.tournamentId}`);
    assert.equal(readback.data.id, result.tournamentId);
    assert.equal(readback.data.status, result.round.content.status);
    summaries.push({
      id: result.tournamentId,
      competitionId,
      roundIndex: index + 1,
      challenge,
      claimScope: "known_answer_certificate_benchmark",
      status: readback.data.status,
      modelCallsSucceeded: readback.data.modelCallsSucceeded,
      llmEnabled: result.llmEnabled,
      winners: readback.data.winners,
      winnerInterpretation: "仅表示本轮有效证书持有者；不能将错误视为数学反证，也不能由单次结果推出稳定模型排名。",
      scoringRule: readback.data.scoringRule,
      results: readback.data.results.map((item) => ({
        name: item.name,
        provider: item.provider,
        model: item.model,
        status: item.status,
        certificate: item.certificate,
        verification: item.verification,
        score: item.score,
        finishReason: item.finishReason,
        usage: item.usage,
        latencyMs: item.latencyMs,
        error: item.error,
      })),
      reviewCount: readback.data.reviews.length,
      createdAt: readback.data.createdAt,
    });
  }
  const report = challengeType === "prime_quadruple" && summaries.length === 1 ? summaries[0] : {
    challengeType,
    repeatCount: summaries.length,
    claimScope: "known_answer_certificate_benchmark",
    winnerInterpretation: "各轮 winners 仅表示该轮有效证书持有者，不设置全场总冠军。",
    rounds: summaries,
  };
  const filename = challengeType === "prime_quadruple" && summaries.length === 1 ? "latest-summary.json" : `${challengeType}-repeat-summary.json`;
  const output = path.join(ROOT, "data", "math-tournaments", filename);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await stopTree(server);
  fs.closeSync(log);
  fs.rmSync(DATABASE, { force: true });
  fs.rmSync(`${DATABASE}-journal`, { force: true });
}
