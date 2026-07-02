import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// POST /api/research/workshops/[id]/conclude - 结束研讨会
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. 获取 workshop 及其所有 rounds
    const workshop = await prisma.academicWorkshop.findUnique({
      where: { id },
      include: {
        panel: {
          include: {
            members: true,
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

    // 2. 从所有 rounds 的 content 生成最终共识结论
    const conclusion = buildFinalConclusion(workshop.rounds, workshop.panel.members);
    const consensus = buildConsensusStatement(workshop.rounds, workshop.panel.members);

    // 3. 计算最终共识度（取所有 rounds 的平均值，或最后一轮的值）
    const finalConsensusLevel =
      workshop.rounds.length > 0
        ? workshop.rounds[workshop.rounds.length - 1].consensusLevel
        : 0.5;

    // 4. 更新 workshop 状态
    const updatedWorkshop = await prisma.academicWorkshop.update({
      where: { id },
      data: {
        status: "concluded",
        conclusion,
        consensus,
      },
      include: {
        panel: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        rounds: {
          orderBy: { roundNumber: "asc" },
          select: {
            id: true,
            roundNumber: true,
            phase: true,
            consensusLevel: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        workshop: {
          id: updatedWorkshop.id,
          title: updatedWorkshop.title,
          status: updatedWorkshop.status,
          currentRound: updatedWorkshop.currentRound,
          maxRounds: updatedWorkshop.maxRounds,
          consensus: updatedWorkshop.consensus,
          conclusion: updatedWorkshop.conclusion,
          consensusLevel: finalConsensusLevel,
          panel: updatedWorkshop.panel,
        },
        rounds: updatedWorkshop.rounds.length,
      },
    });
  } catch (error) {
    console.error("[POST /api/research/workshops/[id]/conclude] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to conclude workshop" },
      { status: 500 }
    );
  }
}

// 生成最终共识结论（从所有 rounds 的 content 汇总）
function buildFinalConclusion(
  rounds: Array<{ roundNumber: number; phase: string; content: string; consensusLevel: number }>,
  members: Array<{ id: string; role: string; specialty: string }>
): string {
  const parts: string[] = [
    "=== Academic Workshop Conclusion ===",
    "",
    `Total Rounds: ${rounds.length}`,
    `Panel Members: ${members.length}`,
    "",
    "=== Round-by-Round Summary ===",
  ];

  for (const round of rounds) {
    let statements: Array<Record<string, unknown>> = [];
    try {
      statements = JSON.parse(round.content);
      if (!Array.isArray(statements)) statements = [statements];
    } catch {
      statements = [{ content: round.content }];
    }

    parts.push(`\n--- Round ${round.roundNumber} (${round.phase}, consensus: ${(round.consensusLevel * 100).toFixed(1)}%) ---`);
    for (const stmt of statements) {
      const role = (stmt.role as string) || "member";
      const specialty = (stmt.specialty as string) || "";
      const content = (stmt.content as string) || "";
      parts.push(`[${role}${specialty ? ` / ${specialty}` : ""}]: ${content}`);
    }
  }

  // 汇总统计
  const roleStats = new Map<string, number>();
  for (const round of rounds) {
    let statements: Array<Record<string, unknown>> = [];
    try {
      statements = JSON.parse(round.content);
      if (!Array.isArray(statements)) statements = [statements];
    } catch {
      continue;
    }
    for (const stmt of statements) {
      const role = (stmt.role as string) || "member";
      roleStats.set(role, (roleStats.get(role) || 0) + 1);
    }
  }

  parts.push("\n=== Contribution Summary ===");
  for (const [role, count] of roleStats.entries()) {
    parts.push(`${role}: ${count} contributions`);
  }

  parts.push("\n=== Final Consensus ===");
  parts.push("The workshop has concluded through collaborative deliberation.");
  parts.push(`Final consensus level: ${rounds.length > 0 ? (rounds[rounds.length - 1].consensusLevel * 100).toFixed(1) : 0}%.`);
  parts.push("All viewpoints have been considered and synthesized.");

  return parts.join("\n");
}

// 生成共识度字符串
function buildConsensusStatement(
  rounds: Array<{ roundNumber: number; consensusLevel: number }>,
  members: Array<{ role: string }>
): string {
  if (rounds.length === 0) {
    return "No discussion rounds completed. Consensus not reached.";
  }

  const finalLevel = rounds[rounds.length - 1].consensusLevel;
  const percentage = Math.round(finalLevel * 100);

  let levelLabel = "low";
  if (percentage >= 80) levelLabel = "high";
  else if (percentage >= 60) levelLabel = "moderate";
  else if (percentage >= 40) levelLabel = "emerging";

  const chairCount = members.filter((m) => m.role === "chair").length;
  const reviewerCount = members.filter((m) => m.role === "reviewer").length;

  return `${percentage}% consensus reached after ${rounds.length} rounds among ${members.length} panel members (${chairCount} chair, ${reviewerCount} reviewer). Consensus level: ${levelLabel}.`;
}
