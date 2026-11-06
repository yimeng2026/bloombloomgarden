import fs from "node:fs";
import path from "node:path";
import { buildMethodLineage } from "../src/lib/method-lineage.ts";

const graph = buildMethodLineage("ca-six-2026");
const directory = path.join("data", "method-lineage");
fs.mkdirSync(directory, { recursive: true });
const target = path.join(directory, "ca-six-2026.json");
fs.writeFileSync(target, JSON.stringify(graph, null, 2) + "\n");
console.log(JSON.stringify({ output: target, summary: graph.summary }, null, 2));
