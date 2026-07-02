import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// POST /api/research/workshops/[id]/rounds - 执行一轮讨论
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { customPrompt } = body;

    // 1. 获取 workshop 和 panel members
    const workshop = await prisma.academicWorkshop.findUnique({
      where: { id },
      include: {
        panel: {
          include: {
            members: {
              orderBy: { role: "asc" },
            },
          },
        },
        rounds: {
          orderBy: { roundNumber: "asc" },
        },
      },
    });

    if (!workshop) {
      return NextResponse.json(
        { success: false, error: "Workshop not found" },
        { status: 404 }
      );
    }

    // 已结束的 workshop 不能继续
    if (workshop.status === "concluded" || workshop.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: `Workshop is already ${workshop.status}` },
        { status: 400 }
      );
    }

    // 成员不足
    if (!workshop.panel.members || workshop.panel.members.length === 0) {
      return NextResponse.json(
        { success: false, error: "Panel has no members" },
        { status: 400 }
      );
    }

    const members = workshop.panel.members;
    const nextRoundNumber = workshop.currentRound + 1;
    const topic = customPrompt?.trim() || workshop.topic || workshop.title;

    // 2. 根据 workshop.mode 生成轮次内容
    const roundContent = generateRoundContent(workshop.mode, members, nextRoundNumber, topic);

    // 3. 计算 consensusLevel（0.5 + 0.1 * roundNumber，上限 0.95）
    const consensusLevel = Math.min(0.95, 0.5 + 0.1 * nextRoundNumber);

    // 4. 确定 phase
    const phase = determinePhase(workshop.mode, nextRoundNumber, workshop.maxRounds);

    // 5. 生成 WorkshopRound 记录
    const round = await prisma.workshopRound.create({
      data: {
        workshopId: id,
        roundNumber: nextRoundNumber,
        phase,
        content: JSON.stringify(roundContent),
        consensusLevel,
      },
    });

    // 6. 更新 workshop.currentRound 和状态
    const newCurrentRound = nextRoundNumber;
    const isConcluded = newCurrentRound >= workshop.maxRounds;

    const updatedWorkshop = await prisma.academicWorkshop.update({
      where: { id },
      data: {
        currentRound: newCurrentRound,
        status: isConcluded ? "concluded" : "active",
        // 如果已结束，同时生成 summary
        ...(isConcluded
          ? {
              consensus: `Consensus reached after ${newCurrentRound} rounds.`,
              conclusion: buildSummaryFromRounds(workshop.rounds, roundContent),
            }
          : {}),
      },
      select: {
        id: true,
        currentRound: true,
        status: true,
      },
    });

    // 重新读取 consensusLevel（数据库中为 consensusLevel 字段，但 schema 中 workshop 没有这个字段
    // 实际上 schema 中 AcademicWorkshop 没有 consensusLevel 字段，只有 consensus 和 conclusion
    // 我们返回 round 的 consensusLevel 作为当前共识度
    return NextResponse.json({
      success: true,
      round: {
        ...round,
        content: roundContent, // 返回解析后的 JSON 对象
      },
      workshop: {
        id: updatedWorkshop.id,
        currentRound: updatedWorkshop.currentRound,
        status: updatedWorkshop.status,
        consensusLevel: consensusLevel, // 返回本轮的共识度
      },
    });
  } catch (error) {
    console.error("[POST /api/research/workshops/[id]/rounds] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to execute round" },
      { status: 500 }
    );
  }
}

