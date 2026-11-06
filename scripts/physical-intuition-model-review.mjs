import { proposeIntuitionWithModel } from "../src/lib/physical-intuition/model-proposal.ts";
import { saveModelProposalReport } from "../src/lib/physical-intuition/intuition-audit.ts";

if (!process.argv.includes("--live")) {
  throw new Error("Refusing a billable model call without the explicit --live flag");
}

const task = {
  taskId: "intuition-live-demo-20261106",
  title: "Synthetic noncommutative structure comparison; not an empirical result",
  objective: "Compare indexed arrays and noncommutative relations with a teaching baseline; do not infer a real quantum system",
  observables: [{ name: "transition_table", dimension: {} }],
  constraints: [{
    kind: "commutation",
    a: [[0, 1], [0, 0]],
    b: [[0, 0], [1, 0]],
    tolerance: 1e-12,
  }],
  baseline: { name: "classical_poisson_brackets", description: "Teaching comparison only; not evidence for a quantum system" },
  evidence: [],
  data: { origin: "synthetic", trainAvailable: false, holdoutAvailable: false, samplingNote: "No observational data" },
  triggers: { noncommutative: true },
};

const report = await proposeIntuitionWithModel({
  task,
  roles: [
    { id: "structure_proposer", provider: "relay", model: "gpt-5.5" },
    { id: "evidence_skeptic", provider: "kimi" },
    { id: "theory_gardener", provider: "relay", model: "gpt-5.5" },
  ],
});
const saved = saveModelProposalReport(report);
console.log(JSON.stringify({
  recordPath: saved.path,
  attempt: saved.attempt,
  requestId: report.requestId,
  status: report.status,
  proposalCount: report.proposals.length,
  roles: report.exchanges.map((exchange) => ({
    role: exchange.role,
    provider: exchange.provider || exchange.request.provider,
    model: exchange.model || exchange.request.model || "unreported",
    finishReason: exchange.finishReason || "unreported",
    hasOpinion: Boolean(exchange.content?.trim()),
    error: exchange.error,
  })),
  totalReportedTokens: report.exchanges.reduce((sum, exchange) => sum + (exchange.usage?.total_tokens || 0), 0),
  evidenceUpgrade: report.evidenceUpgrade,
}, null, 2));
