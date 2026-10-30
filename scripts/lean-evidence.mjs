import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { leanTargets, selectedLeanFiles } from "./lean-self-check.mjs";

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function run(executable, args, cwd, timeout = 30_000) {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout,
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Lineage command failed: ${executable} ${args.join(" ")}; ${result.stderr || result.error?.message}`);
  }
  return String(result.stdout || "").trim();
}

export function collectLeanSourceLineage(env = process.env) {
  const projectRoot = path.resolve(env.TOE_SYLVA_LEAN_PROJECT || "");
  if (!env.TOE_SYLVA_LEAN_PROJECT) throw new Error("TOE_SYLVA_LEAN_PROJECT is required for source lineage");
  const lake = env.LAKE_EXECUTABLE?.trim() || "lake";
  const commit = run("git", ["-C", projectRoot, "rev-parse", "HEAD"], projectRoot);
  const branch = run("git", ["-C", projectRoot, "rev-parse", "--abbrev-ref", "HEAD"], projectRoot);
  const dirty = run("git", ["-C", projectRoot, "status", "--porcelain"], projectRoot).length > 0;
  const toolchain = run(lake, ["--version"], projectRoot);
  const selected = selectedLeanFiles(env.TOE_SYLVA_TEXT_FILES);
  const sourceRoot = env.TOE_SYLVA_PATH?.trim();
  const files = selected.map((relative) => {
    if (!sourceRoot) throw new Error("TOE_SYLVA_PATH is required for selected file lineage");
    const filePath = path.resolve(sourceRoot, relative);
    return { path: relative, sha256: sha256(fs.readFileSync(filePath)) };
  });
  const targets = leanTargets(env);
  const manifestPath = env.TOE_SYLVA_LEAN_MANIFEST?.trim();
  const manifestContent = manifestPath
    ? fs.readFileSync(path.resolve(manifestPath))
    : Buffer.from(JSON.stringify({
        textFiles: selected,
        targets,
        axiomCases: env.TOE_SYLVA_AXIOM_CASES ? JSON.parse(env.TOE_SYLVA_AXIOM_CASES) : [],
      }));
  return {
    repository: env.TOE_SYLVA_REPOSITORY || "TOE-SYLVA",
    commit,
    branch,
    dirty,
    toolchain,
    fileHashScope: files.length ? "selected_files" : "commit_only",
    files,
    manifestSha256: sha256(manifestContent),
  };
}

export function buildLeanValidationPlan({ taskId, source, build, cases }) {
  if (!taskId) throw new Error("A research task ID is required for Lean evidence lineage");
  if (!source?.commit || !source?.manifestSha256) throw new Error("Incomplete Lean source lineage");
  const lineage = {
    academicTaskId: taskId,
    source,
    confidenceMeaning: "execution evidence only, not scientific truth or physical-semantic confidence",
  };
  return {
    group: {
      name: "Lean 选定核心证据链",
      description: "关联源码提交、文件哈希、构建和声明级公理审计；不表示全库或物理语义通过。",
      targetModule: "lean/selected-cores",
      targetTheorem: "multiple selected declarations",
      validationType: "symbolic",
      strategy: lineage,
    },
    results: [
      {
        method: "lake_build",
        input: build.arguments.slice(1).join(" "),
        output: build.stdoutTail,
        conclusion: "verified",
        confidence: 1,
        details: JSON.stringify({ kind: "selected_target_build", ...lineage }),
      },
      ...cases.map((item) => ({
        method: "lean_print_axioms",
        input: item.declaration,
        output: item.axioms.join(", "),
        conclusion: item.classification === "standard_only" ? "verified" : "inconclusive",
        confidence: 1,
        details: JSON.stringify({ kind: "declaration_axiom_audit", case: item, ...lineage }),
      })),
    ],
  };
}

export async function recordLeanValidation({ origin, invoke, taskId, lean }) {
  const run = async (stage, operation) => {
    try {
      return await invoke(origin, operation);
    } catch (error) {
      throw new Error(`${stage}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  };
  const plan = buildLeanValidationPlan({
    taskId,
    source: lean.source,
    build: lean.build,
    cases: lean.axiomAudit.cases || [],
  });
  const created = await run("create-validation-group", {
    service: "research",
    method: "POST",
    path: "/api/research/validations",
    body: plan.group,
    confirm: true,
  });
  const groupId = created.data?.data?.id;
  if (!groupId) throw new Error("Lean validation group creation returned no ID");
  for (const result of plan.results) {
    await run(`write-validation-result:${result.method}`, {
      service: "research",
      method: "POST",
      path: `/api/research/validations/${groupId}/results`,
      body: result,
      confirm: true,
    });
  }
  const readback = await run("read-validation-group", {
    service: "research",
    method: "GET",
    path: `/api/research/validations/${groupId}`,
  });
  const group = readback.data?.data;
  if (!group || group.results?.length !== plan.results.length) {
    throw new Error("Lean validation result count does not match the execution plan");
  }
  const expectedConclusions = plan.results.map((item) => item.conclusion).sort();
  const actualConclusions = group.results.map((item) => item.conclusion).sort();
  if (JSON.stringify(actualConclusions) !== JSON.stringify(expectedConclusions)) {
    throw new Error("Lean validation conclusions do not preserve standard results and declared axiom debt");
  }
  const strategy = JSON.parse(group.strategy || "{}");
  if (strategy.academicTaskId !== taskId || strategy.source?.commit !== lean.source.commit) {
    throw new Error("Lean validation lineage does not match the task and source commit");
  }
  const standardCount = lean.axiomAudit.standardCaseCount || 0;
  const declaredCount = lean.axiomAudit.declaredAxiomCaseCount || 0;
  const taskResult = `技术验证已记录到 ${groupId}：构建通过；${standardCount} 条标准依赖声明，${declaredCount} 条已声明公理债务。不是全库或物理语义证明。`;
  await run("update-research-task", {
    service: "research",
    method: "PUT",
    path: `/api/research/tasks/${taskId}`,
    body: { status: "completed", result: taskResult },
    confirm: true,
  });
  const task = await run("read-research-task", { service: "research", method: "GET", path: `/api/research/tasks/${taskId}` });
  if (task.data?.data?.status !== "completed" || task.data?.data?.result !== taskResult) {
    throw new Error("Research task did not retain its Lean validation result");
  }
  return {
    groupId,
    academicTaskId: taskId,
    resultCount: plan.results.length,
    readback: true,
    taskStatus: task.data.data.status,
    sourceCommit: lean.source.commit,
    standardCaseCount: standardCount,
    declaredAxiomCaseCount: declaredCount,
  };
}
