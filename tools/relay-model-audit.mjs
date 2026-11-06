import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env.local");
if (!fs.existsSync(envPath)) throw new Error("Missing local .env.local; create it from .env.example without committing secrets.");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
}
const base = (process.env.POOL_RELAY_BASE_URL || "").replace(/\/+$/, "");
const keyNames = ["POOL_RELAY_API_KEY", ...Array.from({ length: 11 }, (_, index) => `POOL_RELAY_API_KEY_${index + 2}`)];
const keys = [...new Set(keyNames.map((name) => process.env[name]?.trim()).filter(Boolean))];
if (!base || keys.length === 0) throw new Error("Relay base URL and keys are required in .env.local.");
const redact = (text) => keys.reduce((result, key) => result.replaceAll(key, "[redacted]"), String(text)).slice(0, 300);
const option = (name) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const candidates = /^(gpt-5\.4|gpt-5\.5|claude-opus|claude-sonnet|claude-haiku|kimi-k3|gemini-3\.1|deepseek-v4\.1)/;
const report = { generatedAt: new Date().toISOString(), keyCount: keys.length, modelChecks: [] };
const results = await Promise.all(keys.map(async (key, index) => {
  try {
    const response = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30000) });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = null; }
    const ids = Array.isArray(body?.data) ? body.data.map((model) => model.id).filter((id) => typeof id === "string") : [];
    return { keySlot: index + 1, status: response.status, modelCount: ids.length, candidates: ids.filter((id) => candidates.test(id)), error: response.ok ? undefined : redact(text) };
  } catch (error) { return { keySlot: index + 1, error: redact(error.message) }; }
}));
report.modelChecks = results;
console.log(JSON.stringify(report, null, 2));
fs.mkdirSync(path.join(root, ".tmp"), { recursive: true });
fs.writeFileSync(path.join(root, ".tmp", "relay-model-audit.json"), JSON.stringify(report, null, 2) + "\n");

const model = option("--model");
if (model && results.some((result) => result.status === 200)) {
  const style = option("--style") || "chat_completions";
  if (!["responses", "chat_completions"].includes(style)) throw new Error("Unknown --style");
  process.env.POOL_RELAY_MODEL = model;
  process.env.POOL_RELAY_API_STYLE = style;
  process.env.POOL_RELAY_REASONING_EFFORT = option("--effort") || "low";
  const { poolChat, reloadPool } = await import("../src/lib/provider-pool.ts");
  reloadPool();
  const systemPrompt = "You are a skeptical research provenance auditor. Do not upgrade evidence beyond the supplied record. Return concise JSON with fields verdict, missing_protocol_fields, forbidden_inferences, and next_action.";
  const userPrompt = `Record: six publications report carbonic anhydrase inhibition. One explicitly matches the stopped-flow CO2 hydration esterase assay; five have only abstract or publisher snippets. Three independent database rows say Curated by ChEMBL, so they are not independent experiments. No full protocols have been received. An author request email has a sent receipt but no reply. Evaluate only this record. Do not browse or invent experimental details.`;
  try {
    const response = await poolChat({ providerId: "relay", systemPrompt, userPrompt, model, reasoningEffort: process.env.POOL_RELAY_REASONING_EFFORT, maxTokens: Number(option("--max-tokens") || 900), timeoutMs: 180000 });
    const protocol = process.env.POOL_RELAY_RESPONSES_MODELS
      ? process.env.POOL_RELAY_RESPONSES_MODELS.split(",").map((item) => item.trim()).includes(model)
      : style === "responses";
    const inference = { model, configuredStyle: style, protocol: protocol ? "responses" : "chat_completions", provider: response.provider, returnedModel: response.model, latencyMs: response.latencyMs, finishReason: response.finishReason, usage: response.usage, content: response.content };
    fs.writeFileSync(path.join(root, ".tmp", `relay-inference-${model.replace(/[^a-z0-9.-]/gi, "-")}-${inference.protocol}.json`), JSON.stringify(inference, null, 2) + "\n");
    console.log(JSON.stringify({ inference: { ...inference, content: `[saved ${response.content.length} characters]` } }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ inference: { model, style, error: redact(error.message) } }, null, 2));
    process.exitCode = 1;
  }
}
