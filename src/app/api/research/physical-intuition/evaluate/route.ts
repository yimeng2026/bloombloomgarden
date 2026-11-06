import { NextRequest, NextResponse } from "next/server.js";
import { evaluateIntuitionTask } from "../../../../../lib/physical-intuition/evaluate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const task = await request.json();
    const data = evaluateIntuitionTask(task);
    return NextResponse.json({ success: true, data, evidenceUpgrade: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid intuition task";
    return NextResponse.json({ success: false, error: message, evidenceUpgrade: false }, { status: 400 });
  }
}
