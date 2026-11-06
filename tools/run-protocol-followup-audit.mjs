import { execFileSync } from "node:child_process";
import path from "node:path";
import {
  buildProtocolFollowupAudit,
  checkProtocolFollowupAuditDrift,
  verifyProtocolFollowupAudit,
} from "../src/lib/protocol-followup-audit.ts";
import {
  readProtocolFollowupAudit,
  readProtocolFollowupBaseline,
  saveProtocolFollowupAudit,
} from "../src/lib/protocol-followup-audit-store.ts";
import { getProtocolRequest } from "../src/lib/protocol-requests.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
process.chdir(ROOT);

const OPTIONS = new Set(["--request-id", "--baseline", "--verify", "--check-current"]);

function parseArguments(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    if (!OPTIONS.has(name)) throw new Error(`Unknown argument: ${name}`);
    const value = values[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
    parsed[name] = value;
    index += 1;
  }
  return parsed;
}

function sourceRevision() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unavailable";
  }
}

function safeError(error) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "[redacted]")
    .replace(/ghp_[A-Za-z0-9]{20,}/g, "[redacted]")
    .replace(/github_pat_[A-Za-z0-9_]{20,}/g, "[redacted]")
    .slice(0, 300);
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const requestId = args["--request-id"];
  const baselineName = args["--baseline"];
  const verifyName = args["--verify"];
  const checkCurrentName = args["--check-current"];
  const modeCount = [Boolean(requestId || baselineName), Boolean(verifyName), Boolean(checkCurrentName)].filter(Boolean).length;
  if (modeCount !== 1) throw new Error("Exactly one CLI mode is required");

  if (verifyName) {
    const loaded = readProtocolFollowupAudit(verifyName);
    const verification = verifyProtocolFollowupAudit(loaded.record);
    console.log(JSON.stringify({ ok: true, mode: "verify", auditKey: verification.auditKey, path: loaded.path, evidenceUpgrade: false }, null, 2));
    return;
  }

  if (checkCurrentName) {
    const loaded = readProtocolFollowupAudit(checkCurrentName);
    const currentRequest = getProtocolRequest(loaded.record.requestId);
    const drift = checkProtocolFollowupAuditDrift(loaded.record, currentRequest);
    console.log(JSON.stringify({ ok: true, mode: "check-current", auditKey: loaded.record.auditKey, ...drift, evidenceUpgrade: false }, null, 2));
    return;
  }

  if (!requestId || !baselineName) throw new Error("Generation mode requires both --request-id and --baseline");
  const { baseline, baselinePath } = readProtocolFollowupBaseline(baselineName, requestId);
  const request = getProtocolRequest(requestId);
  const audit = buildProtocolFollowupAudit({ request, baseline, baselinePath, sourceRevision: sourceRevision() });
  const saved = saveProtocolFollowupAudit(audit);
  console.log(JSON.stringify({
    ok: true,
    mode: "create",
    auditKey: audit.auditKey,
    path: saved.path,
    created: saved.created,
    summary: saved.record.deterministicResult.summary,
    evidenceUpgrade: false,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: safeError(error) }));
  process.exitCode = 1;
}
