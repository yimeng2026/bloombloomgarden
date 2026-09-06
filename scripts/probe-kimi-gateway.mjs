// Kimi 网关探针：URL 变体 / thinking 开关 / 并发上限
const BASE = process.env.KIMI_BASE_URL.replace(/\/+$/, "");
const KEY = process.env.KIMI_API_KEY;
console.log(`base=${BASE} key=${KEY.slice(0, 6)}...len${KEY.length}`);

async function probe(label, url, body, timeoutMs = 150000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const ms = Date.now() - start;
    const text = await res.text();
    let info = "";
    try {
      const j = JSON.parse(text);
      if (j.error) info = `ERR ${JSON.stringify(j.error).slice(0, 160)}`;
      else {
        const m = j.choices?.[0]?.message || {};
        const hasReasoning = !!(m.reasoning_content || m.reasoning);
        info = `OK model=${j.model} reasoning=${hasReasoning}(${(m.reasoning_content || "").length}ch) content="${(m.content || "").slice(0, 40)}" usage=${JSON.stringify(j.usage || {})}`;
      }
    } catch {
      info = `nonJSON: ${text.slice(0, 120)}`;
    }
    console.log(`[${label}] HTTP=${res.status} ${ms}ms :: ${info}`);
    return { status: res.status, ms };
  } catch (e) {
    console.log(`[${label}] FAIL ${Date.now() - start}ms :: ${(e.message || String(e)).slice(0, 140)}`);
    return { status: -1, ms: Date.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

const prompt = [{ role: "user", content: "只回复两个字:好的" }];

// A. URL 变体
console.log("\n=== A. URL 变体 ===");
await probe("A1 单v1", `${BASE}/chat/completions`, { model: "kimi-for-coding", messages: prompt, temperature: 1, max_tokens: 2048 });
await probe("A2 双v1", `${BASE}/v1/chat/completions`, { model: "kimi-for-coding", messages: prompt, temperature: 1, max_tokens: 2048 });

// B. thinking 开关（仅在 A1 成功的 URL 上）
console.log("\n=== B. thinking 开关 ===");
await probe("B1 thinking.disabled", `${BASE}/chat/completions`, { model: "kimi-for-coding", messages: prompt, temperature: 1, max_tokens: 2048, thinking: { type: "disabled" } });
await probe("B2 reasoning_effort=low", `${BASE}/chat/completions`, { model: "kimi-for-coding", messages: prompt, temperature: 1, max_tokens: 2048, reasoning_effort: "low" });
await probe("B3 reasoning_effort=none", `${BASE}/chat/completions`, { model: "kimi-for-coding", messages: prompt, temperature: 1, max_tokens: 2048, reasoning_effort: "none" });

// C. 模型变体（探非思考模型）
console.log("\n=== C. 模型变体 ===");
await probe("C1 kimi-k2-0905-preview", `${BASE}/chat/completions`, { model: "kimi-k2-0905-preview", messages: prompt, temperature: 1, max_tokens: 2048 });
await probe("C2 kimi-k2-turbo-preview", `${BASE}/chat/completions`, { model: "kimi-k2-turbo-preview", messages: prompt, temperature: 1, max_tokens: 2048 });

// D. 并发实测：5 路同时发
console.log("\n=== D. 并发 x5 ===");
const t0 = Date.now();
const rs = await Promise.all(
  [1, 2, 3, 4, 5].map((i) =>
    probe(`D${i}`, `${BASE}/chat/completions`, { model: "kimi-for-coding", messages: [{ role: "user", content: `只回复数字:${i}` }], temperature: 1, max_tokens: 2048 })
  )
);
console.log(`并发5路: 成功${rs.filter((r) => r.status === 200).length}/5, 总耗时${Date.now() - t0}ms, 延迟=[${rs.map((r) => r.ms).join(",")}]`);
