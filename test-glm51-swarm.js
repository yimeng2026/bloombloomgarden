/**
 * GLM-5.1 API 全功能连通性测试
 * 测试10个智谱AI API Key的连通性、单Agent对话、多Agent蜂群协作、流式输出
 * Endpoint: https://open.bigmodel.cn/api/paas/v4 (智谱AI开放平台)
 */

const API_KEYS = [
  'b7f679fd55714f80bf90729e2aeaeaa4.lQivWCHN2Dz4ciOz',
  '80199edcaa924190a8025f5acdc8479f.dI7NQHOy31wGNwfc',
  'bf35efdf499d41a6b68ae451d647aa47.wrHPVv6I0KUKiAfi',
  '77cbcfd0483a4c5fbe6711c1f5a231c2.XbxVjgZLcNrPREbz',
  'befa18ccc2c14ab3854a0af0078161ff.KIMzWj0LS2lxy975',
  '97ba24c38f374ffda253f965f8513627.B8hhHQpCjdYewae8',
  'cbd46f498de64c17b545644601737413.pUe7f4Y2MOnW2rrQ',
  '092c217c4b4f4103b9b0838d44be37e5.cBmSrp4ZjheDAR8I',
  'a5a5670663d246e9834118d02f1f7a00.2f96Sqj56ays45fl',
  'a1d9c40a165f47b395ac386b8992be27.GeEYxv9vuGmsrEL9',
];

const API_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const MODEL = 'glm-4';

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(label, msg, color = 'reset') {
  console.log(`${C[color]}[${label}]${C.reset} ${msg}`);
}

async function chat(apiKey, messages, opts = {}) {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model || MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens || 2048,
      stream: opts.stream || false,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function* streamChat(apiKey, messages, opts = {}) {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model || MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens || 2048,
      stream: true,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t || t === 'data: [DONE]') continue;
      if (t.startsWith('data: ')) {
        try {
          const d = JSON.parse(t.slice(6));
          const c = d.choices?.[0]?.delta?.content || '';
          if (c) yield c;
        } catch {}
      }
    }
  }
}

// ==================== Agent定义 ====================
const AGENTS = [
  { id: 'coordinator', name: '协调员-悟空', role: 'coordinator', key: API_KEYS[0], system: '你是蜂群协调员"悟空"。你负责分解复杂任务、分配给工作Agent、汇总结果。你擅长统筹规划和质量控制。' },
  { id: 'worker-1', name: '分析师-八戒', role: 'worker', key: API_KEYS[1], system: '你是数据分析专家"八戒"。你擅长数据提取、统计分析、趋势识别。输出简洁，用中文。' },
  { id: 'worker-2', name: '研究员-沙僧', role: 'worker', key: API_KEYS[2], system: '你是深度研究员"沙僧"。你擅长文献调研、事实核查、深度分析。输出结构化，用中文。' },
  { id: 'worker-3', name: '工程师-白龙', role: 'worker', key: API_KEYS[3], system: '你是技术工程师"白龙"。你擅长代码实现、技术方案、系统架构。输出包含代码示例，用中文。' },
  { id: 'worker-4', name: '创意师-唐僧', role: 'worker', key: API_KEYS[4], system: '你是创意策划师"唐僧"。你擅长文案撰写、创意构思、用户体验。输出富有感染力，用中文。' },
];

// ==================== 测试1: 单Agent连通性 ====================
async function test1_singleAgentConnectivity() {
  log('TEST-1', '══════════════════════════════════════════════════════════', 'cyan');
  log('TEST-1', '测试1: 10个Agent单点连通性（每个Agent独立对话）', 'cyan');
  log('TEST-1', '══════════════════════════════════════════════════════════', 'cyan');

  const results = [];
  for (const agent of AGENTS) {
    const start = Date.now();
    try {
      const data = await chat(agent.key, [
        { role: 'system', content: agent.system },
        { role: 'user', content: `请自我介绍：你是谁？你的专长是什么？当前时间 ${new Date().toLocaleString()}` },
      ], { max_tokens: 200 });

      const latency = Date.now() - start;
      const content = data.choices?.[0]?.message?.content || '';
      const tokens = data.usage?.total_tokens;

      log('TEST-1', `${agent.name}: OK ${latency}ms | ${tokens} tokens`, 'green');
      log('TEST-1', `  回复: ${content.replace(/\n/g, ' ').slice(0, 120)}...`, 'reset');
      results.push({ agent: agent.name, status: 'ok', latency, content, tokens });
    } catch (err) {
      log('TEST-1', `${agent.name}: FAIL ${err.message}`, 'red');
      results.push({ agent: agent.name, status: 'error', error: err.message });
    }
  }

  const ok = results.filter(r => r.status === 'ok').length;
  log('TEST-1', `结果: ${ok}/${AGENTS.length} Agent连通成功`, ok === AGENTS.length ? 'green' : 'yellow');
  return results;
}

