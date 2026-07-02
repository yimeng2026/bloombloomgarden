import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET: 返回所有 AcademicPanel（含 members 关联），支持 ?domain=xxx 筛选
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    const where: any = {};
    if (domain) where.domain = domain;

    const panels = await prisma.academicPanel.findMany({
      where,
      include: {
        members: {
          orderBy: { weight: "desc" },
        },
        workshops: {
          select: {
            id: true,
            title: true,
            status: true,
            mode: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        pipelines: {
          select: {
            id: true,
            title: true,
            status: true,
            currentStage: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: panels });
  } catch (error) {
    console.error("[GET /api/research/panels] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch panels" },
      { status: 500 }
    );
  }
}

// POST: 创建专家组（name, description, domain, strategy JSON）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, domain, strategy } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Panel name is required" },
        { status: 400 }
      );
    }

    const panel = await prisma.academicPanel.create({
      data: {
        name: name.trim(),
        description: description || "",
        domain: domain || "interdisciplinary",
        status: "active",
        strategy: typeof strategy === "object" ? JSON.stringify(strategy) : strategy || "{}",
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json({ success: true, data: panel }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/research/panels] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create panel" },
      { status: 500 }
    );
  }
}
