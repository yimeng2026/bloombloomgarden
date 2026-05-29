/**
 * apikeys.ts — API 密钥管理路由
 * POST /api/apikeys — 保存密钥
 * GET /api/apikeys — 列出所有（脱敏）
 * DELETE /api/apikeys/:id — 删除
 * PATCH /api/apikeys/:id/toggle — 切换激活状态
 * POST /api/apikeys/:id/test — 连通性测试
 * POST /api/apikeys/test-all — 批量测试
 */

import { Router } from 'express';
import { apiKeyService } from '../services/APIKeyService';
import { getAllProviders } from '../services/LLMProviderRegistry';

const router = Router();

// GET /api/apikeys/providers — 列出所有支持的 provider 及配置
router.get('/providers', (req, res) => {
  const providers = getAllProviders().map(p => ({
    id: p.id,
    name: p.displayName,
    category: p.category,
    defaultModel: p.defaultModel,
    availableModels: p.availableModels,
    baseUrl: p.baseUrl,
    authType: p.authType,
    supportsVision: p.supportsVision,
    supportsFunctions: p.supportsFunctions,
    requiresUserAgent: p.requiresUserAgent,
  }));
  res.json({ success: true, data: providers });
});

// GET /api/apikeys — 列出所有已保存的密钥
router.get('/', (req, res) => {
  const keys = apiKeyService.list();
  res.json({ success: true, data: keys, total: keys.length });
});

// POST /api/apikeys — 保存密钥
router.post('/', (req, res) => {
  try {
    const { provider, apiKey, baseUrl, isActive } = req.body;
    if (!provider || !apiKey) {
      return res.status(400).json({ success: false, error: 'provider 和 apiKey 为必填项' });
    }

    const stored = apiKeyService.save({ provider, apiKey, baseUrl, isActive });
    res.json({
      success: true,
      data: {
        id: stored.id,
        provider: stored.provider,
        providerName: stored.providerName,
        displayName: stored.displayName,
        baseUrl: stored.baseUrl,
        isActive: stored.isActive,
        createdAt: stored.createdAt,
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/apikeys/:id — 删除密钥
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const deleted = apiKeyService.delete(id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: '密钥不存在' });
  }
  res.json({ success: true, message: '密钥已删除' });
});

// PATCH /api/apikeys/:id/toggle — 切换激活状态
router.patch('/:id/toggle', (req, res) => {
  const { id } = req.params;
  const updated = apiKeyService.toggleActive(id);
  if (!updated) {
    return res.status(404).json({ success: false, error: '密钥不存在' });
  }
  res.json({ success: true, data: { id, isActive: updated.isActive } });
});

// POST /api/apikeys/:id/test — 单个密钥连通性测试
router.post('/:id/test', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await apiKeyService.test(id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/apikeys/test-all — 批量测试所有密钥
router.post('/test-all', async (req, res) => {
  try {
    const results = await apiKeyService.testAll();
    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
