import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Seed 5 Platforms ──────────────────────────────────
  const platforms = [
    { name: "OpenAI",       provider: "openai",    tier: "cloud", baseUri: "https://api.openai.com",       apiKeyRequired: true,  authType: "bearer", status: "active" },
    { name: "Anthropic",    provider: "anthropic", tier: "cloud", baseUri: "https://api.anthropic.com",    apiKeyRequired: true,  authType: "bearer", status: "active" },
    { name: "Kimi",         provider: "kimi",      tier: "cloud", baseUri: "https://api.moonshot.cn",      apiKeyRequired: true,  authType: "bearer", status: "active" },
    { name: "Ollama",       provider: "ollama",    tier: "local", baseUri: "http://localhost:11434",       apiKeyRequired: false, authType: "none",   status: "active" },
    { name: "Azure OpenAI", provider: "azure",     tier: "cloud", baseUri: "https://azure.openai.com",     apiKeyRequired: true,  authType: "apikey", status: "active" },
  ];

  for (const p of platforms) {
    await prisma.platform.upsert({
      where: { id: `seed-${p.provider}` },
      update: {},
      create: { id: `seed-${p.provider}`, ...p },
    });
  }
  console.log(`Seeded ${platforms.length} platforms`);

  // ─── Seed 50 SubTools: X=15, Y=15, Z=20 ───────────────
  const xCategories = ["REST", "SSE", "WebSocket", "gRPC", "GraphQL"];
  const yCategories = ["core", "extension", "integration"];
  const zCategories = ["data", "compute", "storage", "network", "ui", "security", "monitoring", "orchestration"];
  const protocols = ["REST", "SSE", "WS", "3DACP", "gRPC", "HTTP"];
  const statuses  = ["active", "beta", "planned"];
  const colors    = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

  const names = [
    // X=REST (15)
    "Agent REST API", "Task REST API", "Group REST API", "Blueprint REST API",
    "Dialog REST API", "Knowledge REST API", "Skill REST API", "Monitor REST API",
    "Platform REST API", "Preset REST API", "Handoff REST API", "Intervention REST API",
    "Coordinator REST API", "System REST API", "Log REST API",
    // Y=core (15)
    "Agent Core Engine", "Task Scheduler Core", "Group Coordinator Core", "Blueprint Engine Core",
    "Dialog Manager Core", "Knowledge Base Core", "Skill Registry Core", "Monitor Core",
    "Platform Adapter Core", "Preset Manager Core", "Handoff Protocol Core", "Intervention Core",
    "Coordinator Hierarchy Core", "System Manager Core", "Event Bus Core",
    // Z=data (20)
    "Data Store", "Cache Layer", "Index Engine", "Vector DB", "Document Parser",
    "Embedding Service", "Search Engine", "Data Pipeline", "ETL Worker", "Sync Engine",
    "Backup Service", "Migration Tool", "Data Validator", "Schema Manager", "Query Builder",
    "Analytics Engine", "Metrics Collector", "Trace Logger", "Audit Trail", "Data Exporter",
  ];

  // Clear existing subtools for idempotent seeding
  await prisma.subTool.deleteMany();

  for (let i = 0; i < names.length; i++) {
    let xCat: string, yCat: string, zCat: string;
    if (i < 15) {
      xCat = xCategories[i % 5];
      yCat = yCategories[i % 3];
      zCat = zCategories[i % 8];
    } else if (i < 30) {
      xCat = xCategories[(i + 2) % 5];
      yCat = yCategories[(i + 1) % 3];
      zCat = zCategories[(i + 3) % 8];
    } else {
      xCat = xCategories[(i + 4) % 5];
      yCat = yCategories[(i + 2) % 3];
      zCat = zCategories[(i + 5) % 8];
    }

    await prisma.subTool.create({
      data: {
        name: names[i],
        description: `${names[i]} \u2014 part of the Sylva ecosystem coordinate system.`,
        xCategory: xCat,
        yCategory: yCat,
        zCategory: zCat,
        xPos: Math.floor(Math.random() * 100),
        yPos: Math.floor(Math.random() * 100),
        zPos: Math.floor(Math.random() * 100),
        status: statuses[i % 3],
        protocol: protocols[i % 6],
        tags: JSON.stringify([xCat, yCat, zCat, protocols[i % 6]]),
        icon: "box",
        color: colors[i % 8],
      },
    });
  }

  console.log(`Seeded ${names.length} subtools`);
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
