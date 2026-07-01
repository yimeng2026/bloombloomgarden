import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag");

    const where: any = {};
    if (tag) {
      // SQLite 中 JSON 数组搜索，简单使用 LIKE
      where.tags = { contains: tag };
    }

    const notes = await prisma.researchNote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        module: { select: { id: true, name: true } },
        paper: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error("[GET /api/research/notes] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notes", fallback: true },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, tags, moduleId, paperId } = body;

    if (!title || title.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    const note = await prisma.researchNote.create({
      data: {
        title: title.trim(),
        content: content || "",
        tags: JSON.stringify(tags || []),
        moduleId: moduleId || null,
        paperId: paperId || null,
      },
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/research/notes] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create note" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, content, tags, moduleId, paperId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const note = await prisma.researchNote.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        content: content !== undefined ? content : undefined,
        tags: tags !== undefined ? JSON.stringify(tags) : undefined,
        moduleId: moduleId !== undefined ? moduleId || null : undefined,
        paperId: paperId !== undefined ? paperId || null : undefined,
      },
    });

    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    console.error("[PUT /api/research/notes] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    await prisma.researchNote.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Note deleted" });
  } catch (error) {
    console.error("[DELETE /api/research/notes] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
