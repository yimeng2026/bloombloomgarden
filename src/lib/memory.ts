import { prisma } from "@/lib/prisma";

/**
 * 记忆消息记录（从 Message 表提取的纯数据视图）
 */
export interface MemoryMessageRecord {
  id: string;
  role: string;
  content: string;
  agentName: string;
  createdAt: Date;
}

/**
 * 为指定 Agent 提供真实数据库存储和检索的记忆层。
 *
 * 实现基于 SQLite + Prisma：
 * - 消息持久化到 `Message` 表（通过 `Conversation` 关联到 Agent）
 * - 检索使用 Prisma `contains` → 底层 SQLite `LIKE` 查询
 * - 如果 Agent 尚无 Conversation，自动创建
 */
export class MemoryStore {
  /**
   * 确保目标 Agent 存在至少一个 Conversation，并返回最近一个的 ID。
   */
  private async ensureConversation(agentId: string): Promise<string> {
    const existing = await prisma.conversation.findFirst({
      where: { agentId },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return existing.id;
    }

    const created = await prisma.conversation.create({
      data: {
        title: "Memory Conversation",
        agentId,
      },
    });

    return created.id;
  }

  /**
   * 保存消息到 SQLite。
   *
   * 如果该 Agent 尚无 Conversation，自动创建后再写入。
   */
  async saveMessage(
    agentId: string,
    role: string,
    content: string
  ): Promise<MemoryMessageRecord> {
    const conversationId = await this.ensureConversation(agentId);

    const msg = await prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        agentName: "",
      },
    });

    // 触发 Conversation.updatedAt 刷新，确保后续 getRecentMessages 排序正确
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      agentName: msg.agentName,
      createdAt: msg.createdAt,
    };
  }

  /**
   * 基于关键词匹配（SQLite LIKE）检索相关历史消息。
   *
   * 查询会被拆分为多个关键词，使用 OR 连接。
   */
  async searchMemory(
    agentId: string,
    query: string,
    limit: number = 5
  ): Promise<MemoryMessageRecord[]> {
    const keywords = query.trim().split(/\s+/).filter(Boolean);

    if (keywords.length === 0) {
      return this.getRecentMessages(agentId, limit);
    }

    const whereClause =
      keywords.length === 1
        ? {
            content: { contains: keywords[0] },
            conversation: { agentId },
          }
        : {
            OR: keywords.map((k) => ({
              content: { contains: k },
              conversation: { agentId },
            })),
          };

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        agentName: true,
        createdAt: true,
      },
    });

    return messages;
  }

  /**
   * 获取该 Agent 最近 N 条消息（按时间倒序）。
   */
  async getRecentMessages(
    agentId: string,
    limit: number = 10
  ): Promise<MemoryMessageRecord[]> {
    const messages = await prisma.message.findMany({
      where: { conversation: { agentId } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        agentName: true,
        createdAt: true,
      },
    });

    return messages;
  }

  /**
   * 基于最近消息生成简单的会话摘要。
   *
   * 统计用户 / 助手消息数量，并列出最近 5 条消息的摘要片段。
   */
  async getConversationSummary(agentId: string): Promise<string> {
    const messages = await prisma.message.findMany({
      where: { conversation: { agentId } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        role: true,
        content: true,
        createdAt: true,
      },
    });

    if (messages.length === 0) {
      return "暂无对话记录。";
    }

    // 恢复时间顺序（旧 → 新）以便阅读
    const chronological = [...messages].reverse();

    const userCount = chronological.filter((m) => m.role === "user").length;
    const assistantCount = chronological.filter(
      (m) => m.role === "assistant"
    ).length;

    const lastExchanges = chronological
      .slice(-5)
      .map((m) => {
        const snippet =
          m.content.length > 80
            ? m.content.substring(0, 80) + "..."
            : m.content;
        return `[${m.role}]: ${snippet}`;
      })
      .join("\n");

    return [
      `最近 ${chronological.length} 条消息统计：用户 ${userCount} 条，助手 ${assistantCount} 条。`,
      "",
      "最近对话摘要：",
      lastExchanges,
    ].join("\n");
  }
}

/** 全局单例，可直接 import 使用 */
export const memoryStore = new MemoryStore();
