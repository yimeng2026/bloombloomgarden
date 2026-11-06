import { createHash } from "node:crypto";
import { canonicalJson } from "../protocol-followup-audit";
import { generateCandidates } from "./candidate-generator";
import { runConstraintChecks } from "./constraint-checks";
import { runMethodCritics } from "./method-critics";
import { assertIntuitionTask, type IntuitionTask } from "./types";

export function evaluateIntuitionTask(task: IntuitionTask) {
  assertIntuitionTask(task);
  const cards = generateCandidates(task);
  const checks = runConstraintChecks(task);
  const evaluatedCards = cards.map((card) => ({
    ...card,
    checks,
    counterexamples: checks.filter((check) => check.status === "fail").map((check) => check.detail),
  }));
  const explorationOnly = task.baseline === null || !task.data || !task.data.trainAvailable || !task.data.holdoutAvailable;
  return {
    requestId: task.taskId,
    cards: evaluatedCards,
    issues: runMethodCritics(task),
    explorationOnly,
    syntheticData: task.data?.origin === "synthetic",
    audit: {
      algorithmVersion: "physical-intuition/v1",
      inputHash: createHash("sha256").update(canonicalJson(task), "utf8").digest("hex"),
    },
    evidenceUpgrade: false as const,
    boundaries: [
      "候选结构只是待验证提议，不是数学定理、物理定律或真实观测发现。",
      "历史用途、类比和模型评分不能覆盖硬约束失败，也不能替代独立数据与复核。",
      "数学验证与物理验证分轨；没有数据或独立留出时，仅进行结构探索。",
      "双方法评委是公开材料的方法模板，不代表任何真实用户本人或立场。",
    ],
  };
}
