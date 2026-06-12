import { Router } from 'express';
import { GroupService, GroupStatus, VALID_GROUP_TYPES } from '../services/GroupService';
import { getGroupService, getAgentService } from '../services';
import prisma from '../config/prisma';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// ─── 辅助：递归构建群组树 ──────────────────────────────
async function buildGroupTree(
  groupId: string,
  visited: Set<string> = new Set()
): Promise<any | null> {
  if (visited.has(groupId)) return null; // 防止循环引用
  visited.add(groupId);

  let group: any = null;

  if (prisma) {
    group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { agents: true },
    });
  }

  if (!group) return null;

  const entityIds: string[] = JSON.parse(group.entityIds || '[]');
  const children: any[] = [];

  for (const entityId of entityIds) {
    // 尝试作为 Agent 查找
    if (prisma) {
      const agent = await prisma.agent.findUnique({ where: { id: entityId } });
      if (agent) {
        children.push({
          type: 'agent',
          id: agent.id,
          name: agent.name,
          role: agent.role,
          status: agent.status,
          protocolLevel: agent.protocolLevel,
          mode: agent.mode,
          agentType: agent.agentType,
        });
        continue;
      }
    }

    // 尝试作为 Group 查找（递归）
    if (prisma) {
      const childGroup = await prisma.group.findUnique({ where: { id: entityId } });
      if (childGroup) {
        const subtree = await buildGroupTree(entityId, new Set(visited));
        if (subtree) {
          children.push({
            type: 'group',
            id: childGroup.id,
            name: childGroup.name,
            status: childGroup.status,
            groupType: childGroup.groupType,
            children: subtree.children || [],
          });
        }
        continue;
      }
    }

    // 未知实体
    children.push({ type: 'unknown', id: entityId });
  }

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    status: group.status,
    parentId: group.parentId,
    coordinatorId: group.coordinatorId,
    executionMode: group.executionMode,
    groupType: group.groupType,
    entityIds,
    entityType: group.entityType,
    maxDepth: group.maxDepth,
    children,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

// ─── 辅助：确定实体类型 ────────────────────────────────
async function detectEntityType(entityId: string): Promise<'agent' | 'group' | null> {
  if (!prisma) return null;
  const agent = await prisma.agent.findUnique({ where: { id: entityId }, select: { id: true } });
  if (agent) return 'agent';
  const grp = await prisma.group.findUnique({ where: { id: entityId }, select: { id: true } });
  if (grp) return 'group';
  return null;
}

// ─── 辅助：计算 entityType ─────────────────────────────
function computeEntityType(
  currentIds: string[],
  currentType: string
): 'agents' | 'groups' | 'mixed' {
  if (currentIds.length === 0) return currentType as any;
  // 简化：根据已有 type 和新添加的推断
  // 实际应用中可遍历所有 entity 重新检测
  return currentType as any;
}

// 1. GET /api/groups — 列表（支持按 groupType 过滤）
router.get('/', asyncHandler(async (req, res) => {
  const { groupType } = req.query;
  const service = getGroupService();
  const groups = await service.list({
    groupType: groupType as string | undefined,
  });
  res.json({ success: true, data: groups, total: groups.length });
}));

// 1b. GET /api/groups/stats — 群组统计
router.get('/stats', asyncHandler(async (_req, res) => {
  const service = getGroupService();
  const stats = await service.getStats();
  res.json({ success: true, data: stats });
}));

