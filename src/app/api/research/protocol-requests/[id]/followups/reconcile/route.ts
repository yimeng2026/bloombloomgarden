import { NextRequest, NextResponse } from "next/server.js";
import { reconcileProtocolFollowups, type ProtocolFollowupBaseline } from "../../../../../../../lib/protocol-followup-reconciliation";
import { getProtocolRequest } from "../../../../../../../lib/protocol-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 只读计算：客户端显式提供历史基线，接口不保存基线或修改证据。
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json() as { previous?: ProtocolFollowupBaseline };
    if (!body || typeof body !== "object" || !body.previous) {
      return NextResponse.json({ success: false, error: "previous followup snapshot is required", evidenceUpgrade: false }, { status: 400 });
    }
    const data = reconcileProtocolFollowups(getProtocolRequest(id), body.previous);
    return NextResponse.json({ success: true, data, evidenceUpgrade: false });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ success: false, error: "Protocol request not found", evidenceUpgrade: false }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Failed to reconcile protocol followups";
    return NextResponse.json({ success: false, error: message, evidenceUpgrade: false }, { status: 400 });
  }
}
