const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  console.log('🌐 打开千界花园 Agent 创建页面...');
  await page.goto('http://localhost:3002/#/agents/create', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  
  // Step 1: 选择第一个框架
  const fwCards = await page.$$('[class*="card"]');
  if (fwCards.length > 0) {
    await fwCards[0].click();
    await new Promise(r => setTimeout(r, 500));
  }
  
  // 点击下一步
  const allBtns = await page.$$('button');
  for (const btn of allBtns) {
    const text = await btn.evaluate(el => el.innerText);
    if (text.includes('下一步') || text.includes('继续')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  
  // Step 2: 填写团队名称
  const inputs = await page.$$('input');
  for (const input of inputs) {
    const type = await input.evaluate(el => el.type);
    if (type === 'text') {
      await input.type('演示团队');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  
  // 点击下一步到 Step 3
  const allBtns2 = await page.$$('button');
  for (const btn of allBtns2) {
    const text = await btn.evaluate(el => el.innerText);
    if (text.includes('下一步') || text.includes('继续')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  
  // Step 3: 添加角色
  const allBtns3 = await page.$$('button');
  for (const btn of allBtns3) {
    const text = await btn.evaluate(el => el.innerText);
    if (text.includes('添加角色') || text.includes('添加')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  
  // 填写角色名称
  const roleInputs = await page.$$('input');
  for (const input of roleInputs) {
    const placeholder = await input.evaluate(el => el.placeholder);
    if (placeholder && placeholder.includes('角色名称')) {
      await input.type('演示角色');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  
  // 点击下一步到 Step 4
  const allBtns4 = await page.$$('button');
  for (const btn of allBtns4) {
    const text = await btn.evaluate(el => el.innerText);
    if (text.includes('下一步') || text.includes('继续')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('✅ 已到达 Step 4 平台选择页面，请查看屏幕上的 Chrome 窗口');
  console.log('💡 按 Ctrl+C 或关闭此终端来结束');
  
  // 保持运行，不自动关闭
  await new Promise(() => {});
})();
