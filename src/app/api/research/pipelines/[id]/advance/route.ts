import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pipeline = await prisma.manuscriptPipeline.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!pipeline) {
      return NextResponse.json(
        { success: false, error: "Pipeline not found" },
        { status: 404 }
      );
    }

    const allStages = pipeline.stages;
    const currentStage = allStages.find(
      (s) => s.name === pipeline.currentStage
    );

    if (!currentStage) {
      return NextResponse.json(
        { success: false, error: "Current stage not found" },
        { status: 404 }
      );
    }

    if (currentStage.status !== "completed") {
      return NextResponse.json(
        { success: false, error: "Current stage is not completed" },
        { status: 400 }
      );
    }

    const currentIndex = allStages.findIndex(
      (s) => s.id === currentStage.id
    );
    const nextStage = allStages[currentIndex + 1];

    if (!nextStage) {
      // 没有后续阶段，直接归档
      await prisma.manuscriptPipeline.update({
        where: { id },
        data: { status: "archived" },
      });
      return NextResponse.json({
        success: true,
        data: { message: "Pipeline archived", status: "archived" },
      });
    }

    await prisma.pipelineStage.update({
      where: { id: nextStage.id },
      data: { status: "active" },
    });

    const updatedPipeline = await prisma.manuscriptPipeline.update({
      where: { id },
      data: {
        status: nextStage.name,
        currentStage: nextStage.name,
      },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: updatedPipeline });
  } catch (error) {
    console.error(
      "[POST /api/research/pipelines/[id]/advance] error:",
      error
    );
    return NextResponse.json(
      { success: false, error: "Failed to advance pipeline" },
      { status: 500 }
    );
  }
}
