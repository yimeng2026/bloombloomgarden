import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Seed Channels
  const channels = [
    { name: "WhatsApp", type: "whatsapp", status: "connected", category: "即时通讯", messageCount: 342, lastActive: "刚刚", users: 12, config: JSON.stringify({ phone: "+86-***-****" }) },
    { name: "Telegram", type: "telegram", status: "connected", category: "即时通讯", messageCount: 156, lastActive: "2分钟前", users: 8, config: JSON.stringify({ botToken: "***" }) },
    { name: "Discord", type: "discord", status: "connected", category: "即时通讯", messageCount: 89, lastActive: "5分钟前", users: 24, config: JSON.stringify({ serverId: "***" }) },
    { name: "Slack", type: "slack", status: "connected", category: "即时通讯", messageCount: 203, lastActive: "1分钟前", users: 15, config: JSON.stringify({ workspace: "***" }) },
    { name: "微信", type: "wechat", status: "connected", category: "即时通讯", messageCount: 412, lastActive: "刚刚", users: 45, config: JSON.stringify({ appId: "***" }) },
    { name: "飞书", type: "feishu", status: "connected", category: "办公协作", messageCount: 67, lastActive: "10分钟前", users: 6, config: JSON.stringify({ appId: "***" }) },
  ];
  for (const c of channels) {
    await prisma.channel.create({ data: c }).catch(() => {});
  }

  // Seed Plugins
  const plugins = [
    { name: "File System", description: "文件系统读写操作", version: "2.1.0", latestVersion: "2.1.0", status: "active", category: "core", author: "OpenClaw", size: "12KB" },
    { name: "Browser", description: "网页浏览与搜索", version: "1.5.2", latestVersion: "1.5.3", status: "active", category: "core", author: "OpenClaw", size: "45KB" },
    { name: "Shell", description: "Shell 命令执行", version: "3.0.1", latestVersion: "3.0.1", status: "active", category: "core", author: "OpenClaw", size: "8KB" },
  ];
  for (const p of plugins) {
    await prisma.plugin.create({ data: p }).catch(() => {});
  }

  // Seed Skills
  const skills = [
    { name: "代码生成", description: "根据需求生成代码片段", category: "dev", level: "advanced", agentCount: 5 },
    { name: "数据分析", description: "数据清洗与可视化分析", category: "data", level: "intermediate", agentCount: 3 },
    { name: "文档写作", description: "技术文档与报告撰写", category: "writing", level: "intermediate", agentCount: 4 },
  ];
  for (const s of skills) {
    await prisma.skill.create({ data: s }).catch(() => {});
  }

  // Seed Tasks
  const tasks = [
    { name: "数据同步任务", description: "同步各节点数据到主库", status: "running", priority: "high", progress: 65, agentName: "Agent-A", estimated: "2小时", tags: JSON.stringify(["自动", "高频"]) },
    { name: "模型训练", description: "训练新模型版本", status: "pending", priority: "medium", progress: 0, agentName: "Agent-B", estimated: "4小时", tags: JSON.stringify(["训练", "GPU"]) },
  ];
  for (const t of tasks) {
    await prisma.task.create({ data: t }).catch(() => {});
  }

  // Seed Knowledge Bases
  const kbs = [
    { name: "技术文档库", description: "API文档、开发规范、代码库说明", type: "technical", docCount: 156, indexedCount: 156, totalCount: 156, tags: JSON.stringify(["API", "开发", "架构"]), lastUpdated: "2小时前", status: "synced" },
    { name: "产品知识库", description: "产品功能说明、用户手册、FAQ", type: "business", docCount: 89, indexedCount: 89, totalCount: 89, tags: JSON.stringify(["产品", "用户", "FAQ"]), lastUpdated: "1天前", status: "synced" },
  ];
  for (const kb of kbs) {
    await prisma.knowledgeBase.create({ data: kb }).catch(() => {});
  }

  // Seed Teams
  const teams = [
    { name: "开发团队", description: "前端+后端+测试", members: JSON.stringify(["Agent-A", "Agent-B", "Agent-C", "Agent-D"]), taskCount: 3, status: "active" },
    { name: "数据分析组", description: "数据处理与可视化", members: JSON.stringify(["Agent-E", "Agent-F"]), taskCount: 2, status: "active" },
  ];
  for (const t of teams) {
    await prisma.team.create({ data: t }).catch(() => {});
  }

  // Seed Company Config
  await prisma.companyConfig.create({
    data: {
      name: "BloomGarden AI",
      description: "AI 驱动的智能协作平台",
      gatewayUrl: "http://localhost:11435",
      gatewayStatus: "online",
      gatewayVersion: "v2.1.0",
      apiKey: "",
      defaultModel: "glm-5.1",
      timeout: 30000,
      retries: 3,
      concurrency: 10,
    },
  }).catch(() => {});

  console.log("Seeding complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
