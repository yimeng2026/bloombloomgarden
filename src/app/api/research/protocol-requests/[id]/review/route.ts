import { NextRequest, NextResponse } from "next/server";
import { appendProtocolReviews, getProtocolRequest } from "@/lib/protocol-requests";
import { researchChatBatch } from "@/lib/research-llm";

export const runtime = "nodejs";

const ROLES = [
  { id: "assay-specialist", provider: "kimi", instruction: "只审查实验方法是否完整：底物、酶源、仪器、pH、温度、浓度、孵育、Ki 换算和重复。逐项指出缺失，不得补写。" },
  { id: "provenance-auditor", provider: "relay", model: "claude-opus-5-5", instruction: "只审查文档身份、历史引用、数据库转录和独立实验边界。相同数值不是独立重复，数据库同值不是造假证据。" },
  { id: "skeptical-reviewer", provider: "relay", model: "gpt-5.5", instruction: "作为反方寻找过度解释、证据等级错配和不能推出的结论。不要把作者回复当成完整协议，不要建议放松标准。" },
] as const;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const protocolRequest = getProtocolRequest(id);
    const evidence = protocolRequest.evidence.filter((item) => !body.documentKey || item.documentKey === body.documentKey);
    if (evidence.length === 0) return NextResponse.json({ success: false, error: "Add evidence before requesting review" }, { status: 400 });
    const material = evidence.map((item) => ({
      documentKey: item.documentKey,
      level: item.level,
      verification: item.verification,
      sourceUrl: item.sourceUrl,
      locator: item.locator,
      quote: item.quote,
      coverage: item.coverage,
    }));
    if (body.dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          mode: "dry_run",
          roles: ROLES.map((role) => ({ id: role.id, provider: role.provider, model: "model" in role ? role.model : undefined })),
          material,
          evidenceUpgrade: false,
          requestStatus: protocolRequest.status,
        },
      });
    }
    const userPrompt = `请只依据以下材料提出简洁、可操作的复核意见。不得把推测写成事实，不得提升证据等级。材料：${JSON.stringify(material)}`;
    const responses = await researchChatBatch(ROLES.map((role) => ({
      systemPrompt: role.instruction,
      userPrompt,
      provider: role.provider,
      model: "model" in role ? role.model : undefined,
      maxTokens: 1600,
      reasoningEffort: "low",
    })), { concurrency: 3, maxRetries: 1 });
    const reviews = responses.map((response, index) => ({
      role: ROLES[index].id,
      provider: response.provider,
      model: response.model,
      content: response.content,
      usage: response.usage,
    }));
    appendProtocolReviews(id, reviews);
    return NextResponse.json({
      success: true,
      data: {
        mode: "provider_pool_review",
        reviews,
        evidenceUpgrade: false,
        requestStatus: protocolRequest.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed";
    return NextResponse.json({ success: false, error: message, evidenceUpgrade: false }, { status: 500 });
  }
}
