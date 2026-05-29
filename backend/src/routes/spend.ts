import { Router } from 'express';
import { SpendTracker } from '../services/SpendTracker';

const router = Router();

/**
 * GET /api/spend/overview
 * 返回全局用量概览
 */
router.get('/overview', async (_req, res) => {
  try {
    const overview = await SpendTracker.getOverview?.() || {
      totalSpent: 0,
      totalTokens: 0,
      totalRequests: 0,
      byProvider: {},
      byModel: {},
      byDay: [],
      budgetLimit: null,
      budgetRemaining: null
    };
    res.json({ success: true, data: overview });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/spend/by-provider
 * 按Provider统计用量
 */
router.get('/by-provider', async (_req, res) => {
  try {
    const data = await SpendTracker.getByProvider?.() || {};
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/spend/by-model
 * 按模型统计用量
 */
router.get('/by-model', async (_req, res) => {
  try {
    const data = await SpendTracker.getByModel?.() || {};
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/spend/history?days=30
 * 历史用量趋势
 */
router.get('/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = await SpendTracker.getHistory?.(days) || [];
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/spend/recent?limit=50
 * 最近请求明细
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const data = await SpendTracker.getRecent?.(limit) || [];
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/spend/budget
 * 设置预算上限
 */
router.post('/budget', async (req, res) => {
  try {
    const { monthlyBudget, alertThreshold } = req.body;
    await SpendTracker.setBudget?.({ monthlyBudget, alertThreshold });
    res.json({ success: true, message: '预算设置已更新' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/spend/budget
 * 获取当前预算设置
 */
router.get('/budget', async (_req, res) => {
  try {
    const budget = await SpendTracker.getBudget?.() || { monthlyBudget: null, alertThreshold: 0.8 };
    res.json({ success: true, data: budget });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
