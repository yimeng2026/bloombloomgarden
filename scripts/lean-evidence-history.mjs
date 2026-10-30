import fs from "node:fs";
import path from "node:path";

function sorted(values) {
  return [...(values || [])].sort();
}

function jobsFromOutput(output) {
  const match = String(output || "").match(/([\d,]+)\s+jobs\b/);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

export function createLeanEvidenceSnapshot(report) {
  const lean = report.checks?.lean;
  if (!lean?.source?.commit || !lean.build) {
    throw new Error("Cannot snapshot incomplete Lean evidence");
  }
  const capturedAt = report.finishedAt || new Date().toISOString();
  const source = lean.source;
  return {
    schemaVersion: 1,
    snapshotId: `${capturedAt}-${source.commit.slice(0, 12)}`,
    capturedAt,
    source: {
      repository: source.repository,
      commit: source.commit,
      branch: source.branch,
      dirty: source.dirty,
      toolchain: source.toolchain,
      fileHashScope: source.fileHashScope,
      files: (source.files || []).map((item) => ({ path: item.path, sha256: item.sha256 }))
        .sort((a, b) => a.path.localeCompare(b.path)),
      manifestSha256: source.manifestSha256,
    },
    text: {
      analysisMode: lean.text?.analysisMode,
      sourceScope: lean.text?.sourceScope,
      filesParsed: lean.text?.filesParsed,
      theoremsTotal: lean.text?.theoremsTotal,
      definitionsTotal: lean.text?.definitionsTotal,
      sorryTotal: lean.text?.sorryTotal,
      axiomTotal: lean.text?.axiomTotal,
    },
    build: {
      status: lean.build.status,
      exitCode: lean.build.exitCode,
      targets: (lean.build.arguments || []).slice(1),
      jobs: jobsFromOutput(lean.build.stdoutTail),
      stdoutTail: lean.build.stdoutTail,
    },
    axiomCases: (lean.axiomAudit?.cases || []).map((item) => ({
      target: item.target,
      declaration: item.declaration,
      mode: item.mode,
      classification: item.classification,
      axioms: sorted(item.axioms),
      customAxioms: sorted(item.customAxioms),
      ...(item.expectedAxioms ? { expectedAxioms: sorted(item.expectedAxioms) } : {}),
    })).sort((a, b) => a.declaration.localeCompare(b.declaration)),
    validation: lean.validation ? {
      academicTaskId: lean.validation.academicTaskId,
      resultCount: lean.validation.resultCount,
      taskStatus: lean.validation.taskStatus,
      sourceCommit: lean.validation.sourceCommit,
      standardCaseCount: lean.validation.standardCaseCount,
      declaredAxiomCaseCount: lean.validation.declaredAxiomCaseCount,
    } : null,
  };
}

export function compareLeanEvidenceSnapshots(previous, current) {
  const changes = [];
  const add = (type, before, after, subject) => changes.push({ type, before, after, subject });
  if (previous.source.commit !== current.source.commit) add("source_commit_changed", previous.source.commit, current.source.commit);
  if (previous.source.dirty !== current.source.dirty) add("source_dirty_changed", previous.source.dirty, current.source.dirty);
  if (previous.source.toolchain !== current.source.toolchain) add("toolchain_changed", previous.source.toolchain, current.source.toolchain);
  if (previous.source.manifestSha256 !== current.source.manifestSha256) {
    add("manifest_changed", previous.source.manifestSha256, current.source.manifestSha256);
  }

  const previousFiles = new Map(previous.source.files.map((item) => [item.path, item.sha256]));
  const currentFiles = new Map(current.source.files.map((item) => [item.path, item.sha256]));
  for (const file of new Set([...previousFiles.keys(), ...currentFiles.keys()])) {
    if (!previousFiles.has(file)) add("file_added", undefined, currentFiles.get(file), file);
    else if (!currentFiles.has(file)) add("file_removed", previousFiles.get(file), undefined, file);
    else if (previousFiles.get(file) !== currentFiles.get(file)) {
      add("file_hash_changed", previousFiles.get(file), currentFiles.get(file), file);
    }
  }

  const previousTargets = new Set(previous.build.targets);
  const currentTargets = new Set(current.build.targets);
  for (const target of new Set([...previousTargets, ...currentTargets])) {
    if (!previousTargets.has(target)) add("build_target_added", undefined, target, target);
    else if (!currentTargets.has(target)) add("build_target_removed", target, undefined, target);
  }
  if (previous.build.status !== current.build.status) add("build_status_changed", previous.build.status, current.build.status);
  if (previous.build.exitCode !== current.build.exitCode) add("build_exit_code_changed", previous.build.exitCode, current.build.exitCode);
  if (previous.build.jobs !== current.build.jobs) add("build_jobs_changed", previous.build.jobs, current.build.jobs);

  const previousCases = new Map(previous.axiomCases.map((item) => [item.declaration, item]));
  const currentCases = new Map(current.axiomCases.map((item) => [item.declaration, item]));
  for (const declaration of new Set([...previousCases.keys(), ...currentCases.keys()])) {
    const before = previousCases.get(declaration);
    const after = currentCases.get(declaration);
    if (!before) {
      add("declaration_added", undefined, after?.classification, declaration);
      continue;
    }
    if (!after) {
      add("declaration_removed", before.classification, undefined, declaration);
      continue;
    }
    if (JSON.stringify(before.axioms) !== JSON.stringify(after.axioms)) {
      add("declaration_dependencies_changed", before.axioms, after.axioms, declaration);
    }
    if (before.classification !== after.classification) {
      add("declaration_classification_changed", before.classification, after.classification, declaration);
    }
  }
  if (previous.validation?.resultCount !== current.validation?.resultCount) {
    add("validation_result_count_changed", previous.validation?.resultCount, current.validation?.resultCount);
  }
  if (previous.validation?.taskStatus !== current.validation?.taskStatus) {
    add("research_task_status_changed", previous.validation?.taskStatus, current.validation?.taskStatus);
  }

  const count = (prefix) => changes.filter((item) => item.type.startsWith(prefix)).length;
  return {
    hasChanges: changes.length > 0,
    changeCount: changes.length,
    previousCommit: previous.source.commit,
    currentCommit: current.source.commit,
    summary: {
      sourceChanges: count("source_") + count("toolchain_") + count("manifest_"),
      fileChanges: count("file_"),
      buildChanges: count("build_"),
      declarationChanges: count("declaration_"),
      validationChanges: count("validation_") + count("research_task_"),
    },
    changes,
    semanticReview: "changes in recorded execution evidence require separate mathematical or physical review",
  };
}

export function recordLeanEvidenceHistory({ report, previousReport, directory }) {
  const snapshot = createLeanEvidenceSnapshot(report);
  const previous = previousReport ? createLeanEvidenceSnapshot(previousReport) : null;
  const comparison = previous
    ? compareLeanEvidenceSnapshots(previous, snapshot)
    : {
        hasChanges: false,
        changeCount: 0,
        summary: "initial Lean evidence snapshot",
        changes: [],
        semanticReview: "no earlier completed Lean evidence was available for comparison",
      };
  fs.mkdirSync(directory, { recursive: true });
  const snapshotFile = path.join(directory, `${snapshot.snapshotId.replace(/[^A-Za-z0-9_.-]/g, "_")}.json`);
  const diffFile = path.join(directory, "lean-evidence-latest-diff.json");
  fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  const history = {
    schemaVersion: 1,
    previousSnapshotId: previous?.snapshotId || null,
    currentSnapshotId: snapshot.snapshotId,
    snapshotFile,
    diffFile,
    ...comparison,
  };
  fs.writeFileSync(diffFile, JSON.stringify(history, null, 2) + "\n", "utf8");
  return history;
}
