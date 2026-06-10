/**
 * hierarchical.ts — 【已废弃】
 * 
 * 此路由的所有功能已合并到 /api/coordinator-hierarchy (coordinator.ts)。
 * 保留此文件仅用于向后兼容，所有端点返回 410 Gone 并提示迁移路径。
 * 
 * 迁移指南:
 *   GET  /api/hierarchical/tree        → GET  /api/coordinator-hierarchy/tree
 *   GET  /api/hierarchical/stats       → GET  /api/coordinator-hierarchy/chariot/:id (详情)
 *   GET  /api/hierarchical/alerts      → GET  /api/intervention/list?level=...
 *   GET  /api/hierarchical/approvals   → GET  /api/intervention/list?status=pending
 *   POST /api/hierarchical/intervene   → POST /api/intervention/request
 *   GET  /api/hierarchical/status      → GET  /api/health
 * 
 * 计划移除时间: 2026-08-01
 */

import { Router } from 'express';

const router = Router();

const GONE_RESPONSE = {
  success: false,
  error: '此端点已废弃 (410 Gone)',
  message: '请迁移到 /api/coordinator-hierarchy 或 /api/intervention 端点',
  migration: {
    tree: 'GET /api/coordinator-hierarchy/tree',
    stats: 'GET /api/coordinator-hierarchy/chariot/:id',
    alerts: 'GET /api/intervention/list',
    approvals: 'GET /api/intervention/list?status=pending',
    intervene: 'POST /api/intervention/request',
    status: 'GET /api/health',
  },
  sunset: '2026-08-01',
  documentation: 'https://github.com/yimeng2026/bloombloomgarden/blob/main/docs/api-migration.md',
};

function gone(req: any, res: any) {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', 'Sat, 01 Aug 2026 00:00:00 GMT');
  res.status(410).json(GONE_RESPONSE);
}

// 所有端点统一返回 410 Gone
router.get('/tree', gone);
router.get('/stats', gone);
router.get('/alerts', gone);
router.get('/approvals', gone);
router.get('/approvals/:id', gone);
router.post('/approvals/:id', gone);
router.post('/alerts/:id/acknowledge', gone);
router.post('/intervene', gone);
router.get('/status', gone);

export default router;
