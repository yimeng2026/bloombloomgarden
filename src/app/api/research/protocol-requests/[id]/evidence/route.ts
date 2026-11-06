import { NextRequest, NextResponse } from "next/server";
import { addProtocolEvidence } from "@/lib/protocol-requests";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    return NextResponse.json({ success: true, data: addProtocolEvidence(id, body) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add evidence";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
