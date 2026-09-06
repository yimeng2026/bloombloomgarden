// 深筛样段提速实测：~2k 字符学术文本，baseline(思考开) vs reasoning_effort=none
const BASE = process.env.KIMI_BASE_URL.replace(/\/+$/, "");
const KEY = process.env.KIMI_API_KEY;
const para = "本文研究拓扑绝缘体 Bi2Se3 薄膜在外加栅压调控下的量子输运性质。通过角分辨光电子能谱(ARPES)与低温强磁输运测量,我们观测到表面态狄拉克锥在栅压超过阈值时出现明显的能隙打开现象,其大小随栅压近似线性增长。基于有效 k·p 模型与自洽泊松-薛定谔求解,我们将该能隙归因于结构反演不对称性诱导的 Rashba 型自旋轨道耦合与体反演对称性破缺的协同作用。进一步地,霍尔 bar 器件中的弱反局域化拟合给出相位相干长度随温度的幂律依赖,指数与二维电子气理论预言一致。我们的结果为拓扑表面态的电控操纵提供了实验依据,并为基于拓扑绝缘体的低功耗自旋电子学器件设计提供了定量参考。";
const text = (para + "\n" + para.replace("本文", "此外,本文") ).slice(0, 2000);
const prompt = `你是学术深筛评审员。请对以下论文段落给出:1) 一句话核心贡献;2) 方法可靠性评分(1-10);3) 是否建议进入精读队列(是/否)。\n\n${text}`;
console.log(`样段长度: ${prompt.length} 字符`);

async function run(label, extra) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 280000);
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ model: "kimi-for-coding", messages: [{ role: "user", content: prompt }],
        temperature: 1, max_tokens: 12288, ...extra }),
      signal: ctrl.signal,
    });
    const ms = Date.now() - t0;
    const j = await res.json();
    const rt = j.usage?.completion_tokens_details?.reasoning_tokens ?? "?";
    const ct = j.usage?.completion_tokens ?? "?";
    console.log(`[${label}] HTTP=${res.status} ${ms}ms (${(ms/1000).toFixed(1)}s) reasoning_tokens=${rt} completion_tokens=${ct} 正文长度=${(j.choices?.[0]?.message?.content||"").length}`);
    return { label, ms, ok: res.status === 200 };
  } catch (e) {
    console.log(`[${label}] FAIL ${Date.now()-t0}ms ${String(e.message||e).slice(0,100)}`);
    return { label, ms: Date.now()-t0, ok: false };
  } finally { clearTimeout(timer); }
}

const t0 = Date.now();
const [base, n1, n2, n3] = await Promise.all([
  run("baseline 思考全开", {}),
  run("none#1", { reasoning_effort: "none" }),
  run("none#2 并发", { reasoning_effort: "none" }),
  run("none#3 并发", { reasoning_effort: "none" }),
]);
const wall = ((Date.now()-t0)/1000).toFixed(1);
const nones = [n1,n2,n3].filter(r=>r.ok);
console.log(`\n总墙钟 ${wall}s | baseline=${(base.ms/1000).toFixed(1)}s | none并发3路: 成功${nones.length}/3, 平均 ${(nones.reduce((s,r)=>s+r.ms,0)/Math.max(1,nones.length)/1000).toFixed(1)}s`);
if (base.ok && nones.length) console.log(`提速比: ${(base.ms/(nones.reduce((s,r)=>s+r.ms,0)/nones.length)).toFixed(2)}x (单段)`);
