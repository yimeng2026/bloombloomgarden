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
import { getAllProviders, getProviderConfig } from '../services/LLMProviderRegistry';
import providersData from '../config/providers.json';

const router = Router();

// GET /api/apikeys/providers — 列出所有支持的 provider 及配置
// 数据源：providers.json (L1平台) + LLMProviderRegistry (补充详细配置)
router.get('/providers', (req, res) => {
  const allProviders = (providersData as any).providers || [];
  // 只取 L1 引擎类别
  const engineProviders = allProviders.filter((p: any) =>
    ['cloud', 'local', 'gateway', 'local-engine'].includes(p.category)
  );

  const providers = engineProviders.map((p: any) => {
    // 尝试从 LLMProviderRegistry 补充详细配置
    const registryConfig = getProviderConfig(p.id);
    return {
      id: p.id,
      name: p.name || p.id,
      category: registryConfig?.category || p.category || 'commercial',
      defaultModel: p.defaultModel || registryConfig?.defaultModel || 'default',
      availableModels: registryConfig?.availableModels || p.models || [p.defaultModel],
      baseUrl: p.baseUrl || registryConfig?.baseUrl || '',
      authType: registryConfig?.authType || 'bearer',
      supportsVision: registryConfig?.supportsVision ?? true,
      supportsFunctions: registryConfig?.supportsFunctions ?? true,
      requiresUserAgent: registryConfig?.requiresUserAgent ?? false,
    };
  });

  res.json({ success: true, data: providers });
});

// GET /api/apikeys — 列出所有已保存的密钥
router.get('/', (req, res) => {
  const keys = apiKeyService.list();
  res.json({ success: true, data: keys, total: keys.length });
});

// POST /api/apikeys — 保存密钥
router.post('/', async (req, res) => {
  try {
    const { provider, apiKey, baseUrl, isActive } = req.body;
    if (!provider || !apiKey) {
      return res.status(400).json({ success: false, error: 'provider 和 apiKey 为必填项' });
    }

    const stored = await apiKeyService.save({ provider, apiKey, baseUrl, isActive });
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
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const deleted = await apiKeyService.delete(id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: '密钥不存在' });
  }
  res.json({ success: true, message: '密钥已删除' });
});

// PATCH /api/apikeys/:id/toggle — 切换激活状态
router.patch('/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const updated = await apiKeyService.toggleActive(id);
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
