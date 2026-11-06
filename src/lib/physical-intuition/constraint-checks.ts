import type { CheckResult, Constraint, DimensionVector } from "./types";

function finiteVector(vector: DimensionVector, field: string): void {
  if (!vector || typeof vector !== "object" || Array.isArray(vector)) throw new Error(`${field} must be a dimension vector`);
  for (const [axis, value] of Object.entries(vector)) {
    if (!axis.trim() || !Number.isFinite(value)) throw new Error(`${field}.${axis} must have a finite exponent`);
  }
}

function dimensionDifference(left: DimensionVector, right: DimensionVector): string[] {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].filter((key) => (left[key] || 0) !== (right[key] || 0)).sort();
}

function dimensionCheck(constraint: Extract<Constraint, { kind: "dimension" }>): CheckResult {
  finiteVector(constraint.left, "left");
  finiteVector(constraint.right, "right");
  const differences = dimensionDifference(constraint.left, constraint.right);
  if (differences.length) return { code: "dimension_mismatch", status: "fail", detail: `不兼容量纲轴：${differences.join("、")}；不执行隐式换算` };
  return { code: "dimension_consistent", status: "pass", detail: "左右量纲向量一致" };
}

function probabilityCheck(constraint: Extract<Constraint, { kind: "probabilities" }>): CheckResult {
  if (!Number.isFinite(constraint.tolerance) || constraint.tolerance < 0) throw new Error("Probability tolerance must be finite and nonnegative");
  if (constraint.values.some((value) => !Number.isFinite(value))) throw new Error("Probabilities must be finite");
  if (constraint.values.some((value) => value < 0)) throw new Error("Probabilities must be nonnegative");
  const sum = constraint.values.reduce((total, value) => total + value, 0);
  if (Math.abs(sum - 1) > constraint.tolerance) return { code: "probability_not_normalized", status: "fail", detail: `概率和为 ${sum}，超出容差 ${constraint.tolerance}` };
  return { code: "probabilities_normalized", status: "pass", detail: `概率和在容差 ${constraint.tolerance} 内` };
}

function multiply(a: number[][], b: number[][]): number[][] {
  if (!a.length || !b.length || a.some((row) => row.length !== a[0].length) || b.some((row) => row.length !== b[0].length) || a[0].length !== b.length) {
    throw new Error("Matrix values must be nonempty rectangles with compatible dimensions");
  }
  return a.map((row) => b[0].map((_, column) => row.reduce((sum, value, index) => sum + value * b[index][column], 0)));
}

function commutatorCheck(constraint: Extract<Constraint, { kind: "commutation" }>): CheckResult {
  if (!Number.isFinite(constraint.tolerance) || constraint.tolerance < 0) throw new Error("Commutation tolerance must be finite and nonnegative");
  for (const matrix of [constraint.a, constraint.b]) {
    for (const row of matrix) for (const value of row) if (!Number.isFinite(value)) throw new Error("Matrix entries must be finite");
  }
  const forward = multiply(constraint.a, constraint.b);
  const backward = multiply(constraint.b, constraint.a);
  const residual = forward.map((row, i) => row.map((value, j) => value - backward[i][j]));
  const maxAbs = Math.max(...residual.flat().map(Math.abs));
  if (maxAbs > constraint.tolerance) return { code: "nonzero_commutator", status: "warning", detail: `maxAbs=${maxAbs}，超过容差 ${constraint.tolerance}；非对易本身不是量子结论，需检查物理映射` };
  return { code: "commutation_within_tolerance", status: "pass", detail: `maxAbs=${maxAbs}，仅在容差 ${constraint.tolerance} 内，不写成严格为零` };
}

export function runConstraintChecks(task: { constraints: Constraint[] }): CheckResult[] {
  return task.constraints.map((constraint) => {
    if (constraint.kind === "dimension") return dimensionCheck(constraint);
    if (constraint.kind === "probabilities") return probabilityCheck(constraint);
    if (constraint.kind === "commutation") return commutatorCheck(constraint);
    if (constraint.kind === "note") return { code: "note", status: "pass", detail: constraint.text };
    throw new Error(`Unknown constraint kind: ${(constraint as Constraint).kind}`);
  });
}
