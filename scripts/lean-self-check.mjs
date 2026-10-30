import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const STANDARD_AXIOMS = ["propext", "Classical.choice", "Quot.sound"];

export function leanTargets(env = process.env) {
  const targets = (env.TOE_SYLVA_LEAN_TARGETS || "SYLVA_CHSHCore")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!targets.length || targets.length > 4) throw new Error("Lean self-check requires 1-4 targets");
  for (const target of targets) {
    if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(target)) throw new Error(`Invalid Lean target: ${target}`);
  }
  return targets;
}

export function selectedLeanFiles(value) {
  if (!value) return [];
  const files = value.split(",").map((item) => item.trim().replaceAll("\\", "/")).filter(Boolean);
  if (!files.length || files.length > 8) throw new Error("Lean text self-check accepts 1-8 selected files");
  for (const file of files) {
    if (file.startsWith("/") || path.win32.isAbsolute(file) || file.split("/").includes("..") || !file.endsWith(".lean")) {
      throw new Error(`Invalid selected Lean source: ${file}`);
    }
  }
  return files;
}

export function prepareLeanTextRoot(workDir, env = process.env) {
  const files = selectedLeanFiles(env.TOE_SYLVA_TEXT_FILES);
  if (!files.length) return env.TOE_SYLVA_PATH?.trim() || "";
  const sourceRoot = env.TOE_SYLVA_PATH?.trim();
  if (!sourceRoot) throw new Error("TOE_SYLVA_PATH is required with TOE_SYLVA_TEXT_FILES");
  const sourceRootAbsolute = path.resolve(sourceRoot);
  const targetRoot = path.join(workDir, "lean-text");
  for (const relative of files) {
    const source = path.resolve(sourceRootAbsolute, relative);
    if (!source.startsWith(sourceRootAbsolute + path.sep)) throw new Error("Selected Lean source escapes its root");
    const stat = fs.lstatSync(source);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Selected Lean source is not a regular file: ${relative}`);
    if (stat.size > 5 * 1024 * 1024) throw new Error(`Selected Lean source exceeds 5 MiB: ${relative}`);
    const destination = path.join(targetRoot, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  return targetRoot;
}

export function parseLeanAxioms(output) {
  if (/does not depend on any axioms/i.test(output)) return [];
  const match = output.match(/depends on axioms:\s*\[([^\]]*)\]/i);
  if (!match) throw new Error("Unable to parse #print axioms output");
  return match[1].split(",").map((item) => item.trim()).filter(Boolean);
}

export function assertLeanAxioms(output, allowed = STANDARD_AXIOMS) {
  if (/\bsorryAx\b/.test(output)) throw new Error("Lean declaration depends on sorryAx");
  const axioms = parseLeanAxioms(output);
  const unexpected = axioms.filter((item) => !allowed.includes(item));
  if (unexpected.length) throw new Error(`Unexpected Lean axioms: ${unexpected.join(", ")}`);
  return axioms;
}

function outputTail(value) {
  return String(value || "").slice(-4000);
}

export async function runLeanStage({ origin, invoke, withBuild, checks, env = process.env }) {
  const state = {
    text: { status: "pending" },
    build: { status: withBuild ? "pending" : "skipped", reason: withBuild ? undefined : "requires --with-lean-build" },
    axiomAudit: { status: "not-run" },
    semanticReview: "not assessed; text parsing and Lean compilation do not validate physical semantics",
  };
  checks.lean = state;
  const source = env.TOE_SYLVA_PATH?.trim();
  if (!source) throw new Error("TOE_SYLVA_PATH is required for Lean text synchronization");
  if (!fs.existsSync(path.resolve(source))) throw new Error("TOE_SYLVA_PATH does not exist");

  const sync = await invoke(origin, {
    service: "research",
    method: "POST",
    path: "/api/research/sylva-sync",
    body: { analyzeWithLLM: false, createTasks: false },
    confirm: true,
  }, 180_000);
  const detail = sync.data?.data;
  if (!sync.data?.success || detail?.analysisMode !== "text_only_not_compiled" || !(detail.filesParsed > 0)) {
    throw new Error("SYLVA text synchronization did not return a bounded text-only result");
  }
  state.text = {
    status: "success",
    analysisMode: detail.analysisMode,
    sourceScope: env.TOE_SYLVA_TEXT_FILES ? "selected_files_not_full_repository" : "configured_source_tree",
    selectedFiles: selectedLeanFiles(env.TOE_SYLVA_TEXT_FILES),
    filesParsed: detail.filesParsed,
    theoremsTotal: detail.theoremsTotal,
    definitionsTotal: detail.definitionsTotal,
    sorryTotal: detail.sorryTotal,
    axiomTotal: detail.axiomTotal,
  };
  const readback = await invoke(origin, { service: "research", method: "GET", path: "/api/research/sylva-sync" });
  if (!readback.data?.data?.syncHistory?.some((item) => item.repoName === "TOE-SYLVA")) {
    throw new Error("SYLVA text synchronization was not returned by readback");
  }
  state.text.readback = true;
  if (!withBuild) return;

  const project = env.TOE_SYLVA_LEAN_PROJECT?.trim();
  if (!project) throw new Error("TOE_SYLVA_LEAN_PROJECT is required for a real Lean build");
  const projectRoot = path.resolve(project);
  if (!fs.existsSync(path.join(projectRoot, "lakefile.lean")) && !fs.existsSync(path.join(projectRoot, "lakefile.toml"))) {
    throw new Error("TOE_SYLVA_LEAN_PROJECT has no lakefile");
  }
  const lake = env.LAKE_EXECUTABLE?.trim() || "lake";
  const targets = leanTargets(env);
  const started = Date.now();
  const result = spawnSync(lake, ["build", ...targets], {
    cwd: projectRoot,
    env,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: 300_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  state.build = {
    status: result.status === 0 && !result.error ? "success" : "failed",
    analysisMode: "lake_build_selected_targets_not_full_repository",
    executable: lake,
    arguments: ["build", ...targets],
    cwd: projectRoot,
    exitCode: result.status,
    durationMs: Date.now() - started,
    stdoutTail: outputTail(result.stdout),
    stderrTail: outputTail(result.stderr || result.error?.message),
  };
  if (result.error || result.status !== 0) {
    throw new Error(`Lean build failed: ${result.error?.message || outputTail(result.stderr || result.stdout)}`);
  }

  const declaration = env.TOE_SYLVA_AXIOM_DECLARATION?.trim();
  if (!declaration) {
    state.axiomAudit = { status: "skipped", reason: "TOE_SYLVA_AXIOM_DECLARATION is not configured" };
    return;
  }
  if (!/^[A-Za-z_][A-Za-z0-9_'.]*$/.test(declaration)) throw new Error("Invalid Lean declaration for axiom audit");
  const allowed = (env.TOE_SYLVA_ALLOWED_AXIOMS || STANDARD_AXIOMS.join(","))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const auditPath = path.join(projectRoot, `.garden-axiom-audit-${process.pid}-${Date.now()}.lean`);
  state.axiomAudit = { status: "pending", declaration, temporaryFileRemoved: false };
  try {
    fs.writeFileSync(auditPath, `import ${targets[0]}\n#print axioms ${declaration}\n`, "utf8");
    const auditStarted = Date.now();
    const audit = spawnSync(lake, ["env", "lean", auditPath], {
      cwd: projectRoot,
      env,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    const output = `${audit.stdout || ""}\n${audit.stderr || ""}`.trim();
    state.axiomAudit = {
      status: audit.status === 0 && !audit.error ? "success" : "failed",
      declaration,
      exitCode: audit.status,
      durationMs: Date.now() - auditStarted,
      outputTail: outputTail(output),
      temporaryFileRemoved: false,
    };
    if (audit.error || audit.status !== 0) throw new Error(`Lean axiom audit failed: ${outputTail(output || audit.error?.message)}`);
    try {
      state.axiomAudit.axioms = assertLeanAxioms(output, allowed);
    } catch (error) {
      state.axiomAudit.status = "failed";
      throw error;
    }
  } finally {
    fs.rmSync(auditPath, { force: true });
    state.axiomAudit.temporaryFileRemoved = !fs.existsSync(auditPath);
  }
}
