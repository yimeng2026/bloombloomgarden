import { Router } from 'express';
import { GroupService, GroupStatus } from '../services/GroupService';
import { getGroupService, getAgentService } from '../services';
import prisma from '../config/prisma';

const router = Router();

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<void>) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

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

// 1. GET /api/groups — 列表
router.get('/', asyncHandler(async (_req, res) => {
  const service = getGroupService();
  const groups = await service.list();
  res.json({ success: true, data: groups, total: groups.length });
}));

// 2. POST /api/groups — 创建（支持 entityIds 代替 agentIds）
router.post('/', asyncHandler(async (req, res) => {
  const {
    name, description, parentId, coordinatorId,
    executionMode, maxDepth,
    // ─── 统一实体系统新字段 ────────────────────────
    entityIds,
    agentIds, // 向后兼容：旧字段 agentIds 映射到 entityIds
  } = req.body;

  // ── Step 1: 创建基础 Group ──
  const service = getGroupService();
  const group = await service.create({
    name,
    description,
    parentId,
    coordinatorId,
    executionMode,
    maxDepth,
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

// 4. PUT /api/groups/:id — 更新
router.put('/:id', asyncHandler(async (req, res) => {
  const service = getGroupService();
  const group = await service.update(req.params.id, req.body);
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
