const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3002';
const API_URL = 'http://localhost:3001';

const results = [];

function log(category, message, status = 'info') {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : status === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${icon} [${category}] ${message}`);
  results.push({ category, message, status, time: new Date().toISOString() });
}

async function waitFor(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testPage(browser, path, name) {
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE_URL}/#${path}`, { waitUntil: 'networkidle2', timeout: 15000 });
    await waitFor(2000);
    
    const mainText = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.innerText : '';
    });
    
    if (!mainText || mainText.trim().length === 0) {
      log(name, 'main 区域为空', 'fail');
      await page.close();
      return { page: null, ok: false };
    }
    
    log(name, `页面加载成功`, 'pass');
    return { page, ok: true, mainText };
  } catch (err) {
    log(name, `页面加载失败: ${err.message}`, 'fail');
    await page.close();
    return { page: null, ok: false };
  }
}

(async () => {
  console.log('══════════════════════════════════════════════════');
  console.log('  千界花园 v4.0 — Agent+群组+对话 全流程 E2E 测试');
  console.log('══════════════════════════════════════════════════\n');

  // 检查服务状态
  try {
    const health = await fetch(`${API_URL}/api/health`).then(r => r.json());
    log('系统', `后端健康: ${health.status}`, 'pass');
  } catch {
    log('系统', '后端服务未启动，测试终止', 'fail');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ═══════════════════════════════════════════════════
  // 阶段 1: Agent 创建全流程
  // ═══════════════════════════════════════════════════
  console.log('\n─── 阶段 1: Agent 创建全流程 ──────────────────────\n');

  // 1.1 访问 Agent 列表
  {
    const { page, ok, mainText } = await testPage(browser, '/agents', 'Agent列表页');
    if (ok && page) {
      const hasAgents = mainText.includes('智能体');
      log('Agent列表', hasAgents ? '显示智能体列表' : '未显示智能体', hasAgents ? 'pass' : 'warn');
      
      // 1.2 点击创建按钮
      const createBtn = await page.$('button');
      if (createBtn) {
        const btnText = await createBtn.evaluate(el => el.innerText);
        if (btnText.includes('新建') || btnText.includes('创建')) {
          log('Agent创建', `发现创建按钮: "${btnText}"`, 'pass');
        }
      }
      await page.close();
    }
  }

  // 1.3 访问创建页面
  {
    const { page, ok, mainText } = await testPage(browser, '/agents/create', 'Agent创建页');
    if (ok && page) {
      const hasForm = mainText.includes('创建') || mainText.includes('模式');
      log('Agent创建', hasForm ? '创建表单加载成功' : '创建表单可能未加载', hasForm ? 'pass' : 'warn');
      await page.close();
    }
  }

  // 1.4 API 验证 Agent 创建
  {
    const res = await fetch(`${API_URL}/api/agents`).then(r => r.json());
    const count = res.total || res.data?.length || 0;
    log('Agent创建', `后端共有 ${count} 个Agent`, count > 0 ? 'pass' : 'fail');
  }

  // ═══════════════════════════════════════════════════
  // 阶段 2: 群组组合全流程
  // ═══════════════════════════════════════════════════
  console.log('\n─── 阶段 2: 群组组合全流程 ──────────────────────\n');

  // 2.1 访问群组列表
  {
    const { page, ok, mainText } = await testPage(browser, '/groups', '群组列表页');
    if (ok && page) {
      const hasGroups = mainText.includes('群组') || mainText.includes('协作组');
      log('群组列表', hasGroups ? '显示群组列表' : '未显示群组', hasGroups ? 'pass' : 'warn');
      await page.close();
    }
  }

  // 2.2 API 创建测试群组
  const testAgentIds = [];
  try {
    const agentsRes = await fetch(`${API_URL}/api/agents`).then(r => r.json());
    const agents = agentsRes.data || [];
    testAgentIds.push(...agents.slice(-3).map(a => a.id));
    log('群组准备', `获取 ${testAgentIds.length} 个Agent用于群组测试`, 'pass');
  } catch (e) {
    log('群组准备', `获取Agent失败: ${e.message}`, 'fail');
  }

  // 2.3 创建群组
  let testGroupId = null;
  if (testAgentIds.length >= 2) {
    try {
      const res = await fetch(`${API_URL}/api/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'E2E-Flow-Group',
          description: '全流程测试群组',
          executionMode: 'sequential',
          entityIds: testAgentIds.slice(0, 3),
          entityType: 'agents',
        }),
      }).then(r => r.json());
      testGroupId = res.data?.id;
      log('群组创建', `创建群组成功: ${testGroupId}`, testGroupId ? 'pass' : 'fail');
    } catch (e) {
      log('群组创建', `创建群组失败: ${e.message}`, 'fail');
    }
  }

  // 2.4 验证群组详情
  if (testGroupId) {
    try {
      const res = await fetch(`${API_URL}/api/groups/${testGroupId}`).then(r => r.json());
      const group = res.data;
      const hasAgents = group?.entityIds?.length > 0;
      log('群组详情', `群组包含 ${group?.entityIds?.length || 0} 个Agent`, hasAgents ? 'pass' : 'fail');
    } catch (e) {
      log('群组详情', `获取详情失败: ${e.message}`, 'fail');
    }
  }

  // 2.5 网页端群组详情页
  if (testGroupId) {
    const { page, ok, mainText } = await testPage(browser, `/groups/${testGroupId}`, '群组详情页');
    if (ok && page) {
      const hasDetail = mainText.includes('成员') || mainText.includes('Agent') || mainText.includes('智能体');
      log('群组详情页', hasDetail ? '显示群组详情和成员' : '未显示成员信息', hasDetail ? 'pass' : 'warn');
      await page.close();
    }
  }

  // 2.6 群组执行
  if (testGroupId) {
    try {
      const res = await fetch(`${API_URL}/api/groups/${testGroupId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: '用一句话总结人工智能' }),
      }).then(r => r.json());
      log('群组执行', `执行结果: ${res.success ? '成功' : '失败'}`, res.success ? 'pass' : 'fail');
    } catch (e) {
      log('群组执行', `执行失败: ${e.message}`, 'fail');
    }
  }

  // ═══════════════════════════════════════════════════
  // 阶段 3: 对话全流程
  // ═══════════════════════════════════════════════════
  console.log('\n─── 阶段 3: 对话全流程 ──────────────────────\n');

  // 3.1 Agent 对话（旧端点）
  if (testAgentIds.length > 0) {
    const agentId = testAgentIds[0];
    try {
      const res = await fetch(`${API_URL}/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '你好，请用一句话介绍自己', model: 'glm-4' }),
      }).then(r => r.json());
      const hasContent = res.data?.content && res.data.content.length > 10;
      log('Agent对话', `Agent ${agentId.slice(0, 8)} 返回 ${res.data?.content?.length || 0} 字符`, hasContent ? 'pass' : 'fail');
    } catch (e) {
      log('Agent对话', `对话失败: ${e.message}`, 'fail');
    }
  }

  // 3.2 新端点对话
  if (testAgentIds.length > 0) {
    const agentId = testAgentIds[0];
    try {
      const res = await fetch(`${API_URL}/api/dialog/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '1+1等于几', platformId: 'zhipu', model: 'glm-4' }),
      }).then(r => r.json());
      const hasContent = res.data?.content && res.data.content.length > 5;
      log('新端点对话', `返回 ${res.data?.content?.length || 0} 字符`, hasContent ? 'pass' : 'fail');
    } catch (e) {
      log('新端点对话', `对话失败: ${e.message}`, 'fail');
    }
  }

  // 3.3 引擎对话
  try {
    const res = await fetch(`${API_URL}/api/engines/zhipu/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '你好' }] }),
    }).then(r => r.json());
    const hasContent = res.data?.content && res.data.content.length > 5;
    log('引擎对话', `智谱引擎返回 ${res.data?.content?.length || 0} 字符`, hasContent ? 'pass' : 'fail');
  } catch (e) {
    log('引擎对话', `引擎对话失败: ${e.message}`, 'fail');
  }

  // 3.4 网页端聊天页面
  {
    const { page, ok, mainText } = await testPage(browser, '/chat', '聊天页面');
    if (ok && page) {
      const hasChat = mainText.includes('对话') || mainText.includes('聊天') || mainText.includes('助手');
      log('聊天页面', hasChat ? '聊天界面加载成功' : '聊天界面可能未加载', hasChat ? 'pass' : 'warn');
      await page.close();
    }
  }

  // 3.5 对话历史
  if (testAgentIds.length > 0) {
    const agentId = testAgentIds[0];
    try {
      const res = await fetch(`${API_URL}/api/agents/${agentId}/context`).then(r => r.json());
      const msgCount = res.data?.messages?.length || 0;
      log('对话历史', `Agent ${agentId.slice(0, 8)} 有 ${msgCount} 条历史消息`, msgCount > 0 ? 'pass' : 'warn');
    } catch (e) {
      log('对话历史', `获取历史失败: ${e.message}`, 'fail');
    }
  }

  // ═══════════════════════════════════════════════════
  // 阶段 4: 网页端交互验证
  // ═══════════════════════════════════════════════════
  console.log('\n─── 阶段 4: 网页端交互验证 ──────────────────────\n');

  // 4.1 引擎页面搜索和聊天按钮
  {
    const { page, ok } = await testPage(browser, '/engines', '引擎页面交互');
    if (ok && page) {
      // 测试搜索
      const searchInput = await page.$('input[type="text"]');
      if (searchInput) {
        await searchInput.type('zhipu');
        await waitFor(500);
        const text = await page.evaluate(() => document.querySelector('main')?.innerText || '');
        if (text.includes('zhipu') || text.includes('智谱')) {
          log('引擎搜索', '搜索过滤功能正常', 'pass');
        }
      }
      
      // 查找聊天按钮
      const buttons = await page.$$('button');
      let chatFound = false;
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.innerText);
        if (text.includes('对话')) {
          chatFound = true;
          break;
        }
      }
      log('引擎聊天按钮', chatFound ? '发现聊天按钮' : '未找到聊天按钮', chatFound ? 'pass' : 'warn');
      await page.close();
    }
  }

  // 4.2 群组页面导航
  {
    const { page, ok } = await testPage(browser, '/groups', '群组页面导航');
    if (ok && page) {
      const buttons = await page.$$('button');
      log('群组页面', `发现 ${buttons.length} 个可交互按钮`, 'pass');
      await page.close();
    }
  }

  // 4.3 工作流页面
  {
    const { page, ok, mainText } = await testPage(browser, '/workflows', '工作流页面');
    if (ok && page) {
      const hasWorkflows = mainText.includes('工作流');
      log('工作流页面', hasWorkflows ? '工作流列表加载成功' : '工作流列表未加载', hasWorkflows ? 'pass' : 'warn');
      await page.close();
    }
  }

  // 4.4 Swarm 架构页面
  {
    const { page, ok, mainText } = await testPage(browser, '/swarm-architectures', '蜂群架构页面');
    if (ok && page) {
      const hasConfig = mainText.includes('蜂群配置') || mainText.includes('选择引擎');
      log('蜂群架构', hasConfig ? '蜂群配置面板加载成功' : '配置面板未加载', hasConfig ? 'pass' : 'warn');
      await page.close();
    }
  }

  await browser.close();

  // ═══════════════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════');
  console.log('  全流程测试汇总');
  console.log('══════════════════════════════════════════════════');
  const pass = results.filter(r => r.status === 'pass').length;
  const fail = results.filter(r => r.status === 'fail').length;
  const warn = results.filter(r => r.status === 'warn').length;
  console.log(`  通过: ${pass} | 失败: ${fail} | 警告: ${warn} | 总计: ${results.length}`);
  console.log('══════════════════════════════════════════════════');

  if (fail > 0) {
    console.log('\n❌ 失败项:');
    results.filter(r => r.status === 'fail').forEach(r => console.log(`  - [${r.category}] ${r.message}`));
  }
  if (warn > 0) {
    console.log('\n⚠️ 警告项:');
    results.filter(r => r.status === 'warn').forEach(r => console.log(`  - [${r.category}] ${r.message}`));
  }

  // 最终判定
  const allPass = fail === 0;
  console.log(allPass ? '\n✅ 全部合格' : '\n❌ 存在失败项');
  process.exit(allPass ? 0 : 1);
})();
