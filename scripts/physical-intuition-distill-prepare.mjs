import fs from "node:fs";
import { prepareDistillation } from "../src/lib/physical-intuition/distill-prepare.ts";

const manifest = JSON.parse(fs.readFileSync("research/physical-intuition/method-source-manifest.json", "utf8"));
const result = prepareDistillation(manifest);
console.log(JSON.stringify({
  sources: result.sources.map((item) => ({ sourceId: item.source.sourceId, usable: item.usable, reasons: item.reasons })),
  sampleCount: result.samples.length,
  excluded: result.excluded,
  partitionCounts: result.partitionCounts,
  sourceAndLeakagePassed: result.sourceAndLeakagePassed,
  readyForTraining: result.readyForTraining,
  evidenceUpgrade: result.evidenceUpgrade,
}, null, 2));
