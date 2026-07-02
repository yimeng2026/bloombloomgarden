import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_TYPES = [
  "prove",
  "review",
  "verify",
  "discover",
  "draft",
  "critique",
  "audit",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const targetModule = searchParams.get("targetModule");

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (targetModule) where.targetModule = targetModule;

    const tasks = await prisma.academicTask.findMany({
      where,
      include: {
        academicWorkshop: true,
        manuscriptPipeline: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error("[GET /api/research/tasks] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      type,
      priority,
      targetModule,
      targetPaper,
      panelMemberId,
      workshopId,
      pipelineId,
    } = body;

    if (!title || !type) {
      return NextResponse.json(
        { success: false, error: "Title and type are required" },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid type. Valid: ${VALID_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const task = await prisma.academicTask.create({
      data: {
        title,
        description: description || "",
        type,
        priority: priority || "normal",
        targetModule: targetModule || "",
        targetPaper: targetPaper || "",
        panelMemberId: panelMemberId || "",
        academicWorkshopId: workshopId || null,
        manuscriptPipelineId: pipelineId || null,
        status: panelMemberId ? "assigned" : "pending",
      },
      include: {
        academicWorkshop: true,
        manuscriptPipeline: true,
      },
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error("[POST /api/research/tasks] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create task" },
      { status: 500 }
    );
  }
}
