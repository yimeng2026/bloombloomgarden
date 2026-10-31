import { NextRequest, NextResponse } from "next/server";
import { getLawPackage } from "@/lib/law-packages";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = getLawPackage(id);
    if (!item) return NextResponse.json({ success: false, error: "Law package not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("[GET /api/research/law-packages/:id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch law package" }, { status: 500 });
  }
}
