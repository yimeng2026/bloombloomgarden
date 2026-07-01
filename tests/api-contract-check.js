#!/usr/bin/env node
/**
 * 千界花园 — 前后端 API 契约一致性检查 v4
 * 特殊处理 api/client.ts 封装层，按 Service 维度统计覆盖
 * 
 * 用法:
 *   node tests/api-contract-check.js
 */

const fs = require('fs');
const path = require('path');

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

const ROOT = path.resolve(__dirname, '..');
const BACKEND_ROUTES = path.join(ROOT, 'backend/src/routes');
const FRONTEND_SRC = path.join(ROOT, 'frontend/src');

const FILE_TO_BASE = {
  'agents.ts': '/api/agents',
  'agent-context.ts': '/api/agents',
  'apikeys.ts': '/api/apikeys',
  'auth.ts': '/api/auth',
  'backups.ts': '/api/backups',
  'blueprints.ts': '/api/blueprints',
  'coordinator.ts': '/api/coordinator',
  'dialog.ts': '/api/dialog',
  'events.ts': '/api/events',
  'external.ts': '/api/external',
  'groups.ts': '/api/groups',
  'handoff.ts': '/api/handoff',
  'integrations.ts': '/api/integrations',
  'intervention.ts': '/api/intervention',
  'kimi-cluster.ts': '/api/kimi-cluster',
  'knowledge.ts': '/api/knowledge',
  'monitor.ts': '/api/monitor',
  'platforms.ts': '/api/platforms',
  'processes.ts': '/api/processes',
  'registry.ts': '/api/registry',
  'security.ts': '/api/security',
  'settings.ts': '/api/settings',
  'skills.ts': '/api/skills',
  'spend.ts': '/api/spend',
  'tasks.ts': '/api/tasks',
  'unified-api.ts': '/api/unified',
  'workspace.ts': '/api/workspaces',
};

// ── 扫描后端路由 ───────────────────────────────────────────────
function scanBackendRoutes(dir) {
  const endpoints = [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const basePath = FILE_TO_BASE[file] || `/api/${file.replace('.ts', '')}`;
    
    const matches = [...content.matchAll(/router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi)];
    for (const [, method, routePath] of matches) {
      const fullPath = routePath.startsWith('/') ? `${basePath}${routePath}` : `${basePath}/${routePath}`;
      const normalized = fullPath.replace(/\/+$/, '').replace(/:\w+/g, ':id');
      endpoints.push({
        file,
        method: method.toUpperCase(),
        path: routePath,
        fullPath,
        normalized: `${method.toUpperCase()} ${normalized}`,
        service: basePath.replace('/api/', ''),
      });
    }
  }
  return endpoints;
}

