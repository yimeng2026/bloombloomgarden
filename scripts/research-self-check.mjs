import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareLeanTextRoot, runLeanStage, withLeanManifest } from "./lean-self-check.mjs";
import { collectLeanSourceLineage, recordLeanValidation } from "./lean-evidence.mjs";
import { waitForHttpReady } from "./http-readiness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const withModel = process.argv.includes("--with-model");
const withArxiv = process.argv.includes("--with-arxiv");
const withLeanBuild = process.argv.includes("--with-lean-build");
const withLean = process.argv.includes("--with-lean") || withLeanBuild;
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: npm run self-check:research [-- --with-model] [-- --with-arxiv] [-- --with-lean-build]");
  console.log("Default: isolated database, catalog, stats and task read/write; no external request.");
  console.log("--with-model: tests the Kimi tool loop and GraphRAG ingest/query; may incur API usage.");
  console.log("--with-arxiv: fetches one real arXiv entry into an isolated KB; no model is required.");
  console.log("--with-lean: synchronizes Lean text only; requires TOE_SYLVA_PATH.");
  console.log("--with-lean-build: also builds selected targets; implies --with-lean.");
  console.log("Set TOE_SYLVA_LEAN_PROJECT and LAKE_EXECUTABLE for builds; optionally set TOE_SYLVA_AXIOM_DECLARATION.");
  process.exit(0);
}
if (withModel && !process.env.KIMI_API_KEY?.trim()) {
  throw new Error("--with-model requires KIMI_API_KEY in the server environment");
}

const evidenceDir = path.join(root, "data", "kimi-control");
fs.mkdirSync(evidenceDir, { recursive: true });
const workDir = fs.mkdtempSync(path.join(evidenceDir, "self-check-"));
const databasePath = path.join(workDir, "research.db");
const databaseUrl = `file:./${path.relative(root, databasePath).replaceAll("\\", "/")}`;
const frontierDir = path.join(workDir, "frontier");
const reportPath = path.join(evidenceDir, "research-self-check-latest.json");
const serviceLogPath = path.join(evidenceDir, "research-self-check-service.log");
const token = randomBytes(32).toString("hex");
const agentToken = token;
let child;
const report = {
  startedAt: new Date().toISOString(),
  scope: "isolated research API self-check; no external publication and no scientific-truth claim",
  withModel,
  withArxiv,
  withLean,
  withLeanBuild,
  checks: {},
  errors: [],
  serversStopped: false,
  temporaryDatabaseRemoved: false,
};

function failure(stage, error) {
  const message = error instanceof Error ? error.message : String(error);
  report.errors.push({ stage, message });
}

