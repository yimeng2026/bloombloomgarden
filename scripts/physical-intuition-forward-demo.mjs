import { proposeIntuitionWithModel } from "../src/lib/physical-intuition/model-proposal.ts";
import { saveModelProposalReport } from "../src/lib/physical-intuition/intuition-audit.ts";
import { calibrateForwardRecords, freezeModelForwardCase, recordForwardOutcome } from "../src/lib/physical-intuition/forward-calibration.ts";
import { readForwardCase, saveForwardCase, saveForwardOutcome } from "../src/lib/physical-intuition/forward-store.ts";

const [command, argument] = process.argv.slice(2);
const CASE_ID = "forward-matrix-demo-20261107";
const CRITERIA = [
  "当且仅当冻结选择为 matrix_states 且独立证书 (A+B)[1,2]=[2,1] 时记为 hit；其他有效结构选择记为 miss；无法复核记为 inconclusive",
  "该合成代数任务只验证前瞻流程，不支持量子力学、暗物质或其他真实物理结论",
];

if (command === "freeze") {
  if (argument !== "--live") throw new Error("Refusing a billable model call without the explicit --live flag");
  const report = await proposeIntuitionWithModel({
    task: {
      taskId: CASE_ID,
      title: "Synthetic noncommutative forward task; not an empirical result",
      objective: "Freeze the most useful structure for a later indexed linear-update certificate; do not infer a real quantum system",
      observables: [{ name: "transition_table", dimension: {} }],
      constraints: [{ kind: "commutation", a: [[0, 1], [0, 0]], b: [[0, 0], [1, 0]], tolerance: 1e-12 }],
      baseline: { name: "classical_poisson_brackets", description: "Teaching comparison only; not physical evidence" },
      evidence: [],
      data: { origin: "synthetic", trainAvailable: false, holdoutAvailable: false, samplingNote: "Holdout result is not available at freeze time" },
      triggers: { noncommutative: true },
    },
    roles: [
      { id: "structure_proposer", provider: "relay", model: "gpt-5.5" },
      { id: "evidence_skeptic", provider: "kimi" },
      { id: "theory_gardener", provider: "relay", model: "gpt-5.5" },
    ],
  });
  const savedReport = saveModelProposalReport(report);
  const frozen = freezeModelForwardCase({ report, caseId: CASE_ID, problemFamily: "synthetic-linear-algebra", falsificationCriteria: CRITERIA });
  const savedCase = saveForwardCase(frozen);
  console.log(JSON.stringify({
    command: "freeze",
    caseFile: savedCase.path,
    reportFile: savedReport.path,
    caseHash: frozen.caseHash,
    candidateKeys: frozen.candidateKeys,
    confidence: frozen.confidence,
    evidenceUpgrade: frozen.evidenceUpgrade,
  }, null, 2));
} else if (command === "reveal") {
  if (!argument) throw new Error("A frozen .case.json filename is required");
  const { record: frozen } = readForwardCase(argument);
  const constraint = frozen.task.constraints.find((item) => item.kind === "commutation");
  if (!constraint) throw new Error("The frozen case has no exact commutation input");
  const matrix = constraint.a.map((row, i) => row.map((value, j) => value + constraint.b[i][j]));
  const input = [1, 2];
  const output = matrix.map((row) => row.reduce((sum, value, index) => sum + value * input[index], 0));
  if (output.length !== 2 || output[0] !== 2 || output[1] !== 1) throw new Error("Unexpected exact certificate; do not score it");
  const hit = frozen.candidateKeys.length === 1 && frozen.candidateKeys[0] === "matrix_states";
  const now = new Date().toISOString();
  const outcome = recordForwardOutcome(frozen, {
    caseId: frozen.caseId,
    caseHash: frozen.caseHash,
    observedAt: now,
    kind: hit ? "hit" : "miss",
    holdout: {
      holdoutId: "exact-linear-certificate-v1",
      accessibleAt: now,
      evidence: {
        id: "exact-linear-certificate",
        role: "reconstruction",
        locator: "scripts/physical-intuition-forward-demo.mjs#exact-holdout-check",
        note: JSON.stringify({ operation: "(A+B)v", input, output }),
      },
    },
    review: {
      reviewerId: "independent-exact-arithmetic-v1",
      independentFrom: [frozen.authorId],
      reviewedAt: now,
      verdict: hit ? "supported" : "refuted",
    },
    notes: "仅验证合成校准流程，不是独立实验室复现或物理证据",
  });
  const savedOutcome = saveForwardOutcome(frozen, outcome);
  const calibration = calibrateForwardRecords([{ case: frozen, outcome }]);
  console.log(JSON.stringify({
    command: "reveal",
    outcomeFile: savedOutcome.path,
    caseHash: frozen.caseHash,
    kind: outcome.kind,
    hitRate: calibration.hitRate,
    brierScore: calibration.brierScore,
    certificate: { input, output },
    evidenceUpgrade: calibration.evidenceUpgrade,
  }, null, 2));
} else {
  throw new Error("Use freeze --live or reveal <case-file>");
}