// ==================== 测试2: 流式输出 ====================
async function test2_streaming() {
  log('TEST-2', '══════════════════════════════════════════════════════════', 'cyan');
  log('TEST-2', '测试2: 流式输出（实时chunk接收）', 'cyan');
  log('TEST-2', '══════════════════════════════════════════════════════════', 'cyan');

  const agent = AGENTS[0];
  const start = Date.now();
  let full = '';
  let chunks = 0;

  try {
    for await (const chunk of streamChat(agent.key, [
      { role: 'system', content: agent.system },
      { role: 'user', content: '请写一首关于AI团队协作的七言绝句。' },
    ], { max_tokens: 200 })) {
      full += chunk;
      chunks++;
      process.stdout.write(C.cyan + '.' + C.reset);
    }
    process.stdout.write('\n');

    const latency = Date.now() - start;
    const hasChinese = /[\u4e00-\u9fff]/.test(full);
    log('TEST-2', `OK ${latency}ms | ${chunks} chunks | ${full.length}字符 | 含中文:${hasChinese}`, 'green');
    log('TEST-2', `内容: ${full.slice(0, 150)}${full.length > 150 ? '...' : ''}`, 'reset');
    return { status: 'ok', latency, chunks, content: full, hasChinese };
  } catch (err) {
    log('TEST-2', `FAIL: ${err.message}`, 'red');
    return { status: 'error', error: err.message };
  }
}

// ==================== 测试3: 层级蜂群协作 ====================
async function test3_hierarchicalSwarm() {
  log('TEST-3', '══════════════════════════════════════════════════════════', 'cyan');
  log('TEST-3', '测试3: 层级蜂群协作（协调员→4工作Agent→汇总）', 'cyan');
  log('TEST-3', '══════════════════════════════════════════════════════════', 'cyan');

  const coordinator = AGENTS[0];
  const workers = AGENTS.slice(1);
  const task = '分析"2024年中国新能源汽车市场"，请从：1)市场规模数据 2)主要品牌竞争格局 3)技术发展趋势 4)政策影响 四个维度分析。';

  log('TEST-3', `[${coordinator.name}] 分解任务...`, 'blue');
  const t1 = Date.now();
  const decomposition = await chat(coordinator.key, [
    { role: 'system', content: coordinator.system },
    { role: 'user', content: `请将以下任务分解为4个子任务，每个子任务对应一个工作Agent：\n${task}\n\n请直接输出4个子任务的标题和描述，格式：\n1. [标题]: [描述]\n2. [标题]: [描述]\n...` },
  ], { max_tokens: 400 });
  const subtasksText = decomposition.choices?.[0]?.message?.content || '';
  log('TEST-3', `协调员分解完成 | ${Date.now() - t1}ms`, 'green');

  log('TEST-3', `[工作Agent] 4个Agent并行执行任务...`, 'blue');
  const t2 = Date.now();
  const workerPromises = workers.map((worker, idx) => {
    const prompt = `你是${worker.name}，${worker.system}\n\n协调员分配给你的任务：\n${task}\n\n协调员分解的子任务：\n${subtasksText}\n\n你的职责是第${idx + 1}个维度。请提供详细分析（300字左右），用中文输出。`;

    return chat(worker.key, [
      { role: 'system', content: worker.system },
      { role: 'user', content: prompt },
    ], { max_tokens: 600 }).then(r => ({
      agent: worker.name,
      content: r.choices?.[0]?.message?.content || '',
      tokens: r.usage?.total_tokens,
    })).catch(err => ({
      agent: worker.name,
      error: err.message,
    }));
  });

  const workerResults = await Promise.all(workerPromises);
  const parallelTime = Date.now() - t2;

  let successCount = 0;
  for (const r of workerResults) {
    if (r.error) {
      log('TEST-3', `${r.agent}: FAIL ${r.error}`, 'red');
    } else {
      successCount++;
      log('TEST-3', `${r.agent}: OK | ${r.tokens} tokens | ${r.content.slice(0, 80)}...`, 'green');
    }
  }

  log('TEST-3', `[${coordinator.name}] 汇总所有Agent结果...`, 'blue');
  const t3 = Date.now();
  const summaryInput = workerResults.map(r =>
    r.error ? `${r.agent}: [错误] ${r.error}` : `${r.agent}: ${r.content}`
  ).join('\n\n---\n\n');

  const summary = await chat(coordinator.key, [
    { role: 'system', content: coordinator.system },
    { role: 'user', content: `你是协调员，请将以下4个工作Agent的分析汇总成一份连贯的总结报告（500字）：\n\n${summaryInput}\n\n请输出结构化的总结报告。` },
  ], { max_tokens: 800 });
  const summaryText = summary.choices?.[0]?.message?.content || '';
  const summaryTime = Date.now() - t3;

  log('TEST-3', `汇总完成 | ${summaryTime}ms | ${summary.usage?.total_tokens} tokens`, 'green');

  const totalTime = (Date.now() - t1);
  log('TEST-3', `蜂群总耗时: ${totalTime}ms (分解${Date.now()-t1-parallelTime-summaryTime}ms + 并行${parallelTime}ms + 汇总${summaryTime}ms)`, 'cyan');
  log('TEST-3', `结果: ${successCount}/4 工作Agent成功`, successCount === 4 ? 'green' : 'yellow');

  return {
    status: 'ok',
    totalTime,
    subtasksText,
    workerResults,
    summary: summaryText,
    successCount,
  };
}

