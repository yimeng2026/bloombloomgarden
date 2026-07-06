import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tasks = await prisma.academicTask.findMany({
      where: { pipelineId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error(
      "[GET /api/research/pipelines/[id]/tasks] error:",
      error
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch pipeline tasks" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, type, priority, targetModule, targetPaper } =
      body;

    if (!title || !type) {
      return NextResponse.json(
        { success: false, error: "Title and type are required" },
        { status: 400 }
      );
    }

    const pipeline = await prisma.manuscriptPipeline.findUnique({
      where: { id },
      include: {
        stages: {
          where: { status: "active" },
          orderBy: { order: "asc" },
        },
        panel: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!pipeline) {
      return NextResponse.json(
        { success: false, error: "Pipeline not found" },
        { status: 404 }
      );
    }

    const activeStage = pipeline.stages[0];
    if (!activeStage) {
      return NextResponse.json(
        { success: false, error: "No active stage found" },
        { status: 400 }
      );
    }

    // 按当前阶段的 assigneeRole 匹配专家组成员
    const assigneeRole = activeStage.assigneeRole;
    const panelMember = pipeline.panel?.members?.find(
      (m) => m.role === assigneeRole
    );

    const task = await prisma.academicTask.create({
      data: {
        title,
        description: description || "",
        type,
        priority: priority || "normal",
        targetModule: targetModule || "",
        targetPaper: targetPaper || "",
        pipelineId: id,
        panelMemberId: panelMember?.id || "",
        status: panelMember ? "assigned" : "pending",
      },
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error(
      "[POST /api/research/pipelines/[id]/tasks] error:",
      error
    );
    return NextResponse.json(
      { success: false, error: "Failed to create pipeline task" },
      { status: 500 }
    );
  }
}
