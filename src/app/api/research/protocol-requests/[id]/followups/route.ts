import { NextRequest, NextResponse } from "next/server.js";
import { getProtocolRequest } from "../../../../../../lib/protocol-requests";
import { buildProtocolFollowups } from "../../../../../../lib/protocol-followups";

export const runtime = "nodejs";

// GET /api/research/protocol-requests/[id]/followups - 由原始证据生成精确求援项，不调用模型、不修改证据。
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json({ success: true, data: buildProtocolFollowups(getProtocolRequest(id)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request not found";
    return NextResponse.json({ success: false, error: message, evidenceUpgrade: false }, { status: 404 });
  }
}