// 根据模式生成轮次内容（模拟/计划的轮次内容，不直接调用 LLM）
function generateRoundContent(
  mode: string,
  members: Array<{
    id: string;
    role: string;
    specialty: string;
    systemPrompt: string;
    model: string;
  }>,
  roundNumber: number,
  topic: string
): Array<Record<string, unknown>> {
  const timestamp = new Date().toISOString();

  switch (mode) {
    case "committee": {
      // 主席 (chair) 首先发言，其他成员依次补充
      const sorted = [...members].sort((a, b) => {
        if (a.role === "chair") return -1;
        if (b.role === "chair") return 1;
        return 0;
      });
      return sorted.map((member, index) => ({
        memberId: member.id,
        role: member.role,
        specialty: member.specialty,
        model: member.model,
        order: index + 1,
        type: member.role === "chair" ? "opening_statement" : "supplement",
        content: `${member.role === "chair" ? "Opening" : "Supplement"} on "${topic}" from ${member.role} (${member.specialty || "general"}).`,
        timestamp,
      }));
    }

    case "debate": {
      // 正方/反方交替发言（role=chair 为正方，role=reviewer 为反方，其余按奇偶分配）
      const proSide = members.filter((m) => m.role === "chair" || m.role === "contributor");
      const conSide = members.filter((m) => m.role === "reviewer" || m.role === "observer");
      const statements: Array<Record<string, unknown>> = [];
      let order = 1;

      // 交替发言，直到所有成员都发过言
      const maxLen = Math.max(proSide.length, conSide.length);
      for (let i = 0; i < maxLen; i++) {
        if (proSide[i]) {
          statements.push({
            memberId: proSide[i].id,
            role: proSide[i].role,
            specialty: proSide[i].specialty,
            model: proSide[i].model,
            order: order++,
            side: "pro",
            type: roundNumber % 2 === 1 ? "argument" : "rebuttal",
            content: `Pro-side ${roundNumber % 2 === 1 ? "argument" : "rebuttal"} on "${topic}" from ${proSide[i].role}.`,
            timestamp,
          });
        }
        if (conSide[i]) {
          statements.push({
            memberId: conSide[i].id,
            role: conSide[i].role,
            specialty: conSide[i].specialty,
            model: conSide[i].model,
            order: order++,
            side: "con",
            type: roundNumber % 2 === 1 ? "argument" : "rebuttal",
            content: `Con-side ${roundNumber % 2 === 1 ? "argument" : "rebuttal"} on "${topic}" from ${conSide[i].role}.`,
            timestamp,
          });
        }
      }
      return statements;
    }

    case "sequential": {
      // 所有成员按顺序发言（轮询）
      return members.map((member, index) => ({
        memberId: member.id,
        role: member.role,
        specialty: member.specialty,
        model: member.model,
        order: index + 1,
        type: "statement",
        content: `Sequential statement ${index + 1} on "${topic}" from ${member.role} (${member.specialty || "general"}).`,
        timestamp,
      }));
    }

    case "parallel": {
      // 所有成员同时发言（模拟并行，order 相同）
      return members.map((member) => ({
        memberId: member.id,
        role: member.role,
        specialty: member.specialty,
        model: member.model,
        order: 1, // 并行：同时
        type: "parallel_statement",
        content: `Parallel contribution on "${topic}" from ${member.role} (${member.specialty || "general"}).`,
        timestamp,
      }));
    }

    default: {
      // 默认回退到 committee 模式
      return members.map((member, index) => ({
        memberId: member.id,
        role: member.role,
        specialty: member.specialty,
        model: member.model,
        order: index + 1,
        type: "statement",
        content: `General statement on "${topic}" from ${member.role} (${member.specialty || "general"}).`,
        timestamp,
      }));
    }
  }
}

// 确定本轮 phase
function determinePhase(mode: string, roundNumber: number, maxRounds: number): string {
  if (roundNumber === maxRounds) return "conclusion";
  if (roundNumber === maxRounds - 1) return "synthesis";
  if (mode === "debate" && roundNumber % 2 === 0) return "rebuttal";
  return "argument";
}

// 从所有 rounds 构建 summary（用于最后一轮自动结束）
function buildSummaryFromRounds(
  existingRounds: Array<{ roundNumber: number; content: string; phase: string }>,
  latestRoundContent: Array<Record<string, unknown>>
): string {
  const parts: string[] = [
    "Workshop Summary:",
    "",
    "=== Rounds ===",
  ];

  for (const r of existingRounds) {
    let parsed;
    try {
      parsed = JSON.parse(r.content);
    } catch {
      parsed = [{ content: r.content }];
    }
    const summary = Array.isArray(parsed)
      ? `${parsed.length} statements`
      : "single statement";
    parts.push(`Round ${r.roundNumber} (${r.phase}): ${summary}`);
  }

  // 最新一轮
  parts.push(`Round ${existingRounds.length + 1} (latest): ${latestRoundContent.length} statements`);
  parts.push("");
  parts.push("=== Final Consensus ===");
  parts.push(`All ${existingRounds.length + 1} rounds completed. Consensus formed through collaborative discussion.`);

  return parts.join("\n");
}
