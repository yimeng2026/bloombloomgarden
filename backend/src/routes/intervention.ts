import { Router, Request, Response, NextFunction } from 'express';
import {
import { asyncHandler } from '../middleware/asyncHandler';
  getInterventionService,
  InterventionLevel,
  InterventionAction,
  InterventionStatus,
} from '../services/CollabFramework';

const router = Router();

// ─── 11 端点实现 ───────────────────────────────────────

// 1. POST /api/intervention/request — 提交干预
router.post('/request', asyncHandler(async (req, res) => {
  const { agentId, level, action, payload, requesterId } = req.body;
  const service = getInterventionService();
  const record = await service.requestIntervention({
    agentId,
    level,
    action,
    payload: payload || {},
    requesterId,
  });
  res.status(201).json({ success: true, data: record });
}));

// 2. POST /api/intervention/:id/approve — 审批通过
router.post('/:id/approve', asyncHandler(async (req, res) => {
  const { approverId } = req.body;
  const service = getInterventionService();
  const record = await service.approve(req.params.id, approverId || req.body.userId || 'system');
  res.json({ success: true, data: record });
}));

// 3. POST /api/intervention/:id/reject — 审批拒绝
router.post('/:id/reject', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const service = getInterventionService();
  const record = await service.reject(req.params.id, reason);
  res.json({ success: true, data: record });
}));

// 4. POST /api/intervention/:id/execute — 直接执行（已审批或自动审批后）
router.post('/:id/execute', asyncHandler(async (req, res) => {
  const service = getInterventionService();
  const record = await service.executeIntervention(req.params.id);
  res.json({ success: true, data: record });
}));

// 5. POST /api/intervention/global-pause — 全局暂停
router.post('/global-pause', asyncHandler(async (req, res) => {
  const { requesterId, reason } = req.body;
  const service = getInterventionService();
  const record = await service.globalPause(requesterId || req.body.userId || 'system', reason);
  res.json({ success: true, data: record });
}));

// 6. POST /api/intervention/global-resume — 全局恢复
router.post('/global-resume', asyncHandler(async (req, res) => {
  const { requesterId } = req.body;
  const service = getInterventionService();
  const record = await service.globalResume(requesterId || req.body.userId || 'system');
  res.json({ success: true, data: record });
}));

// 7. POST /api/intervention/group-reorg — 群组重组
router.post('/group-reorg', asyncHandler(async (req, res) => {
  const { groupId, agentIds, requesterId } = req.body;
  const service = getInterventionService();
  const record = await service.requestIntervention({
    agentId: groupId,
    level: InterventionLevel.L2_GROUP,
    action: InterventionAction.GROUP_REORG,
    payload: { agentIds },
    requesterId: requesterId || req.body.userId || 'system',
  });
  res.json({ success: true, data: record });
}));

// 8. POST /api/intervention/agent-isolate — Agent隔离
router.post('/agent-isolate', asyncHandler(async (req, res) => {
  const { agentId, requesterId } = req.body;
  const service = getInterventionService();
  const record = await service.requestIntervention({
    agentId,
    level: InterventionLevel.L3_AGENT,
    action: InterventionAction.AGENT_ISOLATE,
    payload: {},
    requesterId: requesterId || req.body.userId || 'system',
  });
  res.json({ success: true, data: record });
}));

// 9. POST /api/intervention/inject-message — 消息注入
router.post('/inject-message', asyncHandler(async (req, res) => {
  const { agentId, message, position, requesterId } = req.body;
  const service = getInterventionService();
  const record = await service.requestIntervention({
    agentId,
    level: InterventionLevel.L5_DIALOG,
    action: InterventionAction.TURN_INJECT,
    payload: { message, position: position || 'end' },
    requesterId: requesterId || req.body.userId || 'system',
  });
  res.json({ success: true, data: record });
}));

// 10. POST /api/intervention/tool-review — 工具审核
router.post('/tool-review', asyncHandler(async (req, res) => {
  const { agentId, toolName, decision, requesterId } = req.body;
  const service = getInterventionService();
  const record = await service.requestIntervention({
    agentId,
    level: InterventionLevel.L6_TOOL,
    action: decision === 'allow' ? InterventionAction.TOOL_ALLOW : InterventionAction.TOOL_BLOCK,
    payload: { toolName },
    requesterId: requesterId || req.body.userId || 'system',
  });
  res.json({ success: true, data: record });
}));

// 11. GET /api/intervention/list — 记录列表
router.get('/list', asyncHandler(async (req, res) => {
  const { agentId, level, status, action } = req.query;
  const service = getInterventionService();
  const records = service.listRecords({
    agentId: agentId as string | undefined,
    level: level ? Number(level) as InterventionLevel : undefined,
    status: status as InterventionStatus | undefined,
    action: action as InterventionAction | undefined,
  });
  res.json({ success: true, data: records });
}));

// ─── 额外实用端点 ─────────────────────────────────────

// GET /api/intervention/agent/:id/history — Agent干预历史
router.get('/agent/:id/history', asyncHandler(async (req, res) => {
  const service = getInterventionService();
  const history = service.getAgentHistory(req.params.id);
  res.json({ success: true, data: history });
}));

// POST /api/intervention/agent/:id/pause — 快捷暂停
router.post('/agent/:id/pause', asyncHandler(async (req, res) => {
  const { requesterId } = req.body;
  const service = getInterventionService();
  const record = await service.pause(req.params.id, requesterId || req.body.userId || 'system');
  res.json({ success: true, data: record });
}));

// POST /api/intervention/agent/:id/resume — 快捷恢复
router.post('/agent/:id/resume', asyncHandler(async (req, res) => {
  const { requesterId } = req.body;
  const service = getInterventionService();
  const record = await service.resume(req.params.id, requesterId || req.body.userId || 'system');
  res.json({ success: true, data: record });
}));

// POST /api/intervention/agent/:id/terminate — 快捷终止
router.post('/agent/:id/terminate', asyncHandler(async (req, res) => {
  const { requesterId } = req.body;
  const service = getInterventionService();
  const record = await service.terminate(req.params.id, requesterId || req.body.userId || 'system');
  res.json({ success: true, data: record });
}));

// POST /api/intervention/agent/:id/emergency-stop — 紧急停止
router.post('/agent/:id/emergency-stop', asyncHandler(async (req, res) => {
  const { requesterId, reason } = req.body;
  const service = getInterventionService();
  const record = await service.emergencyStop(
    req.params.id,
    requesterId || req.body.userId || 'system',
    reason
  );
  res.json({ success: true, data: record });
}));

// GET /api/intervention/rules — 审批规则列表
router.get('/rules', asyncHandler(async (_req, res) => {
  const service = getInterventionService();
  const rules = service.getApprovalRules();
  res.json({ success: true, data: rules });
}));

// POST /api/intervention/rules — 新增审批规则
router.post('/rules', asyncHandler(async (req, res) => {
  const service = getInterventionService();
  const rule = service.addApprovalRule(req.body);
  res.status(201).json({ success: true, data: rule });
}));

// DELETE /api/intervention/rules/:id — 删除审批规则
router.delete('/rules/:id', asyncHandler(async (req, res) => {
  const service = getInterventionService();
  const removed = service.removeApprovalRule(req.params.id);
  if (!removed) {
    return res.status(404).json({ success: false, error: 'Rule not found' });
  }
  res.json({ success: true });
}));

export default router;
