import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCollaborationResponse } from "@/lib/research-prompts";

export const runtime = "nodejs";

const VALID_SEVERITIES = ["critical", "major", "minor", "suggestion", "praise"];
const VALID_STATUSES = ["open", "resolved", "dismissed", "pending"];

/** 从 LLM 响应中提取 severity 关键词 */
function extractSeverity(content: string): string {
  const lower = content.toLowerCase();
  for (const sev of VALID_SEVERITIES) {
    if (lower.includes(sev)) return sev;
  }
  // 默认规则：根据内容特征判断
  if (lower.includes("错误") || lower.includes("error") || lower.includes("编译失败")) return "critical";
  if (lower.includes("严重") || lower.includes("漏洞") || lower.includes("bug")) return "major";
  if (lower.includes("建议") || lower.includes("可以改进") || lower.includes("建议优化")) return "suggestion";
  if (lower.includes("优秀") || lower.includes("正确") || lower.includes("good")) return "praise";
  return "suggestion";
}

/** 生成 fallback 模拟审查意见 */
function generateMockReview(targetCode: string, reviewMode: string): { comment: string; severity: string } {
  const hasCode = targetCode && targetCode.trim().length > 0;
  if (!hasCode) {
    return {
      comment: "【模拟审查】未提供代码片段，无法生成详细审查意见。请提供目标代码。",
      severity: "suggestion",
    };
  }
  return {
    comment: `【模拟审查 — ${reviewMode} 模式】\n\n1. 语法检查：代码结构基本正确，未发现明显编译错误。\n2. 逻辑正确性：证明/推导过程完整，策略选择合理。\n3. 代码风格：命名规范，格式清晰，建议补充更多注释。\n4. 改进建议：可考虑使用更简洁的 tactic 组合优化证明长度。\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
    severity: "suggestion",
  };
}

// ── GET ───────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");

    const group = await prisma.codeReviewGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Code review group not found" },
        { status: 404 }
      );
    }

    const where: Record<string, unknown> = { groupId: id };
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const reviews = await prisma.codeReview.findMany({
      where,
      orderBy: [{ lineStart: "asc" }, { createdAt: "desc" }],
    });

    // 统计：各 severity 数量、各 status 分布
    const stats = {
      severity: {} as Record<string, number>,
      status: {} as Record<string, number>,
      total: reviews.length,
    };
    for (const r of reviews) {
      stats.severity[r.severity] = (stats.severity[r.severity] || 0) + 1;
      stats.status[r.status] = (stats.status[r.status] || 0) + 1;
    }

    return NextResponse.json({ success: true, data: reviews, stats });
  } catch (error) {
    console.error("[GET /api/research/code-reviews/:id/reviews] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// ── POST ──────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      lineStart,
      lineEnd,
      targetCode,
      targetModule,
      comment,
      severity,
      reviewerId,
      reviewMode = "line_by_line",
    } = body;

    const group = await prisma.codeReviewGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Code review group not found" },
        { status: 404 }
      );
    }

    let finalComment = comment;
    let finalSeverity = severity;

    // ── LLM 自动生成审查意见 ──
    if (!finalComment || finalComment.trim() === "") {
      try {
        const llmRes = await generateCollaborationResponse(
          "code_review",
          {
            topic: targetModule || "代码审查",
            domain: "formal_verification",
            targetCode: targetCode || "",
            targetModule: targetModule || "",
            mode: reviewMode,
          },
          { model: "glm-5.1", temperature: 0.3, provider: "zhipu" }
        );
        finalComment = llmRes.content;
        finalSeverity = extractSeverity(llmRes.content);
        console.log(`[CodeReview LLM] severity=${finalSeverity}, latency=${llmRes.latencyMs}ms`);
      } catch (llmErr: any) {
        console.error("[CodeReview LLM] error:", llmErr.message);
        // fallback: 使用模拟内容或请求体中的内容
        const mock = generateMockReview(targetCode, reviewMode);
        finalComment = body.comment || mock.comment;
        finalSeverity = body.severity || mock.severity;
      }
    }

    if (finalSeverity && !VALID_SEVERITIES.includes(finalSeverity)) {
      finalSeverity = extractSeverity(finalSeverity);
    }

    const review = await prisma.codeReview.create({
      data: {
        groupId: id,
        lineStart: Number(lineStart) || 0,
        lineEnd: Number(lineEnd) || 0,
        targetCode: (targetCode || "").trim(),
        comment: (finalComment || "").trim(),
        severity: finalSeverity || "suggestion",
        reviewerId: (reviewerId || "").trim(),
        status: "open",
      },
    });

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    console.error("[POST /api/research/code-reviews/:id/reviews] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create review" },
      { status: 500 }
    );
  }
}
