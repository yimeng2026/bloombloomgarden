const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  console.log('🌐 正在打开千界花园...');
  await page.goto('http://localhost:3002/#/chat', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  // 输入消息 — 明确要求简洁回复
  const textarea = await page.$('textarea');
  if (textarea) {
    await textarea.click();
    await page.keyboard.type('你好，请用一句话介绍自己');
    await new Promise(r => setTimeout(r, 500));
    await textarea.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));
    await new Promise(r => setTimeout(r, 300));
    
    // 找发送按钮
    const buttons = await page.$$('button');
    let sendBtn = null, bestX = -1;
    for (const btn of buttons) {
      const rect = await btn.evaluate(el => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, disabled: el.disabled };
      });
      if (rect.y > 400 && rect.width < 50 && rect.height < 50 && !rect.disabled && rect.x > bestX) {
        bestX = rect.x; sendBtn = btn;
      }
    }
    if (sendBtn) {
      await sendBtn.click();
      console.log('🖱️  消息已发送，等待 GLM-5.1 回复...');
    }
  }
  
  console.log('✅ 浏览器已打开，不会自动关闭');
  console.log('💡 按 Ctrl+C 或关闭此终端来结束');
  
  // 保持运行，不自动关闭
  await new Promise(() => {});
})();
