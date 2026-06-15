import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const channels = await prisma.channel.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(channels);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const channel = await prisma.channel.create({ data: body });
    return NextResponse.json(channel, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    const channel = await prisma.channel.update({ where: { id }, data });
    return NextResponse.json(channel);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update channel" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await prisma.channel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete channel" }, { status: 500 });
  }
}
