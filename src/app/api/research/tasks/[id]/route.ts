import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await prisma.academicTask.findUnique({
      where: { id },
      include: {
        workshop: true,
        pipeline: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error("[GET /api/research/tasks/[id]] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, result, leanCode, score } = body;

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === "completed") {
        updateData.completedAt = new Date();
      } else if (
        status === "pending" ||
        status === "assigned" ||
        status === "in-progress"
      ) {
        updateData.completedAt = null;
      }
    }
    if (result !== undefined) updateData.result = result;
    if (leanCode !== undefined) updateData.leanCode = leanCode;
    if (score !== undefined) updateData.score = score;

    const task = await prisma.academicTask.update({
      where: { id },
      data: updateData,
      include: {
        workshop: true,
        pipeline: true,
      },
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error("[PUT /api/research/tasks/[id]] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.academicTask.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/research/tasks/[id]] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
