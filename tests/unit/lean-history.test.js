import { expect, test } from "bun:test";
import {
  compareLeanEvidenceSnapshots,
  createLeanEvidenceSnapshot,
} from "../../scripts/lean-evidence-history.mjs";

function evidenceReport() {
  return {
    finishedAt: "2026-10-30T00:00:00.000Z",
    checks: {
      lean: {
        source: {
          repository: "TOE-SYLVA",
          commit: "commit-a",
          branch: "main",
          dirty: false,
          toolchain: "Lean 4.29.0",
          fileHashScope: "selected_files",
          files: [{ path: "A.lean", sha256: "hash-a" }],
          manifestSha256: "manifest-a",
        },
        text: { analysisMode: "text_only_not_compiled", filesParsed: 1 },
        build: {
          status: "success",
          exitCode: 0,
          arguments: ["build", "A", "B"],
          stdoutTail: "Build completed successfully (2 jobs).",
        },
        axiomAudit: {
          cases: [
            { target: "A", declaration: "A.clean", classification: "standard_only", axioms: ["propext"], customAxioms: [] },
            { target: "B", declaration: "B.debt", classification: "declared_axiom_debt", axioms: ["B.debt"], customAxioms: ["B.debt"] },
          ],
        },
        validation: {
          academicTaskId: "task-a",
          resultCount: 3,
          taskStatus: "completed",
          sourceCommit: "commit-a",
          standardCaseCount: 1,
          declaredAxiomCaseCount: 1,
        },
      },
    },
  };
}

test("identical evidence has no meaningful change even across different runs", () => {
  const first = createLeanEvidenceSnapshot(evidenceReport());
  const second = createLeanEvidenceSnapshot(evidenceReport());
  second.snapshotId = "different-run";
  expect(compareLeanEvidenceSnapshots(first, second).hasChanges).toBe(false);
});

test("history comparison detects file, target, build and declaration changes", () => {
  const previous = createLeanEvidenceSnapshot(evidenceReport());
  const changedReport = evidenceReport();
  changedReport.finishedAt = "2026-10-30T01:00:00.000Z";
  changedReport.checks.lean.source.commit = "commit-b";
  changedReport.checks.lean.source.files[0].sha256 = "hash-b";
  changedReport.checks.lean.source.manifestSha256 = "manifest-b";
  changedReport.checks.lean.build.arguments = ["build", "A"];
  changedReport.checks.lean.build.stdoutTail = "Build completed successfully (3 jobs).";
  changedReport.checks.lean.axiomAudit.cases[0].axioms = ["propext", "Quot.sound"];
  changedReport.checks.lean.axiomAudit.cases.pop();
  changedReport.checks.lean.validation.resultCount = 2;
  changedReport.checks.lean.validation.sourceCommit = "commit-b";
  const current = createLeanEvidenceSnapshot(changedReport);
  const comparison = compareLeanEvidenceSnapshots(previous, current);
  const types = comparison.changes.map((item) => item.type);
  expect(comparison.hasChanges).toBe(true);
  expect(types).toContain("source_commit_changed");
  expect(types).toContain("file_hash_changed");
  expect(types).toContain("build_target_removed");
  expect(types).toContain("build_jobs_changed");
  expect(types).toContain("declaration_dependencies_changed");
  expect(types).toContain("declaration_removed");
  expect(types).toContain("validation_result_count_changed");
});

test("snapshots retain evidence fields without executable paths or secrets", () => {
  const report = evidenceReport();
  report.checks.lean.build.executable = "private-tool-path";
  report.checks.lean.build.cwd = "private-working-directory";
  report.checks.lean.source.apiKey = "must-not-appear";
  const serialized = JSON.stringify(createLeanEvidenceSnapshot(report));
  expect(serialized).toContain("commit-a");
  expect(serialized).not.toContain("private-tool-path");
  expect(serialized).not.toContain("private-working-directory");
  expect(serialized).not.toContain("must-not-appear");
});
