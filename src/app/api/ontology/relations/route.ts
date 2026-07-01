import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schemaId = searchParams.get("schemaId");

    const where: Record<string, unknown> = {};
    if (schemaId) where.schemaId = schemaId;

    const relations = await prisma.ontologyRelation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        linkType: true,
        sourceInstance: { include: { type: true } },
        targetInstance: { include: { type: true } },
      },
    });

    const parsed = relations.map((r) => ({
      ...r,
      properties: (() => {
        try {
          return JSON.parse(r.properties);
        } catch {
          return {};
        }
      })(),
      linkTypeName: r.linkType?.name || null,
      sourceName: r.sourceInstance?.name || null,
      sourceType: r.sourceInstance?.type?.name || null,
      targetName: r.targetInstance?.name || null,
      targetType: r.targetInstance?.type?.name || null,
    }));

    return NextResponse.json({ relations: parsed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/ontology/relations]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
