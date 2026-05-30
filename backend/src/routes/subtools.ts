import express from 'express';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

// ─── 子工具状态定义（3D 坐标系 Z 轴）──────────────────

interface SubToolStatus {
  id: string;
  name: string;
  category: string;
  protocol: string;
  installed: boolean;
  running: boolean;
  version?: string;
  endpoint?: string;
  config?: Record<string, unknown>;
}

const SUBTOOLS: SubToolStatus[] = [
  // 已集成（6个）
  { id: 'claude-code', name: 'Claude Code', category: 'coding', protocol: 'ACP+stdio', installed: true, running: false, version: '0.7.0', endpoint: 'cli://claude-code' },
  { id: 'codex-cli', name: 'Codex CLI', category: 'coding', protocol: 'ACP+stdio', installed: true, running: false, version: '0.5.0', endpoint: 'cli://codex' },
  { id: 'qwen-code', name: 'Qwen Code', category: 'coding', protocol: 'ACP+stdio', installed: true, running: false, version: '0.3.0', endpoint: 'cli://qwen' },
  { id: 'goose', name: 'Goose', category: 'coding', protocol: 'MCP', installed: true, running: false, version: '1.0.0', endpoint: 'cli://goose' },
  { id: 'openclaw', name: 'OpenClaw', category: 'agent', protocol: 'ACP+OGP', installed: true, running: true, version: '1.0.0', endpoint: 'http://localhost:3000' },
  { id: 'iflow', name: 'iFlow', category: 'workflow', protocol: 'HTTP', installed: true, running: false, version: '0.1.0', endpoint: 'http://localhost:3002' },

  // 核心4个（优先接入）
  { id: 'hermes-agent', name: 'Hermes Agent', category: 'agent', protocol: 'OGP', installed: false, running: false, endpoint: 'cli://hermes' },
  { id: 'aider', name: 'Aider', category: 'coding', protocol: 'MCP+stdio', installed: false, running: false, endpoint: 'cli://aider' },
  { id: 'continue-dev', name: 'Continue.dev', category: 'coding', protocol: 'MCP+LSP', installed: false, running: false, endpoint: 'ide://continue' },
  { id: 'roo-code', name: 'Roo Code', category: 'coding', protocol: 'MCP+VSCode', installed: false, running: false, endpoint: 'ide://roo' },

  // 扩展10个（后续接入）
  { id: 'cline', name: 'Cline', category: 'coding', protocol: 'MCP+VSCode', installed: false, running: false, endpoint: 'ide://cline' },
  { id: 'kimi-cli', name: 'Kimi CLI', category: 'coding', protocol: 'ACP+stdio', installed: false, running: false, endpoint: 'cli://kimi' },
  { id: 'mistral-vibe', name: 'Mistral Vibe', category: 'coding', protocol: 'ACP+stdio', installed: false, running: false, endpoint: 'cli://mistral' },
  { id: 'augment-code', name: 'Augment Code', category: 'coding', protocol: 'ACP+stdio', installed: false, running: false, endpoint: 'cli://augment' },
  { id: 'droid', name: 'Droid', category: 'automation', protocol: 'ACP+stdio', installed: false, running: false, endpoint: 'cli://droid' },
  { id: 'pi', name: 'Pi', category: 'assistant', protocol: 'ACP+stdio', installed: false, running: false, endpoint: 'cli://pi' },
  { id: 'pool', name: 'Pool', category: 'collaboration', protocol: 'ACP+stdio', installed: false, running: false, endpoint: 'cli://pool' },
  { id: 'devika', name: 'Devika', category: 'software-engineering', protocol: 'HTTP', installed: false, running: false, endpoint: 'http://localhost:3003' },
  { id: 'crush', name: 'Crush', category: 'terminal', protocol: 'ACP+stdio', installed: false, running: false, endpoint: 'cli://crush' },
  { id: 'cursor-agent', name: 'Cursor Agent', category: 'coding', protocol: 'MCP+IDE', installed: false, running: false, endpoint: 'ide://cursor' },
  { id: 'github-copilot-cli', name: 'GitHub Copilot CLI', category: 'coding', protocol: 'MCP+GitHub', installed: false, running: false, endpoint: 'cli://copilot' },
];

// ─── GET /api/subtools ───────────────────────────────
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    total: SUBTOOLS.length,
    installed: SUBTOOLS.filter(t => t.installed).length,
    running: SUBTOOLS.filter(t => t.running).length,
    categories: [...new Set(SUBTOOLS.map(t => t.category))],
    tools: SUBTOOLS,
  });
});

// ─── GET /api/subtools/:id ───────────────────────────
router.get('/:id', (req, res) => {
  const tool = SUBTOOLS.find(t => t.id === req.params.id);
  if (!tool) return res.status(404).json({ error: 'Sub-tool not found' });
  res.json({ status: 'ok', tool });
});

// ─── POST /api/subtools/:id/install ──────────────────
router.post('/:id/install', (req, res) => {
  const tool = SUBTOOLS.find(t => t.id === req.params.id);
  if (!tool) return res.status(404).json({ error: 'Sub-tool not found' });
  tool.installed = true;
  res.json({ status: 'ok', message: `${tool.name} marked as installed`, tool });
});

// ─── POST /api/subtools/:id/start ────────────────────
router.post('/:id/start', (req, res) => {
  const tool = SUBTOOLS.find(t => t.id === req.params.id);
  if (!tool) return res.status(404).json({ error: 'Sub-tool not found' });
  if (!tool.installed) return res.status(400).json({ error: 'Tool not installed' });
  tool.running = true;
  res.json({ status: 'ok', message: `${tool.name} started`, tool });
});

// ─── POST /api/subtools/:id/stop ─────────────────────
router.post('/:id/stop', (req, res) => {
  const tool = SUBTOOLS.find(t => t.id === req.params.id);
  if (!tool) return res.status(404).json({ error: 'Sub-tool not found' });
  tool.running = false;
  res.json({ status: 'ok', message: `${tool.name} stopped`, tool });
});

export default router;
