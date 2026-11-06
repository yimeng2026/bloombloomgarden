import { NextRequest, NextResponse } from "next/server";
import { getProtocolRequest, updateProtocolRequest } from "@/lib/protocol-requests";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json({ success: true, data: getProtocolRequest(id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request not found";
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    return NextResponse.json({ success: true, data: updateProtocolRequest(id, body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update protocol request";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
