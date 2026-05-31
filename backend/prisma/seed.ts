import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Seed 2 Groups ─────────────────────────────────────
  const groups = [
    { id: "seed-group-1", name: "协作组 A", description: "通用协作智能体群组", parentId: null, coordinatorId: null, executionMode: "sequential", status: "active", maxDepth: 3 },
    { id: "seed-group-2", name: "协作组 B", description: "数据处理与存储群组", parentId: null, coordinatorId: null, executionMode: "parallel", status: "active", maxDepth: 2 },
  ];
  for (const g of groups) {
    await prisma.group.upsert({ where: { id: g.id }, update: {}, create: g });
  }
  console.log(`Seeded ${groups.length} groups`);

  // ─── Seed 4 Agents ─────────────────────────────────────
  const agents = [
    { id: "seed-agent-1", name: "通用助手", role: "general", status: "active", config: "{}", knowledgeBaseIds: "[]", skillIds: "[\"seed-skill-1\"]", workspaceId: null, integrationIds: "[]", groupId: "seed-group-1", description: "全能型AI助手", avatar: "Bot" },
    { id: "seed-agent-2", name: "代码专家", role: "coder", status: "active", config: "{}", knowledgeBaseIds: "[]", skillIds: "[\"seed-skill-2\"]", workspaceId: null, integrationIds: "[]", groupId: "seed-group-1", description: "精通编程和代码审查", avatar: "Code" },
    { id: "seed-agent-3", name: "创意写作", role: "creative", status: "active", config: "{}", knowledgeBaseIds: "[]", skillIds: "[\"seed-skill-3\"]", workspaceId: null, integrationIds: "[]", groupId: "seed-group-1", description: "擅长写作和创意生成", avatar: "Sparkles" },
    { id: "seed-agent-4", name: "数据分析师", role: "analyst", status: "active", config: "{}", knowledgeBaseIds: "[]", skillIds: "[\"seed-skill-4\"]", workspaceId: null, integrationIds: "[]", groupId: "seed-group-2", description: "擅长数据分析和洞察提取", avatar: "BarChart" },
  ];
  for (const a of agents) {
    await prisma.agent.upsert({ where: { id: a.id }, update: {}, create: a });
  }
  console.log(`Seeded ${agents.length} agents`);

  // ─── Seed 2 Knowledge Bases ─────────────────────────────
  const kbs = [
    { id: "seed-kb-1", name: "技术文档库", description: "API 文档和技术参考", documentIds: "[]", embeddingModel: "text-embedding-3-small" },
    { id: "seed-kb-2", name: "产品知识库", description: "产品功能和使用指南", documentIds: "[]", embeddingModel: "text-embedding-3-small" },
  ];
  for (const kb of kbs) {
    await prisma.knowledgeBase.upsert({ where: { id: kb.id }, update: {}, create: kb });
  }
  console.log(`Seeded ${kbs.length} knowledge bases`);

  // ─── Seed 4 Skills ─────────────────────────────────────
  const skills = [
    { id: "seed-skill-1", name: "通用对话", description: "基础对话和问答能力", type: "core", config: "{}", enabled: true, version: "1.0" },
    { id: "seed-skill-2", name: "代码生成", description: "代码编写和调试能力", type: "development", config: "{}", enabled: true, version: "1.0" },
    { id: "seed-skill-3", name: "创意写作", description: "文案和创意内容生成", type: "creative", config: "{}", enabled: true, version: "1.0" },
    { id: "seed-skill-4", name: "数据分析", description: "数据处理和洞察提取", type: "analytics", config: "{}", enabled: true, version: "1.0" },
  ];
  for (const s of skills) {
    await prisma.skill.upsert({ where: { id: s.id }, update: {}, create: s });
  }
  console.log(`Seeded ${skills.length} skills`);

  // ─── Seed 2 Blueprints ───────────────────────────────────
  const blueprints = [
    { id: "seed-bp-1", name: "工作流模板", description: "标准智能体工作流", steps: "[]", variables: "{}", tags: "[\"工作流\",\"模板\"]" },
    { id: "seed-bp-2", name: "数据管道", description: "ETL 数据处理管道", steps: "[]", variables: "{}", tags: "[\"数据\",\"管道\"]" },
  ];
  for (const bp of blueprints) {
    await prisma.blueprint.upsert({ where: { id: bp.id }, update: {}, create: bp });
  }
  console.log(`Seeded ${blueprints.length} blueprints`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