// 2. POST /api/groups — 创建（支持新字段）
router.post('/', asyncHandler(async (req, res) => {
  const {
    name, description, parentId, coordinatorId,
    executionMode, maxDepth,
    // 统一实体系统新字段
    entityIds,
    agentIds, // 向后兼容：旧字段 agentIds 映射到 entityIds
    // 蜂群模式字段
    swarmMode,
    // Group Type System 新字段
    groupType, roleDefinitions, strategy, outputFormat, color, icon,
  } = req.body;

  // 校验 groupType（如果提供）
  if (groupType && !VALID_GROUP_TYPES.includes(groupType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid groupType "${groupType}". Must be one of: ${VALID_GROUP_TYPES.join(', ')}`,
    });
  }

  // ── Step 1: 创建基础 Group ──
  const service = getGroupService();
  const group = await service.create({
    name,
    description,
    parentId,
    coordinatorId,
    executionMode,
    maxDepth,
    // Group Type System
    groupType,
    roleDefinitions,
    strategy,
    outputFormat,
    color,
    icon,
  });

  // ── Step 2: 处理 entityIds / agentIds ──
  const finalEntityIds: string[] = entityIds || agentIds || [];
  if (finalEntityIds.length > 0 && prisma) {
    // 检测每个实体的类型并建立关系
    const agents: string[] = [];
    const groups: string[] = [];

    for (const eid of finalEntityIds) {
      const etype = await detectEntityType(eid);
      if (etype === 'agent') {
        agents.push(eid);
        await prisma.agent.update({ where: { id: eid }, data: { groupId: group.id } });
      } else if (etype === 'group') {
        groups.push(eid);
        await prisma.group.update({ where: { id: eid }, data: { parentId: group.id } });
      }
    }

    // 确定 entityType
    let entityType = 'agents';
    if (agents.length > 0 && groups.length > 0) entityType = 'mixed';
    else if (groups.length > 0 && agents.length === 0) entityType = 'groups';

    await prisma.group.update({
      where: { id: group.id },
      data: {
        entityIds: JSON.stringify(finalEntityIds),
        entityType,
        swarmMode: swarmMode || 'sequential',
      },
    });
  }

  const fullGroup = await service.getById(group.id);
  res.status(201).json({ success: true, data: fullGroup });
}));

// 3. GET /api/groups/:id — 详情
router.get('/:id', asyncHandler(async (req, res) => {
  const service = getGroupService();
  const group = await service.getById(req.params.id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, data: group });
}));

// 4. PUT /api/groups/:id — 更新（支持新字段）
router.put('/:id', asyncHandler(async (req, res) => {
  const service = getGroupService();
  const updatePayload: any = { ...req.body };

  // 校验 groupType（如果提供）
  if (req.body.groupType && !VALID_GROUP_TYPES.includes(req.body.groupType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid groupType "${req.body.groupType}". Must be one of: ${VALID_GROUP_TYPES.join(', ')}`,
    });
  }

  const group = await service.update(req.params.id, updatePayload);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, data: group });
}));

