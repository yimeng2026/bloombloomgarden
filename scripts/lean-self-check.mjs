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

export function withLeanManifest(env = process.env) {
  const manifestPath = env.TOE_SYLVA_LEAN_MANIFEST?.trim();
  if (!manifestPath) return env;
  const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestPath), "utf8"));
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Lean self-check manifest must be a JSON object");
  }
  for (const key of ["textFiles", "targets", "axiomCases"]) {
    if (manifest[key] !== undefined && !Array.isArray(manifest[key])) {
      throw new Error(`Lean manifest ${key} must be an array`);
    }
  }
  const merged = { ...env };
  if (manifest.textFiles && !merged.TOE_SYLVA_TEXT_FILES) {
    merged.TOE_SYLVA_TEXT_FILES = manifest.textFiles.join(",");
  }
  if (manifest.targets && !merged.TOE_SYLVA_LEAN_TARGETS) {
    merged.TOE_SYLVA_LEAN_TARGETS = manifest.targets.join(",");
  }
  if (manifest.axiomCases && !merged.TOE_SYLVA_AXIOM_CASES) {
    merged.TOE_SYLVA_AXIOM_CASES = JSON.stringify(manifest.axiomCases);
  }
  return merged;
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

export function leanAxiomCases(env = process.env) {
  const targets = leanTargets(env);
  if (env.TOE_SYLVA_AXIOM_CASES?.trim()) {
    const cases = JSON.parse(env.TOE_SYLVA_AXIOM_CASES);
    if (!Array.isArray(cases) || !cases.length || cases.length > 8) {
      throw new Error("TOE_SYLVA_AXIOM_CASES must contain 1-8 cases");
    }
    return cases.map((item) => {
      if (!targets.includes(item.target)) throw new Error(`Axiom case target was not built: ${item.target}`);
      if (!/^[A-Za-z_][A-Za-z0-9_'.]*$/.test(item.declaration || "")) {
        throw new Error("Invalid Lean declaration in axiom cases");
      }
      if (!["standard_only", "declared"].includes(item.mode)) {
        throw new Error(`Invalid axiom case mode: ${item.mode}`);
      }
      if (item.mode === "declared") {
        if (!Array.isArray(item.expectedAxioms) || !item.expectedAxioms.length) {
          throw new Error("Declared axiom cases require expectedAxioms");
        }
        if (new Set(item.expectedAxioms).size !== item.expectedAxioms.length) {
          throw new Error("Duplicate expectedAxioms in axiom case");
        }
      }
      return item;
    });
  }
  const declaration = env.TOE_SYLVA_AXIOM_DECLARATION?.trim();
  if (!declaration) return [];
  if (!/^[A-Za-z_][A-Za-z0-9_'.]*$/.test(declaration)) {
    throw new Error("Invalid Lean declaration for axiom audit");
  }
  const expected = (env.TOE_SYLVA_ALLOWED_AXIOMS || STANDARD_AXIOMS.join(","))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const declared = expected.some((item) => !STANDARD_AXIOMS.includes(item));
  return [{
    target: targets[0],
    declaration,
    mode: declared ? "declared" : "standard_only",
    ...(declared ? { expectedAxioms: expected } : {}),
  }];
}

export function evaluateLeanAxiomCase(output, item) {
  const scoped = output
    .split(/(?='[^'\n]+'\s+(?:depends on axioms|does not depend on any axioms))/)
    .find((record) => record.includes(`'${item.declaration}'`)) || "";
  if (!scoped) throw new Error(`No #print axioms output for ${item.declaration}`);
  if (/\bsorryAx\b/.test(scoped)) throw new Error(`${item.declaration} depends on sorryAx`);
  if (item.mode === "standard_only") {
    return {
      classification: "standard_only",
      axioms: assertLeanAxioms(scoped),
      customAxioms: [],
    };
  }
  const axioms = parseLeanAxioms(scoped);
  const expected = [...item.expectedAxioms].sort();
  if (JSON.stringify([...axioms].sort()) !== JSON.stringify(expected)) {
    throw new Error(`Declared axiom set mismatch for ${item.declaration}: expected ${expected.join(", ")}, got ${axioms.join(", ")}`);
  }
  const customAxioms = axioms.filter((axiom) => !STANDARD_AXIOMS.includes(axiom));
  if (!customAxioms.length) throw new Error(`Declared axiom case has no custom axiom: ${item.declaration}`);
  return { classification: "declared_axiom_debt", axioms, customAxioms };
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

  const cases = leanAxiomCases(env);
  if (!cases.length) {
    state.axiomAudit = { status: "skipped", reason: "TOE_SYLVA_AXIOM_DECLARATION or TOE_SYLVA_AXIOM_CASES is not configured" };
    return;
  }
  const auditPath = path.join(projectRoot, `.garden-axiom-audit-${process.pid}-${Date.now()}.lean`);
  state.axiomAudit = { status: "pending", cases, temporaryFileRemoved: false };
  try {
    const source = [
      ...targets.map((target) => `import ${target}`),
      ...cases.map((item) => `#print axioms ${item.declaration}`),
      "",
    ].join("\n");
    fs.writeFileSync(auditPath, source, "utf8");
    const auditStarted = Date.now();
    const audit = spawnSync(lake, ["env", "lean", auditPath], {
      cwd: projectRoot,
      env,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      timeout: 180_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    const output = `${audit.stdout || ""}\n${audit.stderr || ""}`.trim();
    state.axiomAudit = {
      status: audit.status === 0 && !audit.error ? "success" : "failed",
      cases: cases.map((item) => ({ ...item, outputScope: "selected declaration, not module-wide axiom-free claim" })),
      exitCode: audit.status,
      durationMs: Date.now() - auditStarted,
      outputTail: outputTail(output),
      temporaryFileRemoved: false,
    };
    if (audit.error || audit.status !== 0) throw new Error(`Lean axiom audit failed: ${outputTail(output || audit.error?.message)}`);
    try {
      state.axiomAudit.cases = cases.map((item, index) => ({
        ...state.axiomAudit.cases[index],
        ...evaluateLeanAxiomCase(output, item),
      }));
      state.axiomAudit.standardCaseCount = state.axiomAudit.cases.filter((item) => item.classification === "standard_only").length;
      state.axiomAudit.declaredAxiomCaseCount = state.axiomAudit.cases.filter((item) => item.classification === "declared_axiom_debt").length;
      if (cases.length === 1) state.axiomAudit.axioms = state.axiomAudit.cases[0].axioms;
    } catch (error) {
      state.axiomAudit.status = "failed";
      throw error;
    }
  } finally {
    fs.rmSync(auditPath, { force: true });
    state.axiomAudit.temporaryFileRemoved = !fs.existsSync(auditPath);
  }
}
