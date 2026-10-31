import { NextRequest, NextResponse } from "next/server";
import {
  createLawPackage,
  LAW_KINDS,
  LAW_PACKAGE_SCHEMA_VERSION,
  LAW_STATUSES,
  lawPerspectives,
  listLawPackages,
} from "@/lib/law-packages";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");
    const status = searchParams.get("status");
    const query = searchParams.get("q")?.trim().toLocaleLowerCase() || "";
    if (kind && !LAW_KINDS.includes(kind as (typeof LAW_KINDS)[number])) {
      return NextResponse.json({ success: false, error: `kind must be one of ${LAW_KINDS.join(", ")}` }, { status: 400 });
    }
    if (status && !LAW_STATUSES.includes(status as (typeof LAW_STATUSES)[number])) {
      return NextResponse.json({ success: false, error: `status must be one of ${LAW_STATUSES.join(", ")}` }, { status: 400 });
    }
    const packages = listLawPackages().filter((item) => {
      if (kind && item.kind !== kind) return false;
      if (status && item.status !== status) return false;
      if (query) {
        const haystack = `${item.id} ${item.title} ${item.domain} ${item.statement}`.toLocaleLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    return NextResponse.json({
      success: true,
      data: packages,
      meta: {
        schemaVersion: LAW_PACKAGE_SCHEMA_VERSION,
        count: packages.length,
        perspectives: lawPerspectives,
        note: "Evidence status is not a universal-law claim; inspect validations, counterexamples, and history.",
      },
    });
  } catch (error) {
    console.error("[GET /api/research/law-packages] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch law packages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const result = createLawPackage(body);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.reason === "conflict" ? "Law package already exists" : "Invalid law package", issues: result.issues },
        { status: result.reason === "conflict" ? 409 : 400 },
      );
    }
    return NextResponse.json({ success: true, data: result.package }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: "Request body must be valid JSON" }, { status: 400 });
    }
    console.error("[POST /api/research/law-packages] error:", error);
    return NextResponse.json({ success: false, error: "Failed to create law package" }, { status: 500 });
  }
}
