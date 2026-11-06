import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { verifyCertificate } from "../src/lib/math-tournament.ts";

const root = path.resolve(import.meta.dirname, "..");
const directory = path.join(root, "data", "math-tournaments");
const records = fs.readdirSync(directory).filter((name) => /^[a-f0-9-]{36}\.json$/.test(name)).sort();
const rechecks = [];
for (const name of records) {
  const record = JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
  const results = [];
  for (const result of record.results) {
    if (!result.certificate) continue;
    const verification = verifyCertificate(record.challenge, result.certificate);
    assert.equal(verification.valid, result.verification.valid, `${record.id}: validity changed`);
    assert.equal(result.score, verification.valid ? 10 : 0, `${record.id}: score changed`);
    results.push({ competitorId: result.competitorId, certificate: result.certificate, verification });
  }
  rechecks.push({ tournamentId: record.id, challenge: record.challenge, results });
}
const output = {
  checkedAt: new Date().toISOString(),
  algorithms: [...new Set(rechecks.flatMap((item) => item.results.map((result) => result.verification.algorithm)).filter(Boolean))],
  sourceRecordCount: records.length,
  originalScoresPreserved: true,
  note: "离线重算已有证书，不调用模型，不覆盖原始回答或评审意见。",
  rechecks,
};
fs.writeFileSync(path.join(directory, "rechecks.json"), JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({ sourceRecordCount: records.length, certificateCount: rechecks.flatMap((item) => item.results).length, originalScoresPreserved: true, output: "data/math-tournaments/rechecks.json" }, null, 2));
