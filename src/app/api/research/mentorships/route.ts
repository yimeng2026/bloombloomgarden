import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// ── 预置教学辅导模板 ──────────────────────────────────────
export const MENTORSHIP_TEMPLATES = {
  lean4_fundamentals: {
    curriculum: [
      { title: "Lean 4 基础", topics: ["def", "theorem", "proof", "example", "inductive"] },
      { title: "类型与函数", topics: ["Pi 类型", "Sigma 类型", "依赖函数", "多态"] },
      { title: "证明策略", topics: ["intro", "apply", "rw", "simp", "linarith", "tauto"] },
      { title: "tactic 组合", topics: ["<;>", "focus", "have", "suffices", "by_cases"] },
    ],
  },
  number_theory_advanced: {
    curriculum: [
      { title: "解析数论", topics: ["Riemann zeta", "Dirichlet series", "Möbius 反演", "素数定理"] },
      { title: "代数数论", topics: ["代数整数", "Dedekind 环", "理想类群", "分歧理论"] },
      { title: "椭圆曲线", topics: ["Weierstrass 方程", "Mordell-Weil 定理", "L-函数", "BSD 猜想"] },
    ],
  },
  algebraic_geometry_intro: {
    curriculum: [
      { title: "代数几何入门", topics: ["Affine varieties", "Projective space", "Zariski 拓扑", "Hilbert 零点定理"] },
      { title: "概形理论", topics: ["层", "局部环层空间", "仿射概形", "概形态射"] },
      { title: "上同调", topics: ["Čech 上同调", "层上同调", "Serre 对偶", "Riemann-Roch 定理"] },
    ],
  },
};

const VALID_MODES = ["one_on_one", "group", "peer", "socratic"];

// ── GET ───────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const mode = searchParams.get("mode");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (domain) where.domain = domain;
    if (mode) where.mode = mode;
    if (status) where.status = status;

    const mentorships = await prisma.academicMentorship.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: mentorships });
  } catch (error) {
    console.error("[GET /api/research/mentorships] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch mentorships" },
      { status: 500 }
    );
  }
}

// ── POST ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, domain, mode, curriculum, template } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Missing required field: name" },
        { status: 400 }
      );
    }

    if (mode && !VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { success: false, error: `Invalid mode. Valid: ${VALID_MODES.join(", ")}` },
        { status: 400 }
      );
    }

    // 如果指定了模板，使用模板 curriculum
    let finalCurriculum: unknown[] = [];
    if (template && MENTORSHIP_TEMPLATES[template as keyof typeof MENTORSHIP_TEMPLATES]) {
      finalCurriculum = MENTORSHIP_TEMPLATES[template as keyof typeof MENTORSHIP_TEMPLATES].curriculum;
    } else if (curriculum) {
      finalCurriculum = Array.isArray(curriculum) ? curriculum : [];
    }

    const mentorship = await prisma.academicMentorship.create({
      data: {
        name: name.trim(),
        description: (description || "").trim(),
        domain: (domain || "").trim(),
        mode: mode || "one_on_one",
        status: "active",
        curriculum: JSON.stringify(finalCurriculum),
      },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: mentorship });
  } catch (error) {
    console.error("[POST /api/research/mentorships] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create mentorship" },
      { status: 500 }
    );
  }
}
