import { NextRequest, NextResponse } from "next/server";
import { buildMethodLineage } from "@/lib/method-lineage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get("requestId");
  if (!requestId) return NextResponse.json({ success: false, error: "requestId is required, for example ca-six-2026" }, { status: 400 });
  try {
    return NextResponse.json({ success: true, data: buildMethodLineage(requestId), evidenceUpgrade: false });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ success: false, error: "Protocol request not found", evidenceUpgrade: false }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Failed to build method lineage";
    return NextResponse.json({ success: false, error: message, evidenceUpgrade: false }, { status: 400 });
  }
}