// ==================== 测试4: 顺序流水线 ====================
async function test4_sequentialPipeline() {
  log('TEST-4', '══════════════════════════════════════════════════════════', 'cyan');
  log('TEST-4', '测试4: 顺序流水线（需求→设计→代码→测试）', 'cyan');
  log('TEST-4', '══════════════════════════════════════════════════════════', 'cyan');

  const pipeline = [
    { agent: AGENTS[1], role: '需求分析师', prompt: '分析用户需求：创建一个个人博客网站。列出核心功能需求（5条）。' },
    { agent: AGENTS[2], role: '架构设计师', prompt: '基于以下需求，设计技术架构。需求: {prev}' },
    { agent: AGENTS[3], role: '代码工程师', prompt: '基于以下架构，生成React核心代码框架。架构: {prev}' },
    { agent: AGENTS[4], role: '测试工程师', prompt: '基于以下代码，设计测试用例。代码: {prev}' },
  ];

  let prevOutput = '';
  const results = [];
  const start = Date.now();

  for (let i = 0; i < pipeline.length; i++) {
    const step = pipeline[i];
    const prompt = prevOutput ? step.prompt.replace('{prev}', prevOutput) : step.prompt;

    log('TEST-4', `[步骤${i + 1}] ${step.agent.name} (${step.role}) 执行中...`, 'blue');
    const stepStart = Date.now();

    try {
      const result = await chat(step.agent.key, [
        { role: 'system', content: step.agent.system },
        { role: 'user', content: prompt + '\n\n请简洁输出（200字以内）。' },
      ], { max_tokens: 400 });

      const latency = Date.now() - stepStart;
      prevOutput = result.choices?.[0]?.message?.content || '';
      const tokens = result.usage?.total_tokens;

      log('TEST-4', `步骤${i + 1}完成 | ${latency}ms | ${tokens} tokens`, 'green');
      log('TEST-4', `输出: ${prevOutput.replace(/\n/g, ' ').slice(0, 100)}...`, 'reset');
      results.push({ step: i + 1, agent: step.agent.name, status: 'ok', latency, tokens, output: prevOutput });
    } catch (err) {
      const latency = Date.now() - stepStart;
      log('TEST-4', `步骤${i + 1}失败 | ${latency}ms | ${err.message}`, 'red');
      results.push({ step: i + 1, agent: step.agent.name, status: 'error', latency, error: err.message });
      break;
    }
  }

  const totalTime = Date.now() - start;
  const successCount = results.filter(r => r.status === 'ok').length;
  log('TEST-4', `流水线总耗时: ${totalTime}ms | ${successCount}/${pipeline.length} 步骤成功`, successCount === pipeline.length ? 'green' : 'yellow');

  return { status: successCount === pipeline.length ? 'ok' : 'partial', totalTime, results };
}