// 5. DELETE /api/groups/:id — 删除
router.delete('/:id', asyncHandler(async (req, res) => {
  const service = getGroupService();
  const ok = await service.delete(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Group not found' });
  res.status(204).send();
}));

// 6. POST /api/groups/:id/agents — 添加 Agent（保持兼容）
router.post('/:id/agents', asyncHandler(async (req, res) => {
  const { agentId } = req.body;
  const service = getGroupService();
  const group = await service.addAgent(req.params.id, agentId);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

  // 同步更新 entityIds
  if (prisma) {
    const raw = await prisma.group.findUnique({
      where: { id: req.params.id },
      select: { entityIds: true },
    });
    const currentIds: string[] = JSON.parse(raw?.entityIds || '[]');
    if (!currentIds.includes(agentId)) {
      currentIds.push(agentId);
      await prisma.group.update({
        where: { id: req.params.id },
        data: { entityIds: JSON.stringify(currentIds) },
      });
    }
  }

  res.json({ success: true, data: group });
}));

// 6b. POST /api/groups/:id/entities — 添加实体（Agent 或 Group）
router.post('/:id/entities', asyncHandler(async (req, res) => {
  const { entityId } = req.body;
  if (!entityId) {
    return res.status(400).json({ success: false, error: 'entityId is required' });
  }

  const service = getGroupService();
  const group = await service.getById(req.params.id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

  if (!prisma) {
    return res.status(500).json({ success: false, error: 'Prisma not available' });
  }

  // 检测实体类型
  const etype = await detectEntityType(entityId);
  if (!etype) {
    return res.status(404).json({ success: false, error: `Entity "${entityId}" not found` });
  }

  // 获取当前 entityIds
  const rawGroup = await prisma.group.findUnique({
    where: { id: req.params.id },
    select: { entityIds: true, entityType: true },
  });
  const currentIds: string[] = JSON.parse(rawGroup?.entityIds || '[]');
  if (currentIds.includes(entityId)) {
    return res.status(409).json({ success: false, error: 'Entity already in group' });
  }

  currentIds.push(entityId);

  // 更新关系
  if (etype === 'agent') {
    await prisma.agent.update({ where: { id: entityId }, data: { groupId: req.params.id } });
  } else if (etype === 'group') {
    await prisma.group.update({ where: { id: entityId }, data: { parentId: req.params.id } });
  }

  // 更新 entityType
  let entityType = rawGroup?.entityType || 'agents';
  const hasAgents = await Promise.all(
    currentIds.map(async (id) => detectEntityType(id))
  );
  const typeSet = new Set(hasAgents.filter(Boolean));
  if (typeSet.has('agent') && typeSet.has('group')) entityType = 'mixed';
  else if (typeSet.has('group') && !typeSet.has('agent')) entityType = 'groups';
  else entityType = 'agents';

  const updated = await prisma.group.update({
    where: { id: req.params.id },
    data: {
      entityIds: JSON.stringify(currentIds),
      entityType,
    },
  });

  res.json({ success: true, data: updated });
}));

// 6c. GET /api/groups/:id/tree — 递归树
router.get('/:id/tree', asyncHandler(async (req, res) => {
  const service = getGroupService();
  const group = await service.getById(req.params.id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

  const tree = await buildGroupTree(req.params.id);
  if (!tree) return res.status(500).json({ success: false, error: 'Failed to build tree' });

  res.json({ success: true, data: tree });
}));

// 7. DELETE /api/groups/:id/agents/:agentId — 移除 Agent
router.delete('/:id/agents/:agentId', asyncHandler(async (req, res) => {
  const service = getGroupService();
  const group = await service.removeAgent(req.params.id, req.params.agentId);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

  // 同步更新 entityIds
  if (prisma) {
    const raw = await prisma.group.findUnique({
      where: { id: req.params.id },
      select: { entityIds: true },
    });
    const currentIds: string[] = JSON.parse(raw?.entityIds || '[]');
    const filtered = currentIds.filter((id) => id !== req.params.agentId);
    if (filtered.length !== currentIds.length) {
      await prisma.group.update({
        where: { id: req.params.id },
        data: { entityIds: JSON.stringify(filtered) },
      });
    }
  }

  res.json({ success: true, data: group });
}));

// 8. POST /api/groups/:id/coordinator — 指定协调员
router.post('/:id/coordinator', asyncHandler(async (req, res) => {
  const { agentId } = req.body;
  const service = getGroupService();
  const group = await service.setCoordinator(req.params.id, agentId);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, data: group });
}));

// 额外：POST /api/groups/:id/nest — 嵌套子群组
router.post('/:id/nest', asyncHandler(async (req, res) => {
  const { childGroupId } = req.body;
  const service = getGroupService();
  const group = await service.nestGroup(req.params.id, childGroupId);
  if (!group) return res.status(404).json({ success: false, error: 'Group or child not found' });
  res.json({ success: true, data: group });
}));

// ─── 蜂群模式端点 ─────────────────────────────────────

// POST /api/groups/:id/swarm-mode — 切换蜂群模式
router.post('/:id/swarm-mode', asyncHandler(async (req, res) => {
  const { swarmMode } = req.body;
  const validModes = ['sequential', 'parallel', 'hierarchical', 'dynamic'];
  if (!swarmMode || !validModes.includes(swarmMode)) {
    return res.status(400).json({ success: false, error: `swarmMode must be one of ${validModes.join(', ')}` });
  }
  if (!prisma) {
    return res.status(500).json({ success: false, error: 'Prisma not available' });
  }
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  const updated = await prisma.group.update({
    where: { id: req.params.id },
    data: { swarmMode },
  });
  res.json({ success: true, data: updated });
}));

// GET /api/groups/:id/swarm-status — 获取蜂群执行状态
router.get('/:id/swarm-status', asyncHandler(async (req, res) => {
  if (!prisma) {
    return res.status(500).json({ success: false, error: 'Prisma not available' });
  }
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    include: { agents: true },
  });
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  const agents = group.agents || [];
  const swarmAgents = agents.map((a: any) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    swarmEnabled: a.swarmEnabled,
    swarmMode: a.swarmMode,
    roleInGroup: a.roleInGroup,
    agentType: a.agentType,
  }));
  res.json({
    success: true,
    data: {
      groupId: group.id,
      groupName: group.name,
      swarmMode: group.swarmMode || group.executionMode || 'sequential',
      groupType: group.groupType,
      healthScore: (group as any).healthScore ?? 100,
      agentCount: agents.length,
      activeCount: agents.filter((a: any) => a.status === 'active').length,
      agents: swarmAgents,
      taskStats: (group as any).taskStats || {},
    },
  });
}));

