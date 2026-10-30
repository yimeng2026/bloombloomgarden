import { NextRequest } from "next/server";
import { POST as synchronizeSYLVA } from "../sylva-sync/route";

export const runtime = "nodejs";

/** Real parser/database initialization; the deleted UI fixture seed is gone. */
export async function POST(request: NextRequest) {
  return synchronizeSYLVA(request);
}
