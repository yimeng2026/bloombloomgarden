import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// 导入前端硬编码数据作为 fallback
import {
  modules as fallbackModules,
  papers as fallbackPapers,
  researchNotes as fallbackNotes,
} from "../../../research/data";

export async function POST(_request: NextRequest) {
  try {
    const results = {
      modules: 0,
      papers: 0,
      theorems: 0,
      notes: 0,
    };

    // 初始化 ResearchModule
    for (const m of fallbackModules) {
      await prisma.researchModule.upsert({
        where: { id: m.id },
        update: {
          name: m.name,
          displayName: m.name.replace(/-/g, " "),
          category: m.category,
          subcategory: m.category,
          discipline: m.category,
          lineCount: m.lines,
          sorryCount: m.sorryCount,
          status: m.status === "complete" ? "complete" : m.status === "incomplete" ? "active" : "research",
          filePath: m.path,
          dependencies: JSON.stringify(m.dependencies || []),
        },
        create: {
          id: m.id,
          name: m.name,
          displayName: m.name.replace(/-/g, " "),
          category: m.category,
          subcategory: m.category,
          discipline: m.category,
          lineCount: m.lines,
          sorryCount: m.sorryCount,
          status: m.status === "complete" ? "complete" : m.status === "incomplete" ? "active" : "research",
          filePath: m.path,
          dependencies: JSON.stringify(m.dependencies || []),
        },
      });
      results.modules++;

      // 为每个模块初始化定理
      for (const t of m.theorems || []) {
        await prisma.researchTheorem.upsert({
          where: { id: `${m.id}-${t}` },
          update: {
            name: t,
            statement: `${t} theorem statement`,
            moduleId: m.id,
            status: m.status === "complete" ? "proven" : "research",
          },
          create: {
            id: `${m.id}-${t}`,
            name: t,
            statement: `${t} theorem statement`,
            moduleId: m.id,
            status: m.status === "complete" ? "proven" : "research",
          },
        });
        results.theorems++;
      }
    }

    // 初始化 ResearchPaper
    for (const p of fallbackPapers) {
      await prisma.researchPaper.upsert({
        where: { id: p.id },
        update: {
          title: p.title,
          type: p.id.startsWith("hil") ? "Hilbert" : "Millennium",
          number: p.id.replace(/\D/g, ""),
          field: p.field,
          status: p.status,
          abstract: p.abstract,
          keywords: JSON.stringify([p.field]),
          milestones: JSON.stringify(p.milestones || []),
          leanSnippetCount: p.leanSnippets || 0,
        },
        create: {
          id: p.id,
          title: p.title,
          type: p.id.startsWith("hil") ? "Hilbert" : "Millennium",
          number: p.id.replace(/\D/g, ""),
          field: p.field,
          status: p.status,
          abstract: p.abstract,
          keywords: JSON.stringify([p.field]),
          milestones: JSON.stringify(p.milestones || []),
          leanSnippetCount: p.leanSnippets || 0,
        },
      });
      results.papers++;
    }

    // 初始化 ResearchNote
    for (const n of fallbackNotes) {
      await prisma.researchNote.upsert({
        where: { id: n.id },
        update: {
          title: n.title,
          content: n.content,
          tags: JSON.stringify(n.tags || []),
          moduleId: n.relatedModule || null,
          paperId: n.relatedPaper || null,
        },
        create: {
          id: n.id,
          title: n.title,
          content: n.content,
          tags: JSON.stringify(n.tags || []),
          moduleId: n.relatedModule || null,
          paperId: n.relatedPaper || null,
        },
      });
      results.notes++;
    }

    return NextResponse.json({
      success: true,
      message: "Research data initialized successfully",
      data: results,
    });
  } catch (error) {
    console.error("[POST /api/research/init] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize research data" },
      { status: 500 }
    );
  }
}
