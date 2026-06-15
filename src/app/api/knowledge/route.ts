import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const kbs = await prisma.knowledgeBase.findMany({
      orderBy: { createdAt: "desc" },
      include: { documents: true },
    });
    return NextResponse.json(kbs);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch knowledge" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = "kb" } = body;
    if (type === "doc") {
      const doc = await prisma.knowledgeDoc.create({ data: body });
      return NextResponse.json(doc, { status: 201 });
    }
    const kb = await prisma.knowledgeBase.create({ data: body });
    return NextResponse.json(kb, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, type = "kb", ...data } = body;
    if (type === "doc") {
      const doc = await prisma.knowledgeDoc.update({ where: { id }, data });
      return NextResponse.json(doc);
    }
    const kb = await prisma.knowledgeBase.update({ where: { id }, data });
    return NextResponse.json(kb);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id, type = "kb" } = await req.json();
    if (type === "doc") {
      await prisma.knowledgeDoc.delete({ where: { id } });
    } else {
      await prisma.knowledgeBase.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
