import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCollaborationResponse } from "@/lib/research-prompts";

export const runtime = "nodejs";

const VALID_CONCLUSIONS = ["verified", "refuted", "inconclusive", "pending"];

/** 从 LLM 响应中提取 conclusion */
function extractConclusion(content: string): string {
  const lower = content.toLowerCase();
  if (lower.includes("verified") || lower.includes("验证通过") || lower.includes("正确")) return "verified";
  if (lower.includes("refuted") || lower.includes("验证失败") || lower.includes("错误") || lower.includes("不成立")) return "refuted";
  if (lower.includes("inconclusive") || lower.includes("无法确定") || lower.includes("不确定")) return "inconclusive";
  return "pending";
}

/** 从 LLM 响应中提取 confidence（0-1） */
function extractConfidence(content: string): number {
  // 匹配 "confidence: 0.85" 或 "置信度：0.85" 或 "0.85" 等格式
  const patterns = [
    /confidence[:\s]*([0-9]\.?[0-9]*)/i,
    /置信度[:\s]*([0-9]\.?[0-9]*)/i,
    /置信度[（(]\s*([0-9]\.?[0-9]*)\s*[)）]/i,
  ];
  for (const p of patterns) {
    const m = content.match(p);
    if (m) {
      const val = parseFloat(m[1]);
      if (!isNaN(val)) {
        if (val > 1 && val <= 100) return val / 100; // 百分比转换
        if (val >= 0 && val <= 1) return val;
      }
    }
  }
  // 根据结论推断默认置信度
  const conclusion = extractConclusion(content);
  if (conclusion === "verified") return 0.85;
  if (conclusion === "refuted") return 0.8;
  if (conclusion === "inconclusive") return 0.5;
  return 0.5;
}

/** 生成 fallback 模拟验证结果 */
function generateMockValidation(validationType: string, content: string): { output: string; conclusion: string; confidence: number } {
  const hasContent = content && content.trim().length > 0;
  return {
    output: `【模拟验证 — ${validationType}】\n\n${hasContent ? "已审阅提供的待验证内容。" : "未提供待验证内容。"}\n\n验证方法：模拟交叉验证\n验证结果：内容结构基本合理，关键推导步骤完整。\n结论：inconclusive（模拟模式）\n置信度：0.50\n\n（注：当前处于模拟模式，未调用真实 LLM）`,
    conclusion: "inconclusive",
    confidence: 0.5,
  };
}

// GET: 列出验证结果，支持 ?conclusion=xxx 筛选，按 createdAt 排序
// 返回统计：按 conclusion 的分布、平均置信度、验证方法分布
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const conclusion = searchParams.get("conclusion");

    const group = await prisma.validationGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Validation group not found" },
        { status: 404 }
      );
    }

    const where: any = { groupId: id };
    if (conclusion) where.conclusion = conclusion;

    const results = await prisma.validationResult.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // 统计所有结果（不受 conclusion 筛选影响）
    const allResults = await prisma.validationResult.findMany({
      where: { groupId: id },
      select: {
        conclusion: true,
        confidence: true,
        method: true,
      },
    });

    const distribution: Record<string, number> = {};
    let totalConfidence = 0;
    const methodDistribution: Record<string, number> = {};

    for (const r of allResults) {
      distribution[r.conclusion] = (distribution[r.conclusion] || 0) + 1;
      totalConfidence += r.confidence;
      if (r.method) {
        methodDistribution[r.method] = (methodDistribution[r.method] || 0) + 1;
      }
    }

    const stats = {
      total: allResults.length,
      distribution,
      averageConfidence: allResults.length > 0 ? totalConfidence / allResults.length : 0,
      methodDistribution,
    };

    return NextResponse.json({ success: true, data: results, stats });
  } catch (error) {
    console.error("[GET /api/research/validations/:id/results] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch validation results" },
      { status: 500 }
    );
  }
}

// POST: 提交验证结果
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      validatorId,
      method,
      input,
      output,
      conclusion,
      confidence,
      details,
      validationType = "peer",
      targetModule,
      targetTheorem,
      content,
    } = body;

    const group = await prisma.validationGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Validation group not found" },
        { status: 404 }
      );
    }

    let finalOutput = output;
    let finalConclusion = conclusion;
    let finalConfidence = confidence;

    // ── LLM 自动生成验证结果 ──
    const needsAutoGenerate = !finalOutput || finalOutput.trim() === "" || !finalConclusion || finalConclusion.trim() === "";
    if (needsAutoGenerate) {
      try {
        const llmRes = await generateCollaborationResponse(
          "validation",
          {
            topic: targetTheorem || targetModule || "验证任务",
            domain: "formal_verification",
            mode: validationType,
            targetModule: targetModule || "",
            targetTheorem: targetTheorem || "",
            content: content || input || "",
          },
          { model: "glm-5.1", temperature: 0.3, provider: "zhipu" }
        );
        finalOutput = llmRes.content;
        finalConclusion = extractConclusion(llmRes.content);
        finalConfidence = extractConfidence(llmRes.content);
        console.log(`[Validation LLM] conclusion=${finalConclusion}, confidence=${finalConfidence}, latency=${llmRes.latencyMs}ms`);
      } catch (llmErr: any) {
        console.error("[Validation LLM] error:", llmErr.message);
        // fallback: 使用请求体中的内容或模拟内容
        const mock = generateMockValidation(validationType, content || input);
        finalOutput = body.output || mock.output;
        finalConclusion = body.conclusion || mock.conclusion;
        finalConfidence = body.confidence !== undefined ? body.confidence : mock.confidence;
      }
    }

    if (finalConclusion && !VALID_CONCLUSIONS.includes(finalConclusion)) {
      finalConclusion = extractConclusion(finalConclusion);
    }

    const conf = typeof finalConfidence === "number" ? finalConfidence : parseFloat(finalConfidence || "0");
    const normalizedConf = isNaN(conf) || conf < 0 || conf > 1 ? extractConfidence(finalOutput || "") : conf;

    const result = await prisma.validationResult.create({
      data: {
        groupId: id,
        validatorId: validatorId || "",
        method: method || validationType,
        input: input || "",
        output: (finalOutput || "").trim(),
        conclusion: finalConclusion || "pending",
        confidence: normalizedConf,
        details: details || "",
      },
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/research/validations/:id/results] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create validation result" },
      { status: 500 }
    );
  }
}
