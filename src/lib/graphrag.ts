import { prisma } from "@/lib/prisma";

// ===================== LLM 端点 =====================
const LLM_ENDPOINTS: Record<string, string> = {
  zhipu: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  deepseek: "https://api.deepseek.com/v1/chat/completions",
  google: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  alibaba: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  baidu: "https://qianfan.baidubce.com/v2/chat/completions",
  moonshot: "https://api.moonshot.cn/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
  xai: "https://api.x.ai/v1/chat/completions",
  cohere: "https://api.cohere.com/v2/chat",
  together: "https://api.together.xyz/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

// ===================== LLM 调用 =====================
export async function callLLM(
  messages: { role: string; content: string }[],
  options?: {
    provider?: string;
    apiKey?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }
): Promise<string> {
  const provider =
    options?.provider ||
    process.env.GRAPHRAG_LLM_PROVIDER ||
    "zhipu";
  const apiKey =
    options?.apiKey ||
    process.env.GRAPHRAG_LLM_API_KEY ||
    process.env.ZHIPU_API_KEY ||
    "";
  const model =
    options?.model ||
    process.env.GRAPHRAG_LLM_MODEL ||
    "glm-5.1";
  const temperature = options?.temperature ?? 0.3;
  const max_tokens = options?.max_tokens ?? 4096;

  const endpoint = LLM_ENDPOINTS[provider];
  if (!endpoint) throw new Error(`不支持的 LLM 供应商: ${provider}`);

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(provider === "anthropic"
        ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
        : {}),
      ...(provider === "openrouter"
        ? {
            HTTP_Referer: "https://bloombloomgarden.vercel.app",
            X_Title: "BloomBloomGarden",
          }
        : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      stream: false,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`LLM API 错误 (${resp.status}): ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

// ===================== 类型 =====================
export interface ExtractResult {
  entities: { name: string; type: string; description: string }[];
  relations: { source: string; target: string; description: string }[];
}

export interface QueryResult {
  answer: string;
  sources: { type: string; name: string; content: string }[];
}

export interface GraphStats {
  entityCount: number;
  relationCount: number;
  documentCount: number;
  communityCount: number;
  chunkCount: number;
}

// ===================== GraphRAG 类 =====================
export class GraphRAG {
  private chunkSize = 1200;
  private chunkOverlap = 100;

  /** 1. 文档摄入 */
  async ingest(
    text: string,
    title: string,
    docId?: string
  ): Promise<{ id: string; entityCount: number; relationCount: number }> {
    const document = await prisma.graphRagDocument.create({
      data: {
        id: docId,
        title,
        content: text,
        status: "indexing",
        chunkSize: this.chunkSize,
        chunkOverlap: this.chunkOverlap,
      },
    });

    const chunks = this.splitText(text, this.chunkSize, this.chunkOverlap);
    const chunkRecords: { id: string; content: string }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = await prisma.graphRagChunk.create({
        data: {
          docId: document.id,
          content: chunks[i],
          orderIndex: i,
        },
      });
      chunkRecords.push({ id: chunk.id, content: chunk.content });
    }

    // 抽取实体和关系
    const allEntities: {
      name: string;
      type: string;
      description: string;
      chunkId: string;
    }[] = [];
    const allRelations: {
      source: string;
      target: string;
      description: string;
      chunkId: string;
    }[] = [];

    for (const chunk of chunkRecords) {
      try {
        const result = await this.extractEntitiesAndRelations(chunk.content);
        for (const e of result.entities) {
          allEntities.push({ ...e, chunkId: chunk.id });
        }
        for (const r of result.relations) {
          allRelations.push({ ...r, chunkId: chunk.id });
        }
      } catch (err) {
        console.error(`Chunk ${chunk.id} 抽取失败:`, err);
      }
    }

    // 合并实体（按名称+类型去重）
    const entityMap = new Map<
      string,
      { name: string; type: string; description: string; chunkId: string }
    >();
    const entityChunkIds = new Map<string, Set<string>>();
    const entityDocIds = new Map<string, Set<string>>();

    for (const e of allEntities) {
      const key = `${e.name.toLowerCase()}|${e.type.toLowerCase()}`;
      if (!entityMap.has(key)) {
        entityMap.set(key, e);
        entityChunkIds.set(key, new Set());
        entityDocIds.set(key, new Set());
      }
      entityChunkIds.get(key)!.add(e.chunkId);
      entityDocIds.get(key)!.add(document.id);
    }

    // 创建/更新实体
    const entityIdMap = new Map<string, string>(); // key -> db id
    for (const [key, e] of entityMap) {
      const existing = await prisma.graphRagEntity.findFirst({
        where: { name: e.name, type: e.type },
      });
      const chunkIds = [...entityChunkIds.get(key)!];
      const docIds = [...entityDocIds.get(key)!];

      if (existing) {
        const existingChunkIds = new Set<string>(
          JSON.parse(existing.chunkIds || "[]")
        );
        const existingDocIds = new Set<string>(
          JSON.parse(existing.docIds || "[]")
        );
        for (const cid of chunkIds) existingChunkIds.add(cid);
        for (const did of docIds) existingDocIds.add(did);

        await prisma.graphRagEntity.update({
          where: { id: existing.id },
          data: {
            chunkIds: JSON.stringify([...existingChunkIds]),
            docIds: JSON.stringify([...existingDocIds]),
            description: existing.description || e.description,
          },
        });
        entityIdMap.set(key, existing.id);
      } else {
        const created = await prisma.graphRagEntity.create({
          data: {
            name: e.name,
            type: e.type,
            description: e.description,
            chunkIds: JSON.stringify(chunkIds),
            docIds: JSON.stringify(docIds),
          },
        });
        entityIdMap.set(key, created.id);
      }
    }

    // 创建/更新关系
    let relationCount = 0;
    for (const r of allRelations) {
      const sourceKey = `${r.source.toLowerCase()}`;
      const targetKey = `${r.target.toLowerCase()}`;

      let sourceId: string | null = null;
      let targetId: string | null = null;

      for (const [key, id] of entityIdMap) {
        const [name] = key.split("|");
        if (name === sourceKey) sourceId = id;
        if (name === targetKey) targetId = id;
      }

      if (sourceId && targetId) {
        const existing = await prisma.graphRagRelation.findFirst({
          where: { sourceId, targetId },
        });
        if (existing) {
          const existingChunkIds = new Set<string>(
            JSON.parse(existing.chunkIds || "[]")
          );
          const rChunk = allEntities.find(
            (e) => e.name.toLowerCase() === r.source.toLowerCase()
          )?.chunkId;
          if (rChunk) existingChunkIds.add(rChunk);
          await prisma.graphRagRelation.update({
            where: { id: existing.id },
            data: {
              chunkIds: JSON.stringify([...existingChunkIds]),
              weight: existing.weight + 1,
            },
          });
        } else {
          const rChunk = allEntities.find(
            (e) => e.name.toLowerCase() === r.source.toLowerCase()
          )?.chunkId;
          await prisma.graphRagRelation.create({
            data: {
              sourceId,
              targetId,
              description: r.description,
              chunkIds: JSON.stringify([rChunk || ""]),
              weight: 1,
            },
          });
          relationCount++;
        }
      }
    }

    // 更新文档状态
    await prisma.graphRagDocument.update({
      where: { id: document.id },
      data: { status: "indexed" },
    });

    // 社区检测（简化版）
    await this.buildCommunities();

    return {
      id: document.id,
      entityCount: entityMap.size,
      relationCount: relationCount,
    };
  }

  /** 2. LLM 实体/关系抽取 */
  async extractEntitiesAndRelations(chunk: string): Promise<ExtractResult> {
    const prompt = `从以下文本中抽取所有实体和它们之间的关系。

要求：
1. 实体类型包括：person（人物）、organization（组织）、concept（概念）、event（事件）、location（地点）、product（产品）
2. 返回严格的 JSON 格式，不要任何其他文字
3. JSON 格式如下：
{
  "entities": [
    {"name": "实体名", "type": "concept", "description": "简短描述"}
  ],
  "relations": [
    {"source": "源实体名", "target": "目标实体名", "description": "关系描述"}
  ]
}

文本：
"""
${chunk}
"""

请只返回 JSON，不要任何解释或 markdown 格式。`;

    const raw = await callLLM([
      {
        role: "system",
        content: "你是一个知识图谱抽取专家。只返回严格的 JSON 格式数据。",
      },
      { role: "user", content: prompt },
    ]);

    return this.parseExtractResult(raw);
  }

  private parseExtractResult(raw: string): ExtractResult {
    // 去掉 markdown 代码块标记
    let cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    // 尝试直接解析
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.entities && parsed.relations) return parsed;
    } catch {
      // 继续尝试
    }

    // 尝试提取大括号包裹的内容
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end >= 0 && end > start) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        if (parsed.entities && parsed.relations) return parsed;
      } catch {
        // 继续修复
      }
    }

    // 尝试修复常见格式问题
    let fixed = cleaned
      .replace(/,\s*]/g, "]")
      .replace(/,\s*}/g, "}")
      .replace(/}\s*{/g, "},{")
      .replace(/]\s*\[/g, "],[");

    try {
      const parsed = JSON.parse(fixed);
      if (parsed.entities && parsed.relations) return parsed;
    } catch {
      // 最后尝试
    }

    console.error(
      "无法解析 LLM 返回的 JSON:",
      cleaned.slice(0, 200)
    );
    return { entities: [], relations: [] };
  }

  private splitText(text: string, chunkSize: number, overlap: number): string[] {
    if (!text || chunkSize <= 0) return [];
    const chunks: string[] = [];
    const step = Math.max(1, chunkSize - overlap);

    for (let start = 0; start < text.length; start += step) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      if (end >= text.length) break;
    }

    return chunks;
  }

  /** 3. 查询 */
  async query(
    question: string,
    mode: "local" | "global" | "mix" | "naive"
  ): Promise<QueryResult> {
    switch (mode) {
      case "naive":
        return this.queryNaive(question);
      case "local":
        return this.queryLocal(question);
      case "global":
        return this.queryGlobal(question);
      case "mix":
        return this.queryMix(question);
      default:
        return this.queryNaive(question);
    }
  }

  private async queryNaive(question: string): Promise<QueryResult> {
    const keywords = question
      .split(/[\s,.!?;:，。！？；：]+/)
      .filter((w) => w.length > 1);

    const allChunks = await prisma.graphRagChunk.findMany();

    const scored = allChunks.map((chunk) => {
      const score = keywords.reduce((acc, kw) => {
        return (
          acc +
          (chunk.content.toLowerCase().includes(kw.toLowerCase()) ? 1 : 0)
        );
      }, 0);
      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, 5).filter((s) => s.score > 0);

    if (topChunks.length === 0) {
      return {
        answer: "未找到与问题相关的文档片段。",
        sources: [],
      };
    }

    const context = topChunks.map((s) => s.chunk.content).join("\n\n---\n\n");
    const answer = await this.generateAnswer(question, context);

    return {
      answer,
      sources: topChunks.map((s) => ({
        type: "chunk",
        name: `Chunk ${s.chunk.orderIndex}`,
        content: s.chunk.content.slice(0, 200),
      })),
    };
  }

  private async queryLocal(question: string): Promise<QueryResult> {
    const keywords = question
      .split(/[\s,.!?;:，。！？；：]+/)
      .filter((w) => w.length > 1);

    const allEntities = await prisma.graphRagEntity.findMany();
    const matchedEntities = allEntities.filter((e) =>
      keywords.some(
        (kw) =>
          e.name.toLowerCase().includes(kw.toLowerCase()) ||
          e.description.toLowerCase().includes(kw.toLowerCase())
      )
    );

    // 获取 2-3 跳邻居
    const visitedEntityIds = new Set<string>(
      matchedEntities.map((e) => e.id)
    );
    const frontier = matchedEntities.map((e) => e.id);
    const relations = await prisma.graphRagRelation.findMany();

    for (let hop = 0; hop < 2; hop++) {
      const nextFrontier: string[] = [];
      for (const rel of relations) {
        if (frontier.includes(rel.sourceId) && !visitedEntityIds.has(rel.targetId)) {
          visitedEntityIds.add(rel.targetId);
          nextFrontier.push(rel.targetId);
        }
        if (frontier.includes(rel.targetId) && !visitedEntityIds.has(rel.sourceId)) {
          visitedEntityIds.add(rel.sourceId);
          nextFrontier.push(rel.sourceId);
        }
      }
      frontier.length = 0;
      frontier.push(...nextFrontier);
      if (frontier.length === 0) break;
    }

    const contextEntities = await prisma.graphRagEntity.findMany({
      where: { id: { in: [...visitedEntityIds] } },
      include: {
        sourceRelations: {
          include: { targetEntity: { select: { name: true } } },
        },
        targetRelations: {
          include: { sourceEntity: { select: { name: true } } },
        },
      },
    });

    if (contextEntities.length === 0) {
      return {
        answer: "未找到与问题相关的实体。",
        sources: [],
      };
    }

    const context = contextEntities
      .map((e) => {
        const rels = [
          ...e.sourceRelations.map(
            (r) =>
              `-> ${r.targetEntity?.name || r.targetId}: ${r.description}`
          ),
          ...e.targetRelations.map(
            (r) =>
              `<- ${r.sourceEntity?.name || r.sourceId}: ${r.description}`
          ),
        ];
        return `实体: ${e.name} (${e.type})\n描述: ${e.description}\n关系:\n${rels.join("\n") || "无"}`;
      })
      .join("\n\n");

    const answer = await this.generateAnswer(question, context);

    return {
      answer,
      sources: contextEntities.slice(0, 10).map((e) => ({
        type: "entity",
        name: e.name,
        content: e.description || "无描述",
      })),
    };
  }

  private async queryGlobal(question: string): Promise<QueryResult> {
    const communities = await prisma.graphRagCommunity.findMany({
      where: { level: 0 },
      include: { entities: true },
    });

    if (communities.length === 0) {
      return {
        answer: "知识图谱中尚未构建社区。",
        sources: [],
      };
    }

    const context = communities
      .map((c) => {
        const entityNames = c.entities.map((e) => e.name).join(", ");
        return `社区摘要: ${c.summary}\n包含实体: ${entityNames}`;
      })
      .join("\n\n");

    const answer = await this.generateAnswer(question, context);

    return {
      answer,
      sources: communities.map((c) => ({
        type: "community",
        name: `Community ${c.id.slice(0, 8)}`,
        content: c.summary || "无摘要",
      })),
    };
  }

  private async queryMix(question: string): Promise<QueryResult> {
    const localResult = await this.queryLocal(question);
    const globalResult = await this.queryGlobal(question);

    const combinedContext = `【局部上下文】\n${localResult.answer}\n\n【全局上下文】\n${globalResult.answer}`;
    const answer = await this.generateAnswer(question, combinedContext);

    return {
      answer,
      sources: [...localResult.sources, ...globalResult.sources].slice(0, 10),
    };
  }

  private async generateAnswer(question: string, context: string): Promise<string> {
    const prompt = `基于以下上下文回答问题。如果上下文不包含足够信息，请明确说明。

上下文：
"""
${context}
"""

问题：${question}

请给出清晰、准确的回答。`;

    return await callLLM(
      [
        {
          role: "system",
          content: "你是一个知识图谱问答助手。基于提供的上下文回答问题。",
        },
        { role: "user", content: prompt },
      ],
      { temperature: 0.5 }
    );
  }

  /** 4. 图统计 */
  async getStats(): Promise<GraphStats> {
    const [
      entityCount,
      relationCount,
      documentCount,
      communityCount,
      chunkCount,
    ] = await Promise.all([
      prisma.graphRagEntity.count(),
      prisma.graphRagRelation.count(),
      prisma.graphRagDocument.count(),
      prisma.graphRagCommunity.count(),
      prisma.graphRagChunk.count(),
    ]);
    return { entityCount, relationCount, documentCount, communityCount, chunkCount };
  }

  /** 5. 辅助函数 */
  async listEntities(limit = 50) {
    return prisma.graphRagEntity.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        sourceRelations: {
          include: { targetEntity: { select: { name: true } } },
        },
        targetRelations: {
          include: { sourceEntity: { select: { name: true } } },
        },
      },
    });
  }

  async listRelations(limit = 50) {
    return prisma.graphRagRelation.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        sourceEntity: { select: { name: true } },
        targetEntity: { select: { name: true } },
      },
    });
  }

  async getEntityById(id: string) {
    return prisma.graphRagEntity.findUnique({
      where: { id },
      include: {
        sourceRelations: {
          include: { targetEntity: { select: { name: true } } },
        },
        targetRelations: {
          include: { sourceEntity: { select: { name: true } } },
        },
      },
    });
  }

  async getDocumentById(id: string) {
    return prisma.graphRagDocument.findUnique({
      where: { id },
      include: { chunks: true },
    });
  }

  async listDocuments() {
    return prisma.graphRagDocument.findMany({
      orderBy: { createdAt: "desc" },
      include: { chunks: { select: { id: true } } },
    });
  }

  /** 社区构建（简化：按实体类型分组） */
  private async buildCommunities() {
    // 先解除旧关联
    await prisma.graphRagEntity.updateMany({
      where: { communityId: { not: null } },
      data: { communityId: null },
    });
    // 删除旧社区（level=0 的叶子社区）
    await prisma.graphRagCommunity.deleteMany({ where: { level: 0 } });

    // 按实体类型分组
    const allEntities = await prisma.graphRagEntity.findMany();
    const typeMap = new Map<string, string[]>();

    for (const e of allEntities) {
      const list = typeMap.get(e.type) || [];
      list.push(e.id);
      typeMap.set(e.type, list);
    }

    for (const [type, entityIds] of typeMap) {
      const summary = await this.generateCommunitySummary(type, entityIds);
      const community = await prisma.graphRagCommunity.create({
        data: {
          level: 0,
          summary,
          entityIds: JSON.stringify(entityIds),
        },
      });

      // 关联实体
      await prisma.graphRagEntity.updateMany({
        where: { id: { in: entityIds } },
        data: { communityId: community.id },
      });
    }
  }

  private async generateCommunitySummary(
    type: string,
    entityIds: string[]
  ): Promise<string> {
    const entities = await prisma.graphRagEntity.findMany({
      where: { id: { in: entityIds } },
    });

    const names = entities.map((e) => e.name).join(", ");
    const prompt = `请为以下${type}类型的实体组生成一个简短的社区摘要（50字以内）。

实体列表：${names}

请只返回摘要文本，不要任何其他内容。`;

    try {
      return await callLLM(
        [
          {
            role: "system",
            content: "你是一个知识图谱社区摘要生成专家。",
          },
          { role: "user", content: prompt },
        ],
        { temperature: 0.3, max_tokens: 100 }
      );
    } catch {
      return `${type}类型社区，包含 ${entities.length} 个实体`;
    }
  }
}

// 导出单例
export const graphrag = new GraphRAG();