// POST /api/groups/:id/swarm-execute — 启动蜂群执行
router.post('/:id/swarm-execute', asyncHandler(async (req, res) => {
  const { input = '', mode: overrideMode } = req.body;
  const service = getGroupService();
  const group = await service.getById(req.params.id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  const effectiveMode = overrideMode || (group as any).swarmMode || group.executionMode || 'sequential';
  const result = await service.execute(req.params.id, { mode: effectiveMode, input });
  res.json({ success: true, data: { ...result, swarmMode: effectiveMode } });
}));

// 9. POST /api/groups/:id/execute — 执行群组编排
router.post('/:id/execute', asyncHandler(async (req, res) => {
  const { mode = 'sequential', input = '' } = req.body;
  const service = getGroupService();
  const result = await service.execute(req.params.id, { mode, input });
  res.json({ success: true, data: result });
}));

// 10. GET /api/groups/:id/agents — 获取组内 Agent 列表
router.get('/:id/agents', asyncHandler(async (req, res) => {
  const service = getGroupService();
  const group = await service.getById(req.params.id);
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

  // 从 entityIds 中解析出 agents
  let agentIds: string[] = [];
  if (prisma) {
    const raw = await prisma.group.findUnique({
      where: { id: req.params.id },
      select: { entityIds: true },
    });
    const entityIds: string[] = JSON.parse(raw?.entityIds || '[]');

    // 过滤出 agents（通过检测实体类型）
    for (const eid of entityIds) {
      const etype = await detectEntityType(eid);
      if (etype === 'agent') agentIds.push(eid);
    }
  }

  // 回退：使用传统的 agentIds / agents 关系
  if (agentIds.length === 0) {
    agentIds = (group as any).agentIds || [];
  }

  const agentService = getAgentService();
  const agents = await agentService.list();
  const groupAgents = agents.filter((a: any) => agentIds.includes(a.id));
  res.json({ success: true, data: groupAgents, total: groupAgents.length });
}));

// 11. POST /api/groups/:id/pause — 暂停群组
router.post('/:id/pause', asyncHandler(async (req, res) => {
  const service = getGroupService();
  const group = await service.update(req.params.id, { status: GroupStatus.PAUSED });
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, data: group });
}));

// 12. POST /api/groups/:id/resume — 恢复群组
router.post('/:id/resume', asyncHandler(async (req, res) => {
  const service = getGroupService();
  const group = await service.update(req.params.id, { status: GroupStatus.ACTIVE });
  if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
  res.json({ success: true, data: group });
}));

export default router;
