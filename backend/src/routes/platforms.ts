import { Router } from 'express';

const router = Router();

// GET /api/platforms — 平台列表
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'kimi-code', name: 'Kimi Code', status: 'active', healthy: true },
      { id: 'claude', name: 'Claude', status: 'active', healthy: true },
      { id: 'openai', name: 'OpenAI', status: 'active', healthy: true },
      { id: 'deepseek', name: 'DeepSeek', status: 'active', healthy: true },
      { id: 'ollama', name: 'Ollama', status: 'active', healthy: true },
    ],
  });
});

export default router;
