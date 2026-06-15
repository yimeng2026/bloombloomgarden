import { NextResponse } from "next/server";
import { initWebSocket } from "@/lib/websocket";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    initWebSocket(3001);
    return NextResponse.json({ status: "websocket initialized", port: 3001 });
  } catch (e) {
    return NextResponse.json({ status: "websocket fallback active" });
  }
}
