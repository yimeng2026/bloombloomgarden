import fs from "node:fs";
import path from "node:path";
import { readProtocolFollowupAudit } from "../src/lib/protocol-followup-audit-store.ts";
import { saveProtocolFollowupReview } from "../src/lib/protocol-followup-review-store.ts";
import { runProtocolFollowupReview } from "../src/lib/protocol-followup-review.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
process.chdir(ROOT);
const USAGE = "node --experimental-transform-types --import ./tests/register-ts.mjs tools/run-protocol-followup-review.mjs --audit <basename.json>";

function loadCredentials() {
  for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

function safeError(error) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "[redacted]")
    .replace(/ghp_[A-Za-z0-9]{20,}/g, "[redacted]")
    .replace(/github_pat_[A-Za-z0-9_]{20,}/g, "[redacted]")
    .slice(0, 300);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log(JSON.stringify({ ok: true, mode: "help", usage: USAGE }, null, 2));
    return;
  }
  if (args.length !== 2 || args[0] !== "--audit" || !args[1] || args[1].startsWith("--")) {
    throw new Error("--audit <basename.json> is required and must be the only mode");
  }
  const loaded = readProtocolFollowupAudit(args[1]);
  loadCredentials();
  const review = await runProtocolFollowupReview({ audit: loaded.record });
  const saved = saveProtocolFollowupReview(loaded.record, review);
  console.log(JSON.stringify({
    ok: true,
    auditKey: review.auditKey,
    path: saved.path,
    attempt: saved.attempt,
    status: review.status,
    evidenceUpgrade: false,
    reviews: review.reviews.map((item) => ({
      role: item.role,
      provider: item.provider,
      model: item.model,
      finishReason: item.finishReason,
      hasContent: Boolean(item.content?.trim()),
      error: item.error,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: safeError(error) }));
  process.exitCode = 1;
});
