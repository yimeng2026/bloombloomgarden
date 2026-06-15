import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [files, memories] = await Promise.all([
      prisma.workspaceFile.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.memoryFile.findMany({ orderBy: { createdAt: "desc" } }),
    ]);
    return NextResponse.json({ files, memories });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch workspace" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = "file" } = body;
    if (type === "memory") {
      const memory = await prisma.memoryFile.create({ data: body });
      return NextResponse.json(memory, { status: 201 });
    }
    const file = await prisma.workspaceFile.create({ data: body });
    return NextResponse.json(file, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, type = "file", ...data } = body;
    if (type === "memory") {
      const memory = await prisma.memoryFile.update({ where: { id }, data });
      return NextResponse.json(memory);
    }
    const file = await prisma.workspaceFile.update({ where: { id }, data });
    return NextResponse.json(file);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id, type = "file" } = await req.json();
    if (type === "memory") {
      await prisma.memoryFile.delete({ where: { id } });
    } else {
      await prisma.workspaceFile.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