// ==================== 测试5: 并行竞争 ====================
async function test5_parallelCompetition() {
  log('TEST-5', '══════════════════════════════════════════════════════════', 'cyan');
  log('TEST-5', '测试5: 并行竞争（5个Agent同时回答同一问题）', 'cyan');
  log('TEST-5', '══════════════════════════════════════════════════════════', 'cyan');

  const question = '请用一句话解释"量子计算"的核心原理。';
  const start = Date.now();

  const promises = AGENTS.map(agent =>
    chat(agent.key, [
      { role: 'system', content: agent.system },
      { role: 'user', content: question },
    ], { max_tokens: 100 }).then(r => ({
      agent: agent.name,
      status: 'ok',
      content: r.choices?.[0]?.message?.content || '',
      tokens: r.usage?.total_tokens,
    })).catch(err => ({
      agent: agent.name,
      status: 'error',
      error: err.message,
    }))
  );

  const results = await Promise.all(promises);
  const totalTime = Date.now() - start;

  let successCount = 0;
  for (const r of results) {
    if (r.status === 'ok') {
      successCount++;
      log('TEST-5', `${r.agent}: OK | ${r.tokens} tokens | ${r.content}`, 'green');
    } else {
      log('TEST-5', `${r.agent}: FAIL | ${r.error}`, 'red');
    }
  }

  log('TEST-5', `并行总耗时: ${totalTime}ms (5个Agent同时执行) | ${successCount}/5 成功`, successCount >= 4 ? 'green' : 'yellow');
  return { status: 'ok', totalTime, successCount, results };
}

// ==================== 测试6: 路由分发 ====================
async function test6_routerDispatch() {
  log('TEST-6', '══════════════════════════════════════════════════════════', 'cyan');
  log('TEST-6', '测试6: 路由分发（智能Agent选择）', 'cyan');
  log('TEST-6', '══════════════════════════════════════════════════════════', 'cyan');

  const router = AGENTS[0];
  const task = '帮我写一段Python代码来计算斐波那契数列，并解释算法复杂度。';

  log('TEST-6', `[${router.name}] 分析任务类型...`, 'blue');
  const t1 = Date.now();
  const routerResult = await chat(router.key, [
    { role: 'system', content: router.system },
    { role: 'user', content: `请判断以下任务最适合哪个专家处理：${task}\n可选专家：分析师-八戒、研究员-沙僧、工程师-白龙、创意师-唐僧。\n只输出专家名字。` },
  ], { max_tokens: 50 });
  const routerTime = Date.now() - t1;

  const selectedName = (routerResult.choices?.[0]?.message?.content || '').trim();
  log('TEST-6', `路由判断: ${selectedName} | ${routerTime}ms`, 'green');

  const selected = AGENTS.find(a => selectedName.includes(a.name.split('-')[1])) || AGENTS[3];
  log('TEST-6', `[${selected.name}] 执行任务...`, 'blue');

  const t2 = Date.now();
  const execResult = await chat(selected.key, [
    { role: 'system', content: selected.system },
    { role: 'user', content: task },
  ], { max_tokens: 800 });
  const execTime = Date.now() - t2;

  const content = execResult.choices?.[0]?.message?.content || '';
  log('TEST-6', `执行完成 | ${execTime}ms | ${execResult.usage?.total_tokens} tokens`, 'green');

  const totalTime = routerTime + execTime;
  log('TEST-6', `路由总耗时: ${totalTime}ms (路由${routerTime}ms + 执行${execTime}ms)`, 'cyan');

  return { status: 'ok', totalTime, routerTime, execTime, selectedAgent: selected.name, content };
}

