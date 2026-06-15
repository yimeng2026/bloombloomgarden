import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [records, alerts] = await Promise.all([
      prisma.costRecord.findMany({ orderBy: { date: "desc" } }),
      prisma.costAlert.findMany({ orderBy: { createdAt: "desc" } }),
    ]);
    return NextResponse.json({ records, alerts });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch costs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = "record" } = body;
    if (type === "alert") {
      const alert = await prisma.costAlert.create({ data: body });
      return NextResponse.json(alert, { status: 201 });
    }
    const record = await prisma.costRecord.create({ data: body });
    return NextResponse.json(record, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, type = "record", ...data } = body;
    if (type === "alert") {
      const alert = await prisma.costAlert.update({ where: { id }, data });
      return NextResponse.json(alert);
    }
    const record = await prisma.costRecord.update({ where: { id }, data });
    return NextResponse.json(record);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id, type = "record" } = await req.json();
    if (type === "alert") {
      await prisma.costAlert.delete({ where: { id } });
    } else {
      await prisma.costRecord.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
