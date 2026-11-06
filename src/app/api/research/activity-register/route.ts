import { NextRequest, NextResponse } from "next/server.js";
import { buildActivityGraphFromRequest } from "../../../../lib/activity-graph";
import { buildActivityRegisterFromRequest } from "../../../../lib/activity-register";
import { getProtocolRequest } from "../../../../lib/protocol-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get("requestId");
  if (!requestId) {
    return NextResponse.json({
      success: false,
      error: "requestId is required, for example ca-six-2026",
      evidenceUpgrade: false,
    }, { status: 400 });
  }
  try {
    const protocolRequest = getProtocolRequest(requestId);
    const data = {
      ...buildActivityRegisterFromRequest(protocolRequest),
      graph: buildActivityGraphFromRequest(protocolRequest),
    };
    return NextResponse.json({ success: true, data, evidenceUpgrade: false });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ success: false, error: "Protocol request not found", evidenceUpgrade: false }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Failed to build activity register";
    return NextResponse.json({ success: false, error: message, evidenceUpgrade: false }, { status: 400 });
  }
}
