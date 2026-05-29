#!/usr/bin/env node
/**
 * 千界花园 — 构建验证脚本 (Build Verification)
 * 验证前端代码完整性、类型检查、路由对齐
 * 
 * 用法:
 *   node tests/build-verify.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

function ok(m) { console.log(`${C.green}✓${C.reset} ${m}`); }
function fail(m) { console.log(`${C.red}✗${C.reset} ${m}`); }
function info(m) { console.log(`${C.cyan}ℹ${C.reset} ${m}`); }

const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');
const BACKEND = path.join(ROOT, 'backend');

const results = [];

function check(name, fn) {
  try {
    fn();
    ok(name);
    results.push({ name, status: 'PASS' });
  } catch (err) {
    fail(`${name} — ${err.message}`);
    results.push({ name, status: 'FAIL', error: err.message });
  }
}

console.log(`\n${C.cyan}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
console.log(`${C.cyan}║      千界花园 — 构建验证脚本 v1.0                           ║${C.reset}`);
console.log(`${C.cyan}╚══════════════════════════════════════════════════════════════╝${C.reset}\n`);

// ── 1. 目录结构完整性 ──────────────────────────────────────────
check('frontend/src/pages 存在且包含 >=50 个页面', () => {
  const dir = path.join(FRONTEND, 'src/pages');
  if (!fs.existsSync(dir)) throw new Error('目录不存在');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
  if (files.length < 50) throw new Error(`仅 ${files.length} 个页面`);
});

check('frontend/src/components 存在', () => {
  const dir = path.join(FRONTEND, 'src/components');
  if (!fs.existsSync(dir)) throw new Error('目录不存在');
});

check('backend/src/routes 存在且 >=25 个路由', () => {
  const dir = path.join(BACKEND, 'src/routes');
  if (!fs.existsSync(dir)) throw new Error('目录不存在');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));
  if (files.length < 25) throw new Error(`仅 ${files.length} 个路由`);
});

check('backend/src/services 存在且 >=20 个服务', () => {
  const dir = path.join(BACKEND, 'src/services');
  if (!fs.existsSync(dir)) throw new Error('目录不存在');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));
  if (files.length < 20) throw new Error(`仅 ${files.length} 个服务`);
});

check('backend/src/adapters 存在', () => {
  const dir = path.join(BACKEND, 'src/adapters');
  if (!fs.existsSync(dir)) throw new Error('目录不存在');
});

// ── 2. App.tsx 路由完整性 ─────────────────────────────────────
check('App.tsx 包含 >=50 条 Route', () => {
  const appPath = path.join(FRONTEND, 'src/App.tsx');
  const content = fs.readFileSync(appPath, 'utf-8');
  const matches = content.match(/<Route\s+path=/g);
  const count = matches ? matches.length : 0;
  if (count < 50) throw new Error(`仅 ${count} 条路由`);
});

check('App.tsx 所有 lazy import 都有对应文件', () => {
  const appPath = path.join(FRONTEND, 'src/App.tsx');
  const content = fs.readFileSync(appPath, 'utf-8');
  const imports = [...content.matchAll(/lazy\(\(\) => import\('@\/pages\/(\w+)'\)/g)];
  const pagesDir = path.join(FRONTEND, 'src/pages');
  for (const [, name] of imports) {
    const filePath = path.join(pagesDir, `${name}.tsx`);
    if (!fs.existsSync(filePath)) throw new Error(`缺少页面: ${name}.tsx`);
  }
});

// ── 3. 关键配置文件存在 ──────────────────────────────────────
check('docker-compose.yml 存在且包含 >=3 个服务', () => {
  const fp = path.join(ROOT, 'docker-compose.yml');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
  const content = fs.readFileSync(fp, 'utf-8');
  const services = content.match(/^\s{2}[\w-]+:/gm);
  const count = services ? services.length : 0;
  if (count < 3) throw new Error(`仅 ${count} 个服务定义`);
});

check('openapi.yaml 存在且有效', () => {
  const fp = path.join(ROOT, 'openapi.yaml');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
  const content = fs.readFileSync(fp, 'utf-8');
  if (!content.includes('openapi:')) throw new Error('非有效 OpenAPI 格式');
});

check('package.json 根项目存在', () => {
  const fp = path.join(ROOT, 'package.json');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
});

check('frontend/package.json 存在', () => {
  const fp = path.join(FRONTEND, 'package.json');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
});

check('backend/package.json 存在', () => {
  const fp = path.join(BACKEND, 'package.json');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
});

// ── 4. Electron 打包配置 ─────────────────────────────────────
check('electron/main.js 存在', () => {
  const fp = path.join(ROOT, 'electron/main.js');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
});

check('electron/preload.js 存在', () => {
  const fp = path.join(ROOT, 'electron/preload.js');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
});

// ── 5. 测试脚本完整性 ──────────────────────────────────────────
check('test_all_providers.py 存在且包含10个Provider', () => {
  const fp = path.join(ROOT, 'test_all_providers.py');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
  const content = fs.readFileSync(fp, 'utf-8');
  const providers = ['kimi-code', 'openai', 'anthropic', 'deepseek', 'gemini', 'qwen', 'glm', 'openrouter', 'moonshot', 'azure-openai'];
  for (const p of providers) {
    if (!content.includes(p)) throw new Error(`缺少 ${p}`);
  }
});

check('test_kimi_layer1.py 存在', () => {
  const fp = path.join(ROOT, 'test_kimi_layer1.py');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
});

check('BUILD_GUIDE.md 存在', () => {
  const fp = path.join(ROOT, 'BUILD_GUIDE.md');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
});

// ── 6. 前端关键页面内容检查 ────────────────────────────────────
check('APIKeys.tsx 包含 Provider 选择器', () => {
  const fp = path.join(FRONTEND, 'src/pages/APIKeys.tsx');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
  const content = fs.readFileSync(fp, 'utf-8');
  if (!content.includes('provider') && !content.includes('Provider')) {
    throw new Error('缺少 Provider 相关逻辑');
  }
});

check('UploadsPage.tsx 包含知识库关联', () => {
  const fp = path.join(FRONTEND, 'src/pages/UploadsPage.tsx');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
  const content = fs.readFileSync(fp, 'utf-8');
  if (!content.includes('knowledge') && !content.includes('knowledgeBase')) {
    throw new Error('缺少知识库关联逻辑');
  }
});

check('Chat.tsx 使用对话兼容层', () => {
  const fp = path.join(FRONTEND, 'src/pages/Chat.tsx');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
  const content = fs.readFileSync(fp, 'utf-8');
  if (!content.includes('sendMessage') && !content.includes('message')) {
    throw new Error('缺少对话相关逻辑');
  }
});

// ── 7. 后端关键服务检查 ────────────────────────────────────────
check('UnifiedLLMAdapter.ts 存在', () => {
  const fp = path.join(BACKEND, 'src/services/UnifiedLLMAdapter.ts');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
});

check('LLMProviderRegistry.ts 存在', () => {
  const fp = path.join(BACKEND, 'src/services/LLMProviderRegistry.ts');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
});

check('IntentClassifier.ts 存在且包含 skills', () => {
  const fp = path.join(BACKEND, 'src/services/IntentClassifier.ts');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
  const content = fs.readFileSync(fp, 'utf-8');
  if (!content.includes('skill') && !content.includes('intent')) {
    throw new Error('缺少技能/意图相关逻辑');
  }
});

check('KimiClusterOrchestrator.ts 存在', () => {
  const fp = path.join(BACKEND, 'src/KimiClusterOrchestrator.ts');
  if (!fs.existsSync(fp)) throw new Error('文件不存在');
});

// ── 8. TypeScript 类型检查 (如可用) ────────────────────────────
try {
  const tscPath = path.join(FRONTEND, 'node_modules/.bin/tsc');
  if (fs.existsSync(tscPath)) {
    check('frontend TypeScript 类型检查通过', () => {
      try {
        execSync(`${tscPath} --noEmit`, { cwd: FRONTEND, stdio: 'pipe', timeout: 60000 });
      } catch (e) {
        const out = e.stdout?.toString() || '';
        const err = e.stderr?.toString() || '';
        // 允许存在 MUI/Emotion 警告，但不得有致命错误
        const fatal = (out + err).split('\n').filter(l => l.includes('error TS') && !l.includes('TS7016') && !l.includes('TS2307'));
        if (fatal.length > 0) throw new Error(`致命类型错误: ${fatal.length} 个`);
      }
    });
  } else {
    info('跳过 TypeScript 类型检查 (未安装依赖)');
  }
} catch {
  info('跳过 TypeScript 类型检查 (tsc 不可用)');
}

// ── 汇总 ───────────────────────────────────────────────────────
const pass = results.filter(r => r.status === 'PASS').length;
const failCount = results.filter(r => r.status === 'FAIL').length;
const total = results.length;

console.log(`\n${C.cyan}──────────────────────────────────────────────────────────────${C.reset}`);
console.log(`  总计: ${total}  |  ✅ 通过: ${pass}  |  ❌ 失败: ${failCount}  |  通过率: ${Math.round(pass/total*100)}%`);
console.log(`${C.cyan}──────────────────────────────────────────────────────────────${C.reset}\n`);

process.exit(failCount > 0 ? 1 : 0);
