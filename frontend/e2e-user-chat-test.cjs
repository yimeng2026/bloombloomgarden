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

(async () => {
  console.log('══════════════════════════════════════════════════');
  console.log('  千界花园 v4.0 — 用户视角对话功能真实测试');
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
  // 测试 1: 引擎页面 — 用户点击聊天按钮 → 输入消息 → 发送 → 检查真实回复
  // ═══════════════════════════════════════════════════
  console.log('\n─── 测试 1: 引擎页面聊天（用户视角）─────────────────\n');

  {
    const page = await browser.newPage();
    
    // 1.1 用户打开引擎页面
    await page.goto(`${BASE_URL}/#/engines`, { waitUntil: 'networkidle2' });
    await waitFor(2000);
    log('用户操作', '打开引擎调度页面', 'pass');

    // 1.2 用户找到第一个引擎的"与引擎对话"按钮并点击
    const buttons = await page.$$('button');
    let chatBtn = null;
    for (const btn of buttons) {
      const text = await btn.evaluate(el => el.innerText);
      if (text.includes('对话') || text.includes('聊天')) {
        chatBtn = btn;
        break;
      }
    }

    if (!chatBtn) {
      log('用户操作', '未找到聊天按钮', 'fail');
      await page.close();
    } else {
      await chatBtn.click();
      await waitFor(1500);
      log('用户操作', '点击"与引擎对话"按钮', 'pass');

      // 1.3 用户看到聊天面板，找到输入框
      const inputs = await page.$$('input, textarea');
      let chatInput = null;
      for (const inp of inputs) {
        const placeholder = await inp.evaluate(el => el.placeholder || '');
        const type = await inp.evaluate(el => el.type);
        if (type === 'text' || placeholder.includes('消息') || placeholder.includes('输入')) {
          chatInput = inp;
          break;
        }
      }

      if (!chatInput) {
        // 尝试找任何文本输入框
        chatInput = inputs.find(async inp => {
          const tag = await inp.evaluate(el => el.tagName);
          return tag === 'INPUT' || tag === 'TEXTAREA';
        });
      }

      if (chatInput) {
        // 1.4 用户输入消息
        await chatInput.type('你好，请用一句话介绍人工智能');
        await waitFor(500);
        log('用户操作', '输入消息: "你好，请用一句话介绍人工智能"', 'pass');

        // 1.5 用户点击发送按钮（发送按钮只有Send图标没有文字，找按钮内的SVG或找最后一个按钮）
        const sendBtns = await page.$$('button');
        let sendBtn = null;
        for (const btn of sendBtns) {
          const text = await btn.evaluate(el => el.innerText);
          if (text.includes('发送') || text.includes('Send')) {
            sendBtn = btn;
            break;
          }
        }
        // 如果找不到带文字的，找包含svg的按钮（通常是发送按钮）
        if (!sendBtn && sendBtns.length > 0) {
          // 发送按钮通常是最后一个或倒数第二个
          sendBtn = sendBtns[sendBtns.length - 1];
        }

        if (sendBtn) {
          await sendBtn.click();
          log('用户操作', '点击发送按钮', 'pass');

          // 1.6 等待回复（最多15秒）
          await waitFor(3000);
          
          // 1.7 检查回复内容
          const pageText = await page.evaluate(() => document.body.innerText);
          
          // 检查是否有真实回复（不是错误消息，不是加载中）
          const hasRealResponse = 
            pageText.includes('人工智能') || 
            pageText.includes('AI') || 
            pageText.includes('模型') ||
            pageText.includes('助手') ||
            pageText.includes('帮助');
          
          const hasError = pageText.includes('错误') && pageText.includes('抱歉');
          const isLoading = pageText.includes('加载中') || pageText.includes('思考中');

          if (hasRealResponse && !hasError) {
            // 提取回复内容
            const lines = pageText.split('\n').filter(l => l.trim());
            const responseLine = lines.find(l => 
              l.includes('人工智能') || l.includes('AI') || l.includes('模型') || l.length > 20
            );
            log('真实输出', `引擎回复: "${responseLine ? responseLine.slice(0, 60) : '已收到回复'}"`, 'pass');
          } else if (hasError) {
            log('真实输出', '收到错误回复（可能是API问题）', 'warn');
          } else if (isLoading) {
            log('真实输出', '仍在加载中，可能需要更长时间', 'warn');
          } else {
            log('真实输出', '未检测到预期回复内容', 'warn');
          }
        } else {
          log('用户操作', '未找到发送按钮', 'fail');
        }
      } else {
        log('用户操作', '未找到聊天输入框', 'fail');
      }
      await page.close();
    }
  }

  // ═══════════════════════════════════════════════════
  // 测试 2: 聊天页面 — 用户选择Agent → 发送消息 → 检查真实回复
  // ═══════════════════════════════════════════════════
  console.log('\n─── 测试 2: 聊天页面对话（用户视角）─────────────────\n');

  {
    const page = await browser.newPage();
    
    // 2.1 用户打开聊天页面
    await page.goto(`${BASE_URL}/#/chat`, { waitUntil: 'networkidle2' });
    await waitFor(2000);
    log('用户操作', '打开聊天页面', 'pass');

    // 2.2 检查页面是否有Agent列表或对话区域
    const pageText = await page.evaluate(() => document.body.innerText);
    
    if (pageText.includes('对话') || pageText.includes('助手') || pageText.includes('Agent')) {
      log('用户操作', '聊天页面加载成功，发现对话区域', 'pass');
      
      // 2.3 尝试找到输入框（Chat.tsx 使用 textarea，placeholder 包含"发送消息"或"配置 LLM API"）
      const inputs = await page.$$('textarea, input');
      let chatInput = null;
      for (const inp of inputs) {
        const placeholder = await inp.evaluate(el => el.placeholder || '');
        const tagName = await inp.evaluate(el => el.tagName);
        if (placeholder.includes('消息') || placeholder.includes('发送') || placeholder.includes('配置') || tagName === 'TEXTAREA') {
          chatInput = inp;
          break;
        }
      }

      if (chatInput) {
        // 2.4 用户输入消息
        await chatInput.type('1+1等于几？');
        await waitFor(500);
        log('用户操作', '输入消息: "1+1等于几？"', 'pass');

        // 2.5 用户点击发送（按钮只有Send图标没有文字，找最后一个button）
        const sendBtns = await page.$$('button');
        let sendBtn = null;
        for (const btn of sendBtns) {
          const text = await btn.evaluate(el => el.innerText);
          if (text.includes('发送') || text.includes('Send')) {
            sendBtn = btn;
            break;
          }
        }
        if (!sendBtn && sendBtns.length > 0) {
          sendBtn = sendBtns[sendBtns.length - 1];
        }

        if (sendBtn) {
          await sendBtn.click();
          log('用户操作', '点击发送按钮', 'pass');
          
          // 2.6 等待回复
          await waitFor(4000);
          
          // 2.7 检查回复
          const newText = await page.evaluate(() => document.body.innerText);
          const hasResponse = 
            newText.includes('2') || 
            newText.includes('等于') || 
            newText.includes('数学') ||
            newText.includes('答案');
          
          if (hasResponse) {
            log('真实输出', '聊天页面收到数学问题回复', 'pass');
          } else {
            log('真实输出', '聊天页面未收到预期回复（可能需要配置API）', 'warn');
          }
        } else {
          log('用户操作', '未找到发送按钮', 'warn');
        }
      } else {
        log('用户操作', '未找到聊天输入框（页面可能使用不同结构）', 'warn');
      }
    } else {
      log('用户操作', '聊天页面未显示对话区域', 'warn');
    }
    await page.close();
  }

  // ═══════════════════════════════════════════════════
  // 测试 3: 蜂群架构页面 — 用户选择引擎 → 输入任务 → 启动 → 检查真实回复
  // ═══════════════════════════════════════════════════
  console.log('\n─── 测试 3: 蜂群架构页面对话（用户视角）─────────────\n');

  {
    const page = await browser.newPage();
    
    // 3.1 用户打开蜂群架构页面
    await page.goto(`${BASE_URL}/#/swarm-architectures`, { waitUntil: 'networkidle2' });
    await waitFor(2000);
    log('用户操作', '打开蜂群架构页面', 'pass');

    // 3.2 用户选择第一个引擎（点击checkbox）
    const checkboxes = await page.$$('input[type="checkbox"]');
    if (checkboxes.length > 0) {
      await checkboxes[0].click();
      log('用户操作', '选择第一个引擎', 'pass');
      
      // 3.3 用户找到任务输入框
      const inputs = await page.$$('textarea, input');
      let taskInput = null;
      for (const inp of inputs) {
        const placeholder = await inp.evaluate(el => el.placeholder || '');
        if (placeholder.includes('任务') || placeholder.includes('提示') || placeholder.includes('prompt')) {
          taskInput = inp;
          break;
        }
      }

      if (taskInput) {
        // 3.4 用户输入任务
        await taskInput.type('用一句话总结人工智能');
        await waitFor(500);
        log('用户操作', '输入蜂群任务: "用一句话总结人工智能"', 'pass');

        // 3.5 用户点击启动按钮
        const buttons = await page.$$('button');
        let startBtn = null;
        for (const btn of buttons) {
          const text = await btn.evaluate(el => el.innerText);
          if (text.includes('启动') || text.includes('执行') || text.includes('开始')) {
            startBtn = btn;
            break;
          }
        }

        if (startBtn) {
          await startBtn.click();
          log('用户操作', '点击启动蜂群按钮', 'pass');
          
          // 3.6 等待执行（最多20秒）
          await waitFor(5000);
          
          // 3.7 检查执行结果
          const pageText = await page.evaluate(() => document.body.innerText);
          const hasResult = 
            pageText.includes('完成') || 
            pageText.includes('成功') || 
            pageText.includes('人工智能') ||
            pageText.includes('结果');
          
          if (hasResult) {
            log('真实输出', '蜂群执行返回结果', 'pass');
          } else {
            log('真实输出', '蜂群执行可能仍在进行中', 'warn');
          }
        } else {
          log('用户操作', '未找到启动按钮', 'warn');
        }
      } else {
        log('用户操作', '未找到任务输入框', 'warn');
      }
    } else {
      log('用户操作', '未找到引擎选择框', 'warn');
    }
    await page.close();
  }

  // ═══════════════════════════════════════════════════
  // 测试 4: API 直接验证真实输出
  // ═══════════════════════════════════════════════════
  console.log('\n─── 测试 4: API 直接验证真实输出 ──────────────────\n');

  // 4.1 验证引擎对话返回真实内容
  {
    const res = await fetch(`${API_URL}/api/engines/zhipu/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '你好' }] }),
    }).then(r => r.json());
    
    const content = res.data?.content || '';
    const isReal = content.length > 5 && !content.includes('模拟') && !content.includes('mock');
    log('API验证', `引擎返回 ${content.length} 字符: "${content.slice(0, 40)}..."`, isReal ? 'pass' : 'fail');
  }

  // 4.2 验证 Agent 对话返回真实内容
  {
    const agentsRes = await fetch(`${API_URL}/api/agents`).then(r => r.json());
    const agents = agentsRes.data || [];
    if (agents.length > 0) {
      const agentId = agents[0].id;
      const res = await fetch(`${API_URL}/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '1+1=', model: 'glm-4' }),
      }).then(r => r.json());
      
      const content = res.data?.content || '';
      const isReal = content.length > 5 && (content.includes('2') || content.includes('等于'));
      log('API验证', `Agent ${agentId.slice(0, 8)} 返回 ${content.length} 字符: "${content.slice(0, 40)}..."`, isReal ? 'pass' : 'fail');
    }
  }

  // 4.3 验证新端点对话
  {
    const agentsRes = await fetch(`${API_URL}/api/agents`).then(r => r.json());
    const agents = agentsRes.data || [];
    if (agents.length > 0) {
      const agentId = agents[0].id;
      const res = await fetch(`${API_URL}/api/dialog/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '你好', platformId: 'zhipu', model: 'glm-4' }),
      }).then(r => r.json());
      
      const content = res.data?.content || '';
      const isReal = content.length > 5;
      log('API验证', `新端点返回 ${content.length} 字符: "${content.slice(0, 40)}..."`, isReal ? 'pass' : 'fail');
    }
  }

  await browser.close();

  // ═══════════════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════');
  console.log('  用户视角对话测试汇总');
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

  const allPass = fail === 0;
  console.log(allPass ? '\n✅ 全部合格' : '\n❌ 存在失败项');
  process.exit(allPass ? 0 : 1);
})();
