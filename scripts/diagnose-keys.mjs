// GLM/智谱 key 401 真因诊断脚本（不打印完整 key，仅前6位+长度+格式特征）
import { readFileSync } from "node:fs";

const mask = (k) => (k ? `${k.slice(0, 6)}...len${k.length}${k.includes(".") ? "[hasDot]" : "[NO-DOT]"}` : "(empty)");
const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const keys = [];
if (env.ZHIPU_API_KEY) keys.push(["ZHIPU_API_KEY", env.ZHIPU_API_KEY]);
for (let i = 1; i <= 10; i++) {
  const k = env[`GLM51_API_KEY_${i}`];
  if (k) keys.push([`GLM51_API_KEY_${i}`, k]);
}
console.log(`发现 ${keys.length} 个智谱 key`);
for (const [name, k] of keys) console.log(`  ${name}: ${mask(k)}`);

const ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

async function testKey(name, key, model) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  const start = Date.now();
  try {
    const res = await fetch(ZHIPU_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 8,
        stream: false,
      }),
      signal: ctrl.signal,
    });
    const ms = Date.now() - start;
    const text = await res.text();
    let snippet = "";
    try {
      const j = JSON.parse(text);
      snippet = j.error ? `${j.error.code || ""} ${j.error.message || ""}`.slice(0, 140) : `OK content=${(j.choices?.[0]?.message?.content || "").slice(0, 30)}`;
    } catch {
      snippet = text.slice(0, 120);
    }
    console.log(`[${name}] model=${model} HTTP=${res.status} ${ms}ms :: ${snippet}`);
    return res.status;
  } catch (e) {
    console.log(`[${name}] model=${model} FETCH-FAIL ${Date.now() - start}ms :: ${(e.message || String(e)).slice(0, 120)}`);
    return -1;
  } finally {
    clearTimeout(timer);
  }
}

// 策略：每个 key 先测 glm-4-flash（免费层，区分"key失效"与"模型无权限"）；
// 若 glm-4-flash 200 再测 glm-5.1 确认目标模型权限。并发 3。
console.log("\n=== 阶段1: glm-4-flash 探测全部 key ===");
const results = [];
for (let i = 0; i < keys.length; i += 3) {
  const batch = keys.slice(i, i + 3);
  const rs = await Promise.all(batch.map(([n, k]) => testKey(n, k, "glm-4-flash")));
  results.push(...rs.map((s, j) => ({ name: batch[j][0], key: batch[j][1], flash: s })));
}
console.log("\n=== 阶段2: 对 flash 通过的 key 复测 glm-5.1 ===");
for (const r of results) {
  if (r.flash === 200) await testKey(r.name, r.key, "glm-5.1");
}
console.log("\n=== 汇总 ===");
for (const r of results) console.log(`  ${r.name}: glm-4-flash -> ${r.flash}`);
