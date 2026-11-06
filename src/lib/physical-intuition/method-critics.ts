import type { EvaluationIssue, IntuitionTask } from "./types";

export function runMethodCritics(task: IntuitionTask): EvaluationIssue[] {
  const issues: EvaluationIssue[] = [];
  if (task.baseline === null) issues.push({ code: "missing_baseline", severity: "warning", detail: "未提供常规基线；所有候选必须保留为探索性比较，不能宣称新增机制。" });
  if (task.evidence.some((item) => item.role === "observation" && !item.sourceUrl)) issues.push({ code: "observation_without_source", severity: "warning", detail: "存在没有来源定位的观察性声明，只能视为用户声明。" });
  if (task.data?.origin === "synthetic") issues.push({ code: "synthetic_data", severity: "info", detail: "当前数据为合成材料，只能验证程序行为，不能作为真实观测发现。" });
  issues.push({ code: "evidence_skeptic", severity: "info", detail: "请回答：结论是否偷含前提、批评针对哪一层理论、原始观察与重建诠释是否分离、否决条件能否执行、辅助假设是否也接受检验？" });
  issues.push({ code: "theory_gardener", severity: "info", detail: "请把候选拆成最小定义、数学事实、历史类比和新增假设，并给出负结果、近 miss 与下一项可判别实验。" });
  return issues;
}
