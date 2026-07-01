/**
 * 千界花园 — 后端启动补丁
 * 修复 dist/app.js 中的 404 中间件问题
 */
const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'dist', 'app.js');

if (!fs.existsSync(appJsPath)) {
  console.error('❌ 找不到 dist/app.js，请先运行 npx tsc 编译后端');
  process.exit(1);
}

let content = fs.readFileSync(appJsPath, 'utf8');

// 查找并删除 404 拦截中间件
// 旧版本有类似这样的代码：
// app.use((_req, res) => { res.status(404).json(...) });
const patterns = [
  // 模式1：标准 404 中间件
  /app\.use\s*\(\s*\(?_?req\s*,\s*res\)?\s*=>\s*\{\s*res\.status\s*\(\s*404\s*\)\.json\s*\(\s*\{\s*success\s*:\s*false\s*,\s*error\s*:\s*['"]Not found['"]\s*\}\s*\)\s*;?\s*\}\s*\)\s*;?/,
  // 模式2：更宽松的匹配
  /app\.use\s*\([^)]*\{\s*[^}]*404[^}]*\}\s*\)\s*;?/,
];

let found = false;
for (const pattern of patterns) {
  if (pattern.test(content)) {
    content = content.replace(pattern, '');
    found = true;
    console.log('✅ 已删除 404 拦截中间件');
    break;
  }
}

if (!found) {
  console.log('ℹ️ 未找到 404 中间件（可能已被删除）');
}

// 同时确保错误处理器是 4 参数的（Express 错误处理器）
// 如果不是，可能需要保留现有的错误处理器

fs.writeFileSync(appJsPath, content);
console.log('✅ dist/app.js 已更新');
console.log('🚀 现在可以运行：node dist/server.js');
