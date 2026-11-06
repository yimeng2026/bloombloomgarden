import { NextRequest, NextResponse } from "next/server.js";
import { correctProtocolMethodStatus } from "../../../../../../lib/protocol-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const input = await request.json();
    const data = correctProtocolMethodStatus(id, input);
    return NextResponse.json({ success: true, data, evidenceUpgrade: false });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ success: false, error: "Protocol request not found", evidenceUpgrade: false }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Failed to correct method status";
    return NextResponse.json({ success: false, error: message, evidenceUpgrade: false }, { status: 400 });
  }
}
