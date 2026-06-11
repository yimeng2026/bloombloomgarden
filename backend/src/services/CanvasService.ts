import { EventEmitter } from 'events';
import { prisma } from './PrismaService';

export interface CanvasData {
  name: string;
  description?: string;
  content?: Record<string, unknown>;
  ownerId?: string;
  teamId?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface CanvasRevisionData {
  canvasId: string;
  content: Record<string, unknown>;
  changedBy?: string;
  changeSummary?: string;
}

export class CanvasService extends EventEmitter {
  // 列出所有画布
  async listCanvases() {
    const canvases = await prisma.canvas.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } },
    });
    return canvases.map((c) => ({
      ...c,
      content: JSON.parse(c.content || '{}'),
      metadata: JSON.parse(c.metadata || '{}'),
    }));
  }

  // 获取单个画布
  async getCanvas(id: string) {
    const canvas = await prisma.canvas.findUnique({
      where: { id },
      include: { revisions: { orderBy: { revisionNumber: 'desc' } } },
    });
    if (!canvas) return null;
    return {
      ...canvas,
      content: JSON.parse(canvas.content || '{}'),
      metadata: JSON.parse(canvas.metadata || '{}'),
      revisions: canvas.revisions.map((r) => ({
        ...r,
        content: JSON.parse(r.content || '{}'),
      })),
    };
  }

  // 创建画布
  async createCanvas(data: CanvasData) {
    const canvas = await prisma.canvas.create({
      data: {
        name: data.name,
        description: data.description,
        content: JSON.stringify(data.content || {}),
        ownerId: data.ownerId,
        teamId: data.teamId,
        status: data.status || 'active',
        metadata: JSON.stringify(data.metadata || {}),
      },
    });

    this.emit('canvas:created', { id: canvas.id, name: canvas.name });
    return { ...canvas, content: JSON.parse(canvas.content || '{}'), metadata: JSON.parse(canvas.metadata || '{}') };
  }

  // 更新画布
  async updateCanvas(id: string, data: Partial<CanvasData>) {
    const existing = await prisma.canvas.findUnique({ where: { id } });
    if (!existing) return null;

    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.content !== undefined) updateData.content = JSON.stringify(data.content);
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;
    if (data.teamId !== undefined) updateData.teamId = data.teamId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);

    const canvas = await prisma.canvas.update({ where: { id }, data: updateData });

    this.emit('canvas:updated', { id: canvas.id, name: canvas.name });
    return { ...canvas, content: JSON.parse(canvas.content || '{}'), metadata: JSON.parse(canvas.metadata || '{}') };
  }

  // 删除画布
  async deleteCanvas(id: string) {
    try {
      await prisma.canvas.delete({ where: { id } });
      this.emit('canvas:deleted', { id });
      return true;
    } catch {
      return false;
    }
  }

  // 创建版本快照
  async createRevision(canvasId: string, content: Record<string, unknown>, changedBy?: string, changeSummary?: string) {
    const canvas = await prisma.canvas.findUnique({ where: { id: canvasId } });
    if (!canvas) throw new Error('Canvas not found');

    const lastRevision = await prisma.canvasRevision.findFirst({
      where: { canvasId },
      orderBy: { revisionNumber: 'desc' },
    });
    const nextNumber = (lastRevision?.revisionNumber || 0) + 1;

    const revision = await prisma.canvasRevision.create({
      data: {
        canvasId,
        revisionNumber: nextNumber,
        content: JSON.stringify(content),
        changedBy,
        changeSummary,
      },
    });

    this.emit('canvas:revision:created', { canvasId, revisionId: revision.id, revisionNumber: nextNumber });
    return { ...revision, content: JSON.parse(revision.content || '{}') };
  }

  // 获取版本历史
  async getRevisions(canvasId: string) {
    const revisions = await prisma.canvasRevision.findMany({
      where: { canvasId },
      orderBy: { revisionNumber: 'desc' },
    });
    return revisions.map((r) => ({ ...r, content: JSON.parse(r.content || '{}') }));
  }

  // 恢复到指定版本
  async restoreRevision(canvasId: string, revisionId: string) {
    const canvas = await prisma.canvas.findUnique({ where: { id: canvasId } });
    if (!canvas) throw new Error('Canvas not found');

    const revision = await prisma.canvasRevision.findFirst({
      where: { id: revisionId, canvasId },
    });
    if (!revision) throw new Error('Revision not found');

    const restoredContent = JSON.parse(revision.content || '{}');

    // 先创建当前状态的快照
    await this.createRevision(canvasId, JSON.parse(canvas.content || '{}'), 'system', `Auto-snapshot before restoring to revision ${revision.revisionNumber}`);

    // 恢复内容
    const updated = await prisma.canvas.update({
      where: { id: canvasId },
      data: {
        content: revision.content,
        updatedAt: new Date(),
      },
    });

    this.emit('canvas:revision:restored', { canvasId, revisionId, revisionNumber: revision.revisionNumber });
    return { ...updated, content: restoredContent, metadata: JSON.parse(updated.metadata || '{}') };
  }
}

let canvasService: CanvasService | null = null;
export function getCanvasService(): CanvasService {
  if (!canvasService) canvasService = new CanvasService();
  return canvasService;
}
