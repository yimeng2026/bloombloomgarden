import { createHash } from "node:crypto";
import { getStructureCard } from "./structure-registry";
import type { IntuitionCard, IntuitionTask, StructureCard } from "./types";

function candidateId(task: IntuitionTask, key: string): string {
  const baseline = task.baseline?.name || "no_baseline";
  return createHash("sha256").update(JSON.stringify([task.taskId, key, baseline])).digest("hex").slice(0, 16);
}

function candidate(task: IntuitionTask, structure: StructureCard): IntuitionCard {
  const tests: Record<string, string> = {
    matrix_states: "对易残差、谱与观测量映射是否与基线产生可区分结果",
    hamiltonian_dynamics: "能量残差、对称性和低阻尼极限是否区别于基线",
    sparse_symbolic_dynamics: "在未参与构造的数据上比较稀疏表达式与基线及高阶拟合",
    causal_poset: "检验偏序、因果链与连续极限是否具有可区分的观测映射",
    relation_graph: "检验图不变量与目标观测之间是否存在可重复关系",
    symmetry_invariants: "检验对称性和守恒量在独立数据或干预下是否保持",
  };
  return {
    ...structure,
    possibleUses: structure.possibleUses.map((use) => ({ ...use })),
    quickChecks: [...structure.quickChecks],
    candidateId: candidateId(task, structure.key),
    statement: `在“${task.objective}”中，${structure.signature}可作为一种候选表示，而非已被证明的物理结论。`,
    triggerRationale: `依据任务触发线索选择 ${structure.key}；其用途仍需通过 ${tests[structure.key]}。`,
    checks: [],
    unknowns: ["候选结构的完整定义、参数、映射和独立证据仍需按任务补齐"],
    counterexamples: [],
    nextDiscriminatingTest: tests[structure.key],
    sourceEvidenceIds: task.evidence.map((evidence) => evidence.id),
    mathStatus: "proposal",
    physicalStatus: "analogy",
  };
}

export function generateCandidates(task: IntuitionTask): IntuitionCard[] {
  const keys: string[] = [];
  if (task.triggers?.noncommutative) keys.push("matrix_states");
  if (task.triggers?.oscillatory) keys.push("hamiltonian_dynamics", "sparse_symbolic_dynamics");
  if (task.triggers?.discreteOrder) keys.push("causal_poset");
  if (task.triggers?.relationalNetwork) keys.push("relation_graph");
  if (task.triggers?.noisyMeasurements) keys.push("sparse_symbolic_dynamics");
  if (keys.length === 0) keys.push("symmetry_invariants");
  return [...new Set(keys)].map((key) => candidate(task, getStructureCard(key)!));
}
