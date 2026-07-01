import { NextResponse } from "next/server";
import { ontologyEngine } from "@/lib/ontology";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const schema = await ontologyEngine.getSchema(id);
    if (!schema) {
      return NextResponse.json({ error: "Schema not found" }, { status: 404 });
    }
    return NextResponse.json(schema);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[GET /api/ontology/schemas/${(await params).id}]`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    await ontologyEngine.updateSchema(id, body);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[PUT /api/ontology/schemas/${(await params).id}]`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await ontologyEngine.deleteSchema(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[DELETE /api/ontology/schemas/${(await params).id}]`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
