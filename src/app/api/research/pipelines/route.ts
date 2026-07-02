import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const STAGE_DEFINITIONS = [
  { name: "idea", order: 0, assigneeRole: "contributor" },
  { name: "outline", order: 1, assigneeRole: "contributor" },
  { name: "draft", order: 2, assigneeRole: "contributor" },
  { name: "review", order: 3, assigneeRole: "reviewer" },
  { name: "revision", order: 4, assigneeRole: "contributor" },
  { name: "final", order: 5, assigneeRole: "chair" },
  { name: "publish", order: 6, assigneeRole: "chair" },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) where.status = status;

    const pipelines = await prisma.manuscriptPipeline.findMany({
      where,
      include: {
        panel: true,
        stages: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: pipelines });
  } catch (error) {
    console.error("[GET /api/research/pipelines] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pipelines" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, panelId } = body;

    if (!title || !panelId) {
      return NextResponse.json(
        { success: false, error: "Title and panelId are required" },
        { status: 400 }
      );
    }

    const pipeline = await prisma.manuscriptPipeline.create({
      data: {
        title,
        description: description || "",
        panelId,
        status: "idea",
        currentStage: "idea",
        stages: {
          create: STAGE_DEFINITIONS.map((stage) => ({
            name: stage.name,
            order: stage.order,
            assigneeRole: stage.assigneeRole,
            status: stage.name === "idea" ? "active" : "pending",
          })),
        },
      },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
        panel: true,
      },
    });

    return NextResponse.json({ success: true, data: pipeline });
  } catch (error) {
    console.error("[POST /api/research/pipelines] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create pipeline" },
      { status: 500 }
    );
  }
}
