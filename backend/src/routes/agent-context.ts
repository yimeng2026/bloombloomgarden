/**
 * agent-context.ts — Agent 上下文查询 API
 * 对接前端 AgentContextPanel 组件
 * 真实数据：从 Prisma Agent + ChatMessage 表查询
 */

import { Router } from 'express';
import prisma from '../config/prisma';

const router = Router();

// GET /api/agents/:id/context
router.get('/:id/context', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. 查询 Agent 基本信息
    const agent = await prisma.agent.findUnique({ where: { id } });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent not found: ${id}`,
      });
    }

    // 2. 查询该 Agent 的 ChatMessage 历史
    const messages = await prisma.chatMessage.findMany({
      where: { agentId: id },
      orderBy: { createdAt: 'asc' },
      take: 50, // 最近50条
    });

    // 3. 解析 tokenUsage 从 stats 字段
    let tokenUsage = { used: 0, limit: 8192 };
    try {
      const stats = JSON.parse(agent.stats || '{}');
      if (stats.tokensUsed != null) {
        tokenUsage = { used: stats.tokensUsed, limit: 8192 };
      }
    } catch {
      // 保持默认
    }

    // 4. 构建上下文响应
    const context = {
      agentId: agent.id,
      agentName: agent.name || `Agent-${id.slice(-4)}`,
      role: agent.role || 'unknown',
      systemPrompt: agent.systemPrompt || '暂无系统提示配置',
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.createdAt.toISOString(),
        metadata: (() => {
          try { return JSON.parse(m.metadata || '{}'); } catch { return {}; }
        })(),
      })),
      toolCalls: [], // 暂无专用表，返回空数组
      knowledgeRefs: [], // 暂无专用表，返回空数组
      tokenUsage,
      stats: agent.stats,
      capabilities: (() => {
        try { return JSON.parse(agent.capabilities || '[]'); } catch { return []; }
      })(),
      tags: (() => {
        try { return JSON.parse(agent.tags || '[]'); } catch { return []; }
      })(),
      swarmEnabled: agent.swarmEnabled,
      swarmMode: agent.swarmMode,
      roleInGroup: agent.roleInGroup,
    };

    res.json({
      success: true,
      data: context,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[agent-context] Error fetching context:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }
});

// GET /api/agents/:id/context/stream — SSE 实时推送
router.get('/:id/context/stream', async (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Agent not found' })}\n\n`);
      res.end();
      return;
    }

    // 发送初始数据
    const messages = await prisma.chatMessage.findMany({
      where: { agentId: id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    let tokenUsage = { used: 0, limit: 8192 };
    try {
      const stats = JSON.parse(agent.stats || '{}');
      if (stats.tokensUsed != null) {
        tokenUsage = { used: stats.tokensUsed, limit: 8192 };
      }
    } catch {
      // 默认
    }

    const context = {
      agentId: agent.id,
      agentName: agent.name || `Agent-${id.slice(-4)}`,
      role: agent.role || 'unknown',
      systemPrompt: agent.systemPrompt || '暂无系统提示配置',
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.createdAt.toISOString(),
      })),
      toolCalls: [],
      knowledgeRefs: [],
      tokenUsage,
    };

    res.write(`data: ${JSON.stringify({ type: 'init', data: context })}\n\n`);

    // 模拟实时心跳（每5秒推送 tokenUsage 更新）
    const interval = setInterval(() => {
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        tokenUsage,
      })}\n\n`);
    }, 5000);

    req.on('close', () => {
      clearInterval(interval);
    });
  } catch (err: any) {
    console.error('[agent-context] SSE error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
});

export default router;
