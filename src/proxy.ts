import { NextResponse, type NextRequest } from "next/server";
import { authorizeAgent } from "@/lib/agent-auth";

/** Protect every direct research API as well as the forwarding control plane. */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/kimi-control") {
    return NextResponse.next();
  }
  const result = authorizeAgent(request);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
