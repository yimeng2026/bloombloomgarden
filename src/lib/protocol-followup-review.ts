import { verifyProtocolFollowupAudit, type ProtocolFollowupAudit } from "./protocol-followup-audit";
import { researchChat, type ResearchLLMRequest, type ResearchLLMResponse } from "./research-llm";

export interface ProtocolReviewRole {
  id: string;
  provider: "kimi" | "relay";
  model?: string;
  instruction: string;
}

export const DEFAULT_PROTOCOL_REVIEW_ROLES: ProtocolReviewRole[] = [
  { id: "method-gap-auditor", provider: "kimi", instruction: "只检查求援项是否与原始证据一致，逐项指出错误证据归属，不补写任何实验字段。" },
  { id: "provenance-reviewer", provider: "relay", model: "claude-opus-5-5", instruction: "审查求援项的来源边界。引用、数据库、讲座和其他研究不能被当成目标原始协议，不补写方法。" },
  { id: "skeptical-reviewer", provider: "relay", model: "gpt-5.5", instruction: "作为反方检查求援项是否遗漏证据边界、错误晋升证据或产生无依据结论。只指出可验证的问题。" },
];

type ReviewChat = (request: ResearchLLMRequest) => Promise<ResearchLLMResponse>;

export interface ProtocolFollowupReview {
  schemaVersion: "protocol-followup-review/v1";
  auditKey: string;
  requestId: string;
  generatedAt: string;
  status: "complete" | "partial";
  reviews: Array<{
    role: string;
    provider: string;
    model: string;
    instruction: string;
    finishReason?: string;
    usage?: ResearchLLMResponse["usage"];
    latencyMs?: number;
    content?: string;
    error?: string;
  }>;
  evidenceUpgrade: false;
  boundaries: string[];
}

function redactError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "[redacted]")
    .replace(/ghp_[A-Za-z0-9]{20,}/g, "[redacted]")
    .replace(/github_pat_[A-Za-z0-9_]{20,}/g, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]{16,}/gi, "Bearer [redacted]")
    .slice(0, 300);
}

export async function runProtocolFollowupReview(input: {
  audit: ProtocolFollowupAudit;
  chat?: ReviewChat;
  roles?: ProtocolReviewRole[];
  generatedAt?: string;
}): Promise<ProtocolFollowupReview> {
  verifyProtocolFollowupAudit(input.audit);
  const chat = input.chat || researchChat;
  const roles = input.roles || DEFAULT_PROTOCOL_REVIEW_ROLES;
  const material = JSON.stringify({
    auditKey: input.audit.auditKey,
    deterministicResult: input.audit.deterministicResult,
    requestSnapshot: input.audit.inputs.requestSnapshot,
  });
  const settled = await Promise.allSettled(roles.map((role) => chat({
    provider: role.provider,
    model: role.model,
    systemPrompt: role.instruction,
    userPrompt: `请审查下列确定性求援结果及原始证据，只指出与材料不符的求援项、来源边界和必须补证的事项，不把建议写成事实，不提升证据等级。请聚焦实质差异，避免逐文档重复模板。材料：${material}`,
    maxTokens: 4096,
    timeoutMs: 120000,
    providerAttempts: 1,
    reasoningEffort: "low",
  })));
  const reviews = settled.map((outcome, index) => {
    const role = roles[index];
    if (outcome.status === "fulfilled") {
      return {
        role: role.id,
        provider: outcome.value.provider,
        model: outcome.value.model,
        instruction: role.instruction,
        finishReason: outcome.value.finishReason,
        usage: outcome.value.usage,
        latencyMs: outcome.value.latencyMs,
        content: outcome.value.content,
      };
    }
    return {
      role: role.id,
      provider: role.provider,
      model: role.model || "kimi-for-coding",
      instruction: role.instruction,
      error: redactError(outcome.reason),
    };
  });
  const complete = roles.length > 0 && reviews.length === roles.length && reviews.every((review) =>
    review.content?.trim() && ["stop", "completed", "end_turn"].includes(review.finishReason || ""));
  return {
    schemaVersion: "protocol-followup-review/v1",
    auditKey: input.audit.auditKey,
    requestId: input.audit.requestId,
    generatedAt: input.generatedAt || new Date().toISOString(),
    status: complete ? "complete" : "partial",
    reviews,
    evidenceUpgrade: false,
    boundaries: [
      "complete 只表示全部角色正常结束且意见非空，不表示意见正确或证据升级。",
      "模型意见不能核销求援、修改证据、methodStatus 或确定性审计结果。",
      "复核输入只包含确定性结果和最小请求快照，不包含联系人、回执或历史评论。",
    ],
  };
}
