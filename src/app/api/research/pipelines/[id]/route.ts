import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pipeline = await prisma.manuscriptPipeline.findUnique({
      where: { id },
      include: {
        panel: true,
        stages: {
          orderBy: { order: "asc" },
        },
        tasks: true,
      },
    });

    if (!pipeline) {
      return NextResponse.json(
        { success: false, error: "Pipeline not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: pipeline });
  } catch (error) {
    console.error("[GET /api/research/pipelines/[id]] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pipeline" },
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
    const { title, description, content } = body;

    const pipeline = await prisma.manuscriptPipeline.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
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
    console.error("[PUT /api/research/pipelines/[id]] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update pipeline" },
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

    await prisma.manuscriptPipeline.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/research/pipelines/[id]] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete pipeline" },
      { status: 500 }
    );
  }
}
