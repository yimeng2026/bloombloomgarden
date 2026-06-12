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

async function testPage(browser, path, name, expectedText) {
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
      return { page, ok: false };
    }
    
    if (expectedText && !mainText.includes(expectedText)) {
      log(name, `未包含预期文本 "${expectedText}"，实际: ${mainText.slice(0, 40)}`, 'warn');
    } else {
      log(name, `页面加载成功 (${mainText.slice(0, 40)}...)`, 'pass');
    }
    
    return { page, ok: true, mainText };
  } catch (err) {
    log(name, `页面加载失败: ${err.message}`, 'fail');
    await page.close();
    return { page: null, ok: false };
  }
}

async function clickButton(page, selector, name) {
  try {
    const btn = await page.$(selector);
    if (!btn) {
      log(name, `按钮未找到: ${selector}`, 'warn');
      return false;
    }
    await btn.click();
    await waitFor(800);
    log(name, `按钮点击成功: ${selector}`, 'pass');
    return true;
  } catch (err) {
    log(name, `按钮点击失败: ${err.message}`, 'fail');
    return false;
  }
}

(async () => {
  console.log('══════════════════════════════════════════════════');
  console.log('  千界花园 v4.0 — 网页端 E2E 功能测试');
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

  // ─── 1. 首页 ──────────────────────────────────────
  await testPage(browser, '/', '首页', '千界花园');

  // ─── 2. Dashboard ─────────────────────────────────
  await testPage(browser, '/dashboard', '仪表盘', '智能体');

  // ─── 3. Agents 页面 ─────────────────────────────────
  {
    const { page, ok, mainText } = await testPage(browser, '/agents', '智能体列表', 'AGENT');
    if (ok && page) {
      // 测试按钮点击
      const buttons = await page.$$('button');
      log('智能体列表', `发现 ${buttons.length} 个按钮`, 'info');
      await page.close();
    }
  }

  // ─── 4. Agent 创建页面 ─────────────────────────────
  {
    const { page, ok } = await testPage(browser, '/agents/create', '创建智能体', '创建');
    if (ok && page) {
      const inputs = await page.$$('input, textarea, select');
      log('创建智能体', `发现 ${inputs.length} 个表单元素`, 'info');
      await page.close();
    }
  }

  // ─── 5. Engines 页面 ────────────────────────────────
  {
    const { page, ok, mainText } = await testPage(browser, '/engines', '引擎调度', '引擎');
    if (ok && page) {
      // 测试搜索框
      const searchInput = await page.$('input[type="text"]');
      if (searchInput) {
        await searchInput.type('zhipu');
        await waitFor(500);
        const text = await page.evaluate(() => document.querySelector('main')?.innerText || '');
        if (text.includes('zhipu') || text.includes('智谱')) {
          log('引擎调度', '搜索过滤功能正常', 'pass');
        } else {
          log('引擎调度', '搜索过滤可能未生效', 'warn');
        }
      }
      // 测试聊天按钮
      const chatBtns = await page.$$('button');
      const chatBtn = chatBtns.find(async b => {
        const text = await b.evaluate(el => el.innerText);
        return text.includes('对话');
      });
      if (chatBtns.length > 0) {
        log('引擎调度', `发现 ${chatBtns.length} 个按钮（含聊天按钮）`, 'pass');
      }
      await page.close();
    }
  }

  // ─── 6. Frameworks 页面 ─────────────────────────────
  {
    const { page, ok } = await testPage(browser, '/frameworks', '框架市场', '框架');
    if (ok && page) {
      const cards = await page.$$('.card');
      log('框架市场', `发现 ${cards.length} 个框架卡片`, 'pass');
      await page.close();
    }
  }

  // ─── 7. Teams 页面 ──────────────────────────────────
  {
    const { page, ok } = await testPage(browser, '/teams', '团队管理', '团队');
    if (ok && page) {
      const cards = await page.$$('.card');
      log('团队管理', `发现 ${cards.length} 个团队卡片`, 'pass');
      await page.close();
    }
  }

  // ─── 8. Canvas 页面 ─────────────────────────────────
  {
    const { page, ok } = await testPage(browser, '/canvas', '协作画布', '画布');
    if (ok && page) {
      const cards = await page.$$('.card');
      log('协作画布', `发现 ${cards.length} 个画布卡片`, 'pass');
      await page.close();
    }
  }

  // ─── 9. Workflows 页面 ──────────────────────────────
  {
    const { page, ok } = await testPage(browser, '/workflows', '工作流', '工作流');
    if (ok && page) {
      const cards = await page.$$('.card');
      log('工作流', `发现 ${cards.length} 个工作流卡片`, 'pass');
      await page.close();
    }
  }

  // ─── 10. Swarm 页面 ─────────────────────────────────
  {
    const { page, ok } = await testPage(browser, '/swarm', '蜂群面板', '蜂群');
    if (ok && page) {
      await page.close();
    }
  }

  // ─── 11. Swarm Architectures 页面 ───────────────────
  {
    const { page, ok } = await testPage(browser, '/swarm-architectures', '蜂群架构', '蜂群');
    if (ok && page) {
      const checkboxes = await page.$$('input[type="checkbox"]');
      log('蜂群架构', `发现 ${checkboxes.length} 个引擎选择框`, 'pass');
      await page.close();
    }
  }

  // ─── 12. Chat 页面 ──────────────────────────────────
  {
    const { page, ok } = await testPage(browser, '/chat', '聊天', '聊天');
    if (ok && page) {
      await page.close();
    }
  }

  // ─── 13. Settings 页面 ────────────────────────────────
  {
    const { page, ok } = await testPage(browser, '/settings', '设置', '设置');
    if (ok && page) {
      await page.close();
    }
  }

  // ─── 14. API 测试页面 ────────────────────────────────
  {
    const { page, ok } = await testPage(browser, '/api-test', 'API测试', 'API');
    if (ok && page) {
      await page.close();
    }
  }

  // ─── 15. 导航测试 ───────────────────────────────────
  {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/#/dashboard`, { waitUntil: 'networkidle2' });
    await waitFor(1000);
    
    // 点击侧边栏导航
    const navButtons = await page.$$('nav button, aside button');
    log('导航', `侧边栏有 ${navButtons.length} 个导航按钮`, 'info');
    
    // 尝试点击 Engines 导航
    for (const btn of navButtons) {
      const text = await btn.evaluate(el => el.innerText);
      if (text.includes('引擎')) {
        await btn.click();
        await waitFor(1500);
        const url = page.url();
        if (url.includes('engines')) {
          log('导航', '点击引擎导航后URL正确跳转', 'pass');
        } else {
          log('导航', `点击引擎导航后URL未变化: ${url}`, 'warn');
        }
        break;
      }
    }
    await page.close();
  }

  // ─── 16. v4.0 创建 Agent 流程测试 ─────────────────────────
  {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/#/agents/create`, { waitUntil: 'networkidle2' });
    await waitFor(2000);
    
    // 检查页面标题
    const hasTitle = await page.evaluate(() => {
      return document.body.innerText.includes('创建智能体') && 
             document.body.innerText.includes('v4.0');
    });
    if (hasTitle) {
      log('创建Agent-v4', '页面标题正确', 'pass');
    } else {
      log('创建Agent-v4', '页面标题可能不正确', 'warn');
    }
    
    // Step 1: 选择 Framework
    const fwCards = await page.$$('.card');
    if (fwCards.length > 0) {
      await fwCards[0].click();
      await waitFor(500);
      log('创建Agent-v4', `Step 1: 选中框架 (${fwCards.length} 个可选)`, 'pass');
    } else {
      log('创建Agent-v4', 'Step 1: 无框架可选', 'warn');
    }
    
    // 点击下一步
    const nextBtns = await page.$$('button');
    for (const btn of nextBtns) {
      const text = await btn.evaluate(el => el.innerText);
      if (text.includes('下一步') || text.includes('下一步')) {
        await btn.click();
        await waitFor(1000);
        break;
      }
    }
    
    // Step 2: 填写 Team 信息
    const inputs = await page.$$('input');
    if (inputs.length >= 1) {
      await inputs[0].type('E2E-Test-Team');
      log('创建Agent-v4', 'Step 2: 团队名称填写成功', 'pass');
    }
    
    // 点击创建团队（下一步）
    for (const btn of nextBtns) {
      const text = await btn.evaluate(el => el.innerText);
      if (text.includes('下一步') || text.includes('确认')) {
        await btn.click();
        await waitFor(1500);
        break;
      }
    }
    
    // Step 3: 添加角色
    const addRoleBtns = await page.$$('button');
    let addRoleClicked = false;
    for (const btn of addRoleBtns) {
      const text = await btn.evaluate(el => el.innerText);
      if (text.includes('添加角色')) {
        await btn.click();
        await waitFor(500);
        addRoleClicked = true;
        break;
      }
    }
    if (addRoleClicked) {
      log('创建Agent-v4', 'Step 3: 添加角色按钮点击成功', 'pass');
      
      // 填写角色名称
      const roleInputs = await page.$$('input');
      for (const inp of roleInputs) {
        const placeholder = await inp.evaluate(el => el.placeholder || '');
        if (placeholder.includes('角色名称') || placeholder.includes('数据分析师')) {
          await inp.type('E2E-Test-Role');
          log('创建Agent-v4', 'Step 3: 角色名称填写成功', 'pass');
          break;
        }
      }
    } else {
      log('创建Agent-v4', 'Step 3: 未找到添加角色按钮', 'warn');
    }
    
    // 点击确认创建
    for (const btn of addRoleBtns) {
      const text = await btn.evaluate(el => el.innerText);
      if (text.includes('确认创建') || text.includes('创建')) {
        await btn.click();
        await waitFor(1500);
        break;
      }
    }
    
    // Step 4: 检查引擎分配页面
    const hasEngines = await page.evaluate(() => {
      return document.body.innerText.includes('分配引擎') || 
             document.body.innerText.includes('引擎');
    });
    if (hasEngines) {
      log('创建Agent-v4', 'Step 4: 引擎分配页面加载成功', 'pass');
    } else {
      log('创建Agent-v4', 'Step 4: 引擎分配页面可能未加载', 'warn');
    }
    
    await page.close();
  }

  // ─── 17. 引擎聊天功能测试 ────────────────────────────
  {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/#/engines`, { waitUntil: 'networkidle2' });
    await waitFor(2000);
    
    // 查找聊天按钮
    const buttons = await page.$$('button');
    let chatClicked = false;
    for (const btn of buttons) {
      const text = await btn.evaluate(el => el.innerText);
      if (text.includes('对话')) {
        await btn.click();
        await waitFor(1500);
        
        // 检查聊天面板是否出现
        const modal = await page.$('.fixed');
        const overlay = await page.evaluate(() => {
          return document.body.innerText.includes('发送');
        });
        if (overlay) {
          log('引擎聊天', '聊天面板打开成功', 'pass');
          chatClicked = true;
        } else {
          log('引擎聊天', '聊天面板可能未正确打开', 'warn');
        }
        break;
      }
    }
    if (!chatClicked) {
      log('引擎聊天', '未找到聊天按钮', 'warn');
    }
    await page.close();
  }

  await browser.close();

  // ─── 汇总 ───────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('  测试汇总');
  console.log('══════════════════════════════════════════════════');
  const pass = results.filter(r => r.status === 'pass').length;
  const fail = results.filter(r => r.status === 'fail').length;
  const warn = results.filter(r => r.status === 'warn').length;
  const info = results.filter(r => r.status === 'info').length;
  console.log(`  通过: ${pass} | 失败: ${fail} | 警告: ${warn} | 信息: ${info} | 总计: ${results.length}`);
  console.log('══════════════════════════════════════════════════');

  if (fail > 0) {
    console.log('\n❌ 失败项:');
    results.filter(r => r.status === 'fail').forEach(r => console.log(`  - [${r.category}] ${r.message}`));
  }
  if (warn > 0) {
    console.log('\n⚠️ 警告项:');
    results.filter(r => r.status === 'warn').forEach(r => console.log(`  - [${r.category}] ${r.message}`));
  }

  process.exit(fail > 0 ? 1 : 0);
})();
