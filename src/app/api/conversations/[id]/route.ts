import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/conversations/[id] - 获取对话详情（含消息）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        agent: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "对话不存在" }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Failed to fetch conversation:", error);
    return NextResponse.json({ error: "获取对话失败" }, { status: 500 });
  }
}

// DELETE /api/conversations/[id] - 删除对话
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.conversation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    return NextResponse.json({ error: "删除对话失败" }, { status: 500 });
  }
}