// ── 扫描前端 ───────────────────────────────────────────────────
function scanFrontendCalls(dir, _prefix = '') {
  const calls = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      calls.push(...scanFrontendCalls(fullPath, path.join(_prefix, entry.name)));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // 1. fetch('/api/...') / fetch(`/api/...`)
      const fetchBlocks = [...content.matchAll(/fetch\s*\(\s*[`'"]([^`'"]+)[`'"]\s*,?\s*(\{[^}]*\})?\s*\)/gi)];
      for (const match of fetchBlocks) {
        const rawPath = match[1];
        if (!rawPath.includes('/')) continue; // 跳过纯变量如 `${path}`
        const optionsBlock = match[2] || '';
        let method = 'GET';
        const m = optionsBlock.match(/method\s*:\s*['"](\w+)['"]/i);
        if (m) method = m[1].toUpperCase();
        
        const simplified = rawPath.replace(/\$\{[^}]+\}/g, ':id');
        const normalized = simplified.replace(/:\w+/g, ':id').replace(/\/+$/, '');
        calls.push({ file: path.join(_prefix, entry.name), rawPath, method, simplified, normalized: `${method} ${normalized}` });
      }

      // 2. axios.X('/api/...')
      const axiosMatches = [...content.matchAll(/axios\.(get|post|put|patch|delete)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi)];
      for (const [, axMethod, rawPath] of axiosMatches) {
        if (!rawPath.includes('/')) continue;
        const simplified = rawPath.replace(/\$\{[^}]+\}/g, ':id');
        const normalized = simplified.replace(/:\w+/g, ':id').replace(/\/+$/, '');
        calls.push({ file: path.join(_prefix, entry.name), rawPath, method: axMethod.toUpperCase(), simplified, normalized: `${axMethod.toUpperCase()} ${normalized}` });
      }

      // 3. API_BASE + '/path' (API_BASE 已包含 /api)
      const baseMatches = [...content.matchAll(/API_BASE\s*\+\s*[`'"]([^`'"]+)[`'"]/gi)];
      for (const match of baseMatches) {
        const rawPath = match[1];
        if (!rawPath.startsWith('/')) continue;
        const simplified = rawPath.replace(/\$\{[^}]+\}/g, ':id');
        const normalized = simplified.replace(/:\w+/g, ':id').replace(/\/+$/, '');
        calls.push({ file: path.join(_prefix, entry.name), rawPath: `/api${simplified}`, method: 'GET', simplified: `/api${simplified}`, normalized: `GET ${normalized}` });
      }
    }
  }
  return calls;
}

// ── 特殊解析 api/client.ts ────────────────────────────────────
function parseApiClient(filepath) {
  const calls = [];
  if (!fs.existsSync(filepath)) return calls;
  const content = fs.readFileSync(filepath, 'utf-8');
  
  // 匹配 get('/agents') 或 get(`/agents/${id}`)
  const funcMatches = [...content.matchAll(/\b(get|post|put|del|delete)\s*\(\s*[`'"]([^`'"]+)[`'"]\s*\)/gi)];
  for (const [, method, rawPath] of funcMatches) {
    const httpMethod = method.toLowerCase() === 'del' ? 'DELETE' : method.toUpperCase();
    const simplified = `/api${rawPath}`.replace(/\$\{[^}]+\}/g, ':id');
    const normalized = simplified.replace(/:\w+/g, ':id').replace(/\/+$/, '');
    calls.push({ file: 'api/client.ts', rawPath: simplified, method: httpMethod, simplified, normalized: `${httpMethod} ${normalized}` });
  }
  return calls;
}

// ── 相似度匹配 ─────────────────────────────────────────────────
function similarPath(a, b) {
  if (a === b) return true;
  const partsA = a.split(' ');
  const partsB = b.split(' ');
  if (partsA.length !== 2 || partsB.length !== 2) return false;
  if (partsA[0] !== partsB[0]) return false;
  const segsA = partsA[1].split('/').filter(s => s);
  const segsB = partsB[1].split('/').filter(s => s);
  if (segsA.length !== segsB.length) return false;
  return segsA.every((seg, i) => seg === segsB[i] || seg === ':id' || segsB[i] === ':id');
}

// ── 主流程 ─────────────────────────────────────────────────────
console.log(`\n${C.cyan}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
console.log(`${C.cyan}║      千界花园 — API 契约一致性检查 v4.0                     ║${C.reset}`);
console.log(`${C.cyan}╚══════════════════════════════════════════════════════════════╝${C.reset}\n`);

const backendEndpoints = scanBackendRoutes(BACKEND_ROUTES);
const frontendCalls = [...scanFrontendCalls(FRONTEND_SRC), ...parseApiClient(path.join(FRONTEND_SRC, 'api/client.ts'))];

const uniqueBackend = [...new Map(backendEndpoints.map(e => [e.normalized, e])).values()];
const uniqueFrontend = [...new Map(frontendCalls.map(c => [c.normalized, c])).values()];

console.log(`${C.dim}后端路由文件: ${fs.readdirSync(BACKEND_ROUTES).filter(f=>f.endsWith('.ts')).length}${C.reset}`);
console.log(`${C.dim}后端唯一端点: ${uniqueBackend.length}${C.reset}`);
console.log(`${C.dim}前端调用次数: ${frontendCalls.length}${C.reset}`);
console.log(`${C.dim}前端唯一调用: ${uniqueFrontend.length}${C.reset}\n`);

// 检查前端调用是否有后端支持
const unmatchedFrontend = [];
for (const fc of uniqueFrontend) {
  const hasBackend = uniqueBackend.some(be => similarPath(be.normalized, fc.normalized));
  if (!hasBackend) unmatchedFrontend.push(fc);
}

// 检查后端端点是否有前端使用
const unusedBackend = [];
for (const be of uniqueBackend) {
  const hasFrontend = uniqueFrontend.some(fc => similarPath(be.normalized, fc.normalized));
  if (!hasFrontend) unusedBackend.push(be);
}

// ── Service 维度覆盖 ───────────────────────────────────────────
const backendServices = new Set(uniqueBackend.map(e => e.service));
const frontendServices = new Set();
for (const fc of uniqueFrontend) {
  const parts = fc.normalized.split(' ');
  if (parts.length >= 2) {
    const service = parts[1].split('/')[1]; // e.g. /api/agents/... -> agents
    if (service) frontendServices.add(service);
  }
}
const missingServices = [...backendServices].filter(s => !frontendServices.has(s));
const serviceCoverage = backendServices.size > 0 ? Math.round((frontendServices.size / backendServices.size) * 100) : 0;

// 输出结果
let issues = 0;

if (unmatchedFrontend.length > 0) {
  console.log(`${C.yellow}⚠ 前端调用但后端缺少对应路由 (${unmatchedFrontend.length} 项)${C.reset}`);
  for (const u of unmatchedFrontend.slice(0, 15)) {
    console.log(`   ${C.dim}${u.file}${C.reset} -> ${u.method} ${u.simplified}`);
  }
  if (unmatchedFrontend.length > 15) console.log(`   ... 还有 ${unmatchedFrontend.length - 15} 项`);
  issues += unmatchedFrontend.length;
  console.log();
}

if (unusedBackend.length > 0) {
  console.log(`${C.yellow}⚠ 后端路由但前端可能未直接调用 (${unusedBackend.length} 项)${C.reset}`);
  console.log(`   ${C.dim}注: 含大量CRUD(put/delete/patch)，可能通过 api/client.ts 或组件间接使用${C.reset}`);
  for (const u of unusedBackend.slice(0, 10)) {
    console.log(`   ${C.dim}${u.file}${C.reset} -> ${u.normalized}`);
  }
  if (unusedBackend.length > 10) console.log(`   ... 还有 ${unusedBackend.length - 10} 项`);
  issues += unusedBackend.length;
  console.log();
}

if (missingServices.length > 0) {
  console.log(`${C.red}❌ 前端完全未覆盖的后端 Service: ${missingServices.join(', ')}${C.reset}\n`);
} else {
  console.log(`${C.green}✅ 所有后端 Service 至少有一个前端调用${C.reset}\n`);
}

// 覆盖率统计
const matchedCount = uniqueBackend.length - unusedBackend.length;
const endpointCoverage = uniqueBackend.length > 0 ? Math.round((matchedCount / uniqueBackend.length) * 100) : 0;

console.log(`${C.cyan}──────────────────────────────────────────────────────────────${C.reset}`);
console.log(`  后端端点: ${uniqueBackend.length}  |  前端覆盖: ${matchedCount}  |  端点覆盖率: ${endpointCoverage}%`);
console.log(`  后端Service: ${backendServices.size}  |  前端覆盖: ${frontendServices.size}  |  Service覆盖率: ${serviceCoverage}%`);
console.log(`  问题项: ${issues === 0 ? C.green + '0 (完美对齐)' + C.reset : C.red + issues + C.reset}`);
console.log(`${C.cyan}──────────────────────────────────────────────────────────────${C.reset}\n`);

// 保存报告
const reportPath = path.join(__dirname, 'api-contract-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  meta: {
    suite: 'ThousandRealmsGarden API Contract Check v4',
    timestamp: new Date().toISOString(),
    backendCount: uniqueBackend.length,
    frontendCount: uniqueFrontend.length,
    endpointCoverage,
    backendServices: [...backendServices],
    frontendServices: [...frontendServices],
    missingServices,
    serviceCoverage,
    issues,
  },
  unmatchedFrontend: unmatchedFrontend.map(c => ({ file: c.file, method: c.method, path: c.simplified })),
  unusedBackend: unusedBackend.map(e => ({ file: e.file, method: e.method, path: e.fullPath })),
}, null, 2));
console.log(`${C.dim}📄 报告已保存: ${reportPath}${C.reset}\n`);

// 输出需要补充的路由（按Service分组）
if (unmatchedFrontend.length > 0) {
  console.log(`${C.cyan}📋 需要补充的后端路由 (按 Service):${C.reset}`);
  const byService = {};
  for (const u of unmatchedFrontend) {
    const svc = u.simplified.split('/')[2] || 'unknown';
    if (!byService[svc]) byService[svc] = [];
    byService[svc].push(`${u.method} ${u.simplified}`);
  }
  for (const [svc, routes] of Object.entries(byService).sort()) {
    console.log(`\n  ${C.yellow}/api/${svc}${C.reset}`);
    for (const r of [...new Set(routes)]) {
      console.log(`    ${r}`);
    }
  }
  console.log();
}

process.exit(issues > 0 ? 1 : 0);