function runDatabaseSetup() {
  const cli = path.join(root, "node_modules", "prisma", "build", "index.js");
  const result = spawnSync(process.execPath, [cli, "db", "push"], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: 120_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Temporary database setup failed: ${result.stdout || ""}${result.stderr || ""}`.slice(0, 1500));
  }
}

async function freePort() {
  const server = net.createServer();
  server.unref();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  if (!port) throw new Error("Unable to allocate a local port");
  return port;
}

async function request(origin, route, body, timeoutMs = 45_000) {
  let response;
  try {
    response = await fetch(origin + route, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${agentToken}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const cause = error?.cause;
    const detail = cause?.code || cause?.message || error?.message || String(error);
    throw new Error(`Request failed for ${origin + route}: ${detail}`, { cause: error });
  }
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${route} returned non-JSON HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  if (!response.ok) throw new Error(`${route} returned HTTP ${response.status}: ${text.slice(0, 700)}`);
  return payload;
}

async function invoke(origin, operation, timeoutMs) {
  const envelope = await request(origin, "/api/kimi-control", operation, timeoutMs);
  if (!envelope.success || envelope.result?.status >= 400) {
    throw new Error(`${operation.method} ${operation.path} failed: ${JSON.stringify(envelope).slice(0, 700)}`);
  }
  return envelope.result;
}

async function stopService() {
  if (!child || (child.exitCode !== null && child.signalCode !== null)) {
    report.serversStopped = true;
    return;
  }
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false,
      windowsHide: true,
      timeout: 15_000,
    });
  } else {
    child.kill("SIGTERM");
  }
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 5000))]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 3000))]);
  }
  report.serversStopped = child.exitCode !== null || child.signalCode !== null;
}

async function main() {
  try {
    const leanEnv = withLeanManifest(process.env);
    const leanTextRoot = prepareLeanTextRoot(workDir, leanEnv);
    runDatabaseSetup();
    const port = await freePort();
    const origin = `http://127.0.0.1:${port}`;
    const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
    const logFd = fs.openSync(serviceLogPath, "w");
    child = spawn(process.execPath, [nextCli, "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: root,
      env: {
        ...leanEnv,
        DATABASE_URL: databaseUrl,
        TOE_SYLVA_PATH: leanTextRoot,
        FRONTIER_DATA_DIR: frontierDir,
        FRONTIER_KB_DIR: path.join(frontierDir, "kb"),
        GARDEN_AGENT_TOKEN: agentToken,
        GARDEN_USE_CLUSTER: "0",
        HOST: "127.0.0.1",
        NODE_ENV: "development",
      },
      stdio: ["ignore", logFd, logFd],
      shell: false,
      windowsHide: true,
    });
    fs.closeSync(logFd);

    const deadline = Date.now() + 90_000;
    for (;;) {
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`Research service exited before readiness; inspect ${serviceLogPath}`);
      }
      try {
        const response = await fetch(origin + "/", { signal: AbortSignal.timeout(2000) });
        if (response.ok) break;
      } catch {
        // Service is still starting.
      }
      if (Date.now() >= deadline) throw new Error("Timed out waiting for the isolated research API");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const catalog = await request(origin, "/api/kimi-control?service=research&method=GET&path=/api/research/tasks");
    if (!catalog.success || !catalog.operations?.some((item) => item.path === "/api/research/tasks")) {
      throw new Error("Research task operation was not discovered");
    }
    report.checks.catalog = { count: catalog.count };

    const stats = await invoke(origin, { service: "research", method: "GET", path: "/api/research/stats" });
    report.checks.stats = { status: stats.status, fields: Object.keys(stats.data?.data || {}) };

    const taskBody = {
      title: withLean ? "Lean 核心构建与公理证据审计" : "一次性研究自检任务",
      description: withLean
        ? "关联源码提交、文件哈希、清单、构建和声明级公理审计；不是全库或物理语义证明。"
        : "隔离数据库中的技术自检记录；不是正式研究结论。",
      type: "verify",
      priority: "normal",
      targetModule: withLean ? "lean/selected-cores" : "system/research-self-check",
    };
    const created = await invoke(origin, {
      service: "research",
      method: "POST",
      path: "/api/research/tasks",
      body: taskBody,
      confirm: true,
    });
    const taskId = created.data?.data?.id;
    if (!taskId) throw new Error("Task creation returned no ID");
    const tasks = await invoke(origin, {
      service: "research",
      method: "GET",
      path: "/api/research/tasks",
      query: { targetModule: taskBody.targetModule },
    });
    if (!tasks.data?.data?.some((item) => item.id === taskId)) {
      throw new Error("Created task was not returned by readback");
    }
    report.checks.task = { created: true, readback: true, taskId };

    if (withArxiv) {
      const ingestionResult = await invoke(origin, {
        service: "research",
        method: "POST",
        path: "/api/frontier/arxiv",
        body: { topics: ["quant-ph"], maxResults: 1, digest: withModel },
        confirm: true,
      }, 240_000);
      const ingestion = ingestionResult.data;
      if (!ingestion.ok || ingestion.fetched !== 1 || ingestion.newCount !== 1 || ingestion.kbCardsWritten !== 1) {
        throw new Error(`Unexpected arXiv ingestion report: ${JSON.stringify(ingestion).slice(0, 900)}`);
      }
      const digestSource = withModel ? ingestion.digest?.digestSource : "not-requested";
      if (withModel && !["llm", "fallback-raw"].includes(digestSource)) {
        throw new Error("arXiv digest did not identify its model or fallback source");
      }
      const listed = await invoke(origin, {
        service: "research",
        method: "GET",
        path: "/api/frontier/arxiv",
        query: { topic: "quant-ph", limit: 1 },
      });
      const entry = listed.data?.entries?.[0];
      if (!entry?.id || !/v\d+$/.test(entry.id)) throw new Error("Real arXiv entry has no versioned ID");
      if (entry.baseId !== entry.id.replace(/v\d+$/, "")) throw new Error("arXiv baseId does not match its versioned ID");
      if (entry.link !== `https://arxiv.org/abs/${entry.id}`) throw new Error("arXiv link lost its version");
      if (!entry.title || !entry.abstract || !entry.authors?.length) throw new Error("arXiv metadata is incomplete");
      for (const field of ["published", "updated", "ingestedAt"]) {
        if (!Number.isFinite(Date.parse(entry[field]))) throw new Error(`Invalid arXiv ${field} timestamp`);
      }
      const kb = await invoke(origin, {
        service: "research",
        method: "GET",
        path: "/api/frontier/kb",
        query: { topic: "quant-ph", limit: 10 },
      });
      const card = kb.data?.cards?.find((item) => item.id === entry.id);
      if (!card || card.link !== entry.link || !card.file.endsWith(`${entry.id.replaceAll("/", "_")}.md`)) {
        throw new Error("Versioned KB card was not returned by readback");
      }
      report.checks.arxiv = {
        id: entry.id,
        baseId: entry.baseId,
        link: entry.link,
        published: entry.published,
        updated: entry.updated,
        ingestedAt: entry.ingestedAt,
        kbCard: card.file,
        digestSource,
        llmError: ingestion.digest?.llmError,
        lineageScope: "one real latest entry; multi-version fixtures are tested separately",
      };
    } else {
      report.checks.arxiv = { status: "skipped", reason: "requires --with-arxiv" };
    }

    if (withLean) {
      await runLeanStage({ origin, invoke, withBuild: withLeanBuild, checks: report.checks, env: leanEnv });
      if (withLeanBuild) {
        // Long external builds can be followed by a transient ECONNRESET.
        // Probe read-only first; never retry a write whose outcome is unknown.
        await waitForHttpReady({ origin });
        report.checks.lean.source = collectLeanSourceLineage(leanEnv);
        report.checks.lean.validation = await recordLeanValidation({
          origin,
          invoke,
          taskId,
          lean: report.checks.lean,
        });
      }
    } else {
      report.checks.lean = { status: "skipped", reason: "requires --with-lean or --with-lean-build" };
    }

    if (withModel) {
      const agent = await request(origin, "/api/kimi-agent", {
        message: "请只执行只读操作：先用 garden_catalog 找到 research 服务的 GET /api/research/stats，再用 garden_invoke 调用一次。最后简短列出返回的顶层字段。不要调用其他接口，不要写操作。",
        allowWrites: false,
        maxSteps: 4,
      }, 180_000);
      const validOperation = agent.operations?.some((item) =>
        item.operationId === "research:GET:/api/research/stats" && item.status === 200
      );
      if (!agent.success || !validOperation) throw new Error("Kimi did not complete the required stats tool call");
      report.checks.kimiAgent = {
        provider: agent.provider,
        model: agent.model,
        steps: agent.steps,
        operations: agent.operations,
        usage: agent.usage,
      };

      const document = await invoke(origin, {
        service: "research",
        method: "POST",
        path: "/api/graphrag/documents",
        body: {
          title: "self-check/cmb-lensing",
          content: "自检专用测试文本，不是新的研究结论。CMB 透镜会按照沿途物质的引力场重新映射光子的方向。透镜重建可以利用温度与极化场的高阶相关估计透镜场，但重建仍然带有模型假设和系统误差。CMB 透镜本身不能唯一证明暗物质，需要与其他观测联合检验。",
        },
        confirm: true,
      }, 180_000);
      const documentId = document.data?.id;
      if (!documentId || document.data?.status !== "indexed" || document.data?.failedChunkCount !== 0) {
        throw new Error(`GraphRAG ingestion was not fully indexed: ${JSON.stringify(document.data)}`);
      }
      if (!(document.data?.entityCount > 0)) throw new Error("GraphRAG returned no extracted entities");
      const documents = await invoke(origin, { service: "research", method: "GET", path: "/api/graphrag/documents" });
      if (!documents.data?.some((item) => item.id === documentId && item.status === "indexed")) {
        throw new Error("Indexed document was not returned by readback");
      }
      const graphStats = await invoke(origin, { service: "research", method: "GET", path: "/api/graphrag/stats" });
      if (graphStats.data?.documentCount !== 1 || !(graphStats.data?.chunkCount > 0)) {
        throw new Error("GraphRAG statistics do not match the isolated test document");
      }
      const query = await invoke(origin, {
        service: "research",
        method: "POST",
        path: "/api/graphrag/query",
        body: { question: "CMB 透镜如何改变信息？", mode: "naive" },
        confirm: true,
      }, 180_000);
      if (!query.data?.answer || !query.data?.sources?.length) {
        throw new Error("GraphRAG query returned neither an answer nor source chunks");
      }
      report.checks.graphrag = {
        documentId,
        status: document.data.status,
        entityCount: document.data.entityCount,
        relationCount: document.data.relationCount,
        chunkCount: document.data.chunkCount,
        querySourceCount: query.data.sources.length,
        queryAnswer: query.data.answer,
        semanticReview: "not assessed; technical retrieval only",
      };
    } else {
      report.checks.graphrag = { status: "skipped", reason: "requires --with-model" };
    }
  } catch (error) {
    failure("research-self-check", error);
  } finally {
    try {
      await stopService();
    } catch (error) {
      failure("stop-service", error);
    }
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
      report.temporaryDatabaseRemoved = !fs.existsSync(workDir);
    } catch (error) {
      failure("remove-temporary-database", error);
    }
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  }

  console.log(JSON.stringify({
    success: report.errors.length === 0 && report.serversStopped && report.temporaryDatabaseRemoved,
    withModel,
    withArxiv,
    withLean,
    withLeanBuild,
    checks: report.checks,
    errors: report.errors,
    serversStopped: report.serversStopped,
    temporaryDatabaseRemoved: report.temporaryDatabaseRemoved,
    evidence: reportPath,
  }, null, 2));
  if (report.errors.length || !report.serversStopped || !report.temporaryDatabaseRemoved) process.exitCode = 1;
}

await main();
