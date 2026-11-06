import { NextRequest, NextResponse } from "next/server";
import { createProtocolRequest, listProtocolRequests, ProtocolRequestStatus } from "@/lib/protocol-requests";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status") as ProtocolRequestStatus | null;
    const document = request.nextUrl.searchParams.get("document") || undefined;
    const query = request.nextUrl.searchParams.get("q") || undefined;
    const result = listProtocolRequests({ status: status || undefined, document, query });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list protocol requests";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = createProtocolRequest(body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create protocol request";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
