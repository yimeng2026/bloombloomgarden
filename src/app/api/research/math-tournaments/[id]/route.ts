import { NextRequest, NextResponse } from "next/server";
import { getMathTournament, MathTournamentInputError } from "@/lib/math-tournament";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json({ success: true, data: getMathTournament(id) });
  } catch (error) {
    if (error instanceof MathTournamentInputError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ success: false, error: "Math tournament not found" }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: "Failed to read math tournament" }, { status: 500 });
  }
}