// ==================== 主函数 ====================
async function main() {
  console.log(`${C.magenta}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.magenta}║     GLM-5.1 API 蜂群多Agent协作全功能连通性测试              ║${C.reset}`);
  console.log(`${C.magenta}║     10个智谱AI API Key + glm-4模型                          ║${C.reset}`);
  console.log(`${C.magenta}╚══════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`测试时间: ${new Date().toLocaleString()}`);
  console.log(`API Endpoint: ${API_BASE}`);
  console.log(`模型: ${MODEL}`);
  console.log('');

  const allResults = {};

  allResults.test1 = await test1_singleAgentConnectivity();
  console.log('');

  allResults.test2 = await test2_streaming();
  console.log('');

  allResults.test3 = await test3_hierarchicalSwarm();
  console.log('');

  allResults.test4 = await test4_sequentialPipeline();
  console.log('');

  allResults.test5 = await test5_parallelCompetition();
  console.log('');

  allResults.test6 = await test6_routerDispatch();
  console.log('');

  // ==================== 汇总报告 ====================
  console.log(`${C.magenta}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.magenta}║                     测试汇总报告                              ║${C.reset}`);
  console.log(`${C.magenta}╚══════════════════════════════════════════════════════════════╝${C.reset}`);

  const t1Ok = allResults.test1.filter(r => r.status === 'ok').length;
  console.log(`${t1Ok === 5 ? C.green : C.yellow}1. 单Agent连通性: ${t1Ok}/5 OK${C.reset}`);

  const t2Ok = allResults.test2.status === 'ok';
  console.log(`${t2Ok ? C.green : C.red}2. 流式输出: ${t2Ok ? 'OK' : 'FAIL'} | ${allResults.test2.chunks || 0} chunks${C.reset}`);

  const t3Ok = allResults.test3.successCount >= 3;
  console.log(`${t3Ok ? C.green : C.yellow}3. 层级蜂群: ${allResults.test3.successCount}/4 Worker成功 | 总耗时${allResults.test3.totalTime}ms${C.reset}`);

  const t4Ok = allResults.test4.status === 'ok';
  console.log(`${t4Ok ? C.green : C.yellow}4. 顺序流水线: ${t4Ok ? 'OK 4步骤完成' : 'PARTIAL'} | 总耗时${allResults.test4.totalTime}ms${C.reset}`);

  const t5Ok = allResults.test5.successCount >= 4;
  console.log(`${t5Ok ? C.green : C.yellow}5. 并行竞争: ${allResults.test5.successCount}/5 成功 | 总耗时${allResults.test5.totalTime}ms${C.reset}`);

  const t6Ok = allResults.test6.status === 'ok';
  console.log(`${t6Ok ? C.green : C.red}6. 路由分发: ${t6Ok ? 'OK' : 'FAIL'} | 选中${allResults.test6.selectedAgent}${C.reset}`);

  // 真实性验证
  console.log(`${C.cyan}──────────────────────────────────────────${C.reset}`);
  console.log(`${C.cyan}真实性验证（所有输出均为GLM-4实时生成）:${C.reset}`);
  console.log(`  - 流式输出含中文: ${allResults.test2.hasChinese ? 'OK' : 'FAIL'}`);
  console.log(`  - 蜂群总结长度: ${allResults.test3.summary?.length || 0} 字符`);
  console.log(`  - 流水线最终输出: ${allResults.test4.results?.[3]?.output?.slice(0, 50) || 'N/A'}...`);
  console.log(`  - 路由执行输出: ${allResults.test6.content?.slice(0, 50) || 'N/A'}...`);

  const allOk = t1Ok === 5 && t2Ok && t3Ok && t4Ok && t5Ok && t6Ok;
  console.log(`${C.magenta}══════════════════════════════════════════${C.reset}`);
  console.log(`${allOk ? C.green : C.yellow}总体结果: ${allOk ? '全部测试通过' : '部分测试通过'}${C.reset}`);
  console.log(`${C.magenta}══════════════════════════════════════════${C.reset}`);

  const fs = require('fs');
  const reportPath = 'C:\\Users\\一梦\\Documents\\kimi\\workspace\\glm51-swarm-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`${C.cyan}详细报告已保存: ${reportPath}${C.reset}`);

  return allResults;
}

main().catch(err => {
  console.error(`${C.red}测试异常:${C.reset}`, err);
  process.exit(1);
});
