import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseSYLVAProject,
  generateModuleSyncData,
  generateTheoremSyncData,
  generateTaskForSorry,
  generateSorryAnalysisPrompt,
} from "@/lib/sylva-parser";
import { researchChat } from "@/lib/research-llm";

export const runtime = "nodejs";

const TOE_SYLVA_PATH = "C:\\Users\\一梦\\Documents\\TOE-SYLVA-pull";

/**
 * 从本地文件系统读取 TOE-SYLVA 的 Lean 文件
 */
async function readSYLVAFiles(): Promise<Array<{ path: string; content: string }>> {
  try {
    const { readFileSync, readdirSync, statSync } = require("fs");
    const { join } = require("path");

    const files: Array<{ path: string; content: string }> = [];

    function walkDir(dir: string, basePath: string) {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          if (entry.startsWith(".") || entry === "lake-packages" || entry === ".lake") continue;
          walkDir(fullPath, basePath);
        } else if (entry.endsWith(".lean")) {
          const relativePath = fullPath.replace(basePath, "").replace(/^\\/, "").replace(/^\//, "");
          const content = readFileSync(fullPath, "utf-8");
          files.push({ path: relativePath, content });
        }
      }
    }

    walkDir(TOE_SYLVA_PATH, TOE_SYLVA_PATH);
    return files;
  } catch (error) {
    console.error("[sylva-sync] Failed to read SYLVA files:", error);
    throw new Error("Failed to read TOE-SYLVA files from filesystem");
  }
}

/**
 * 使用 LLM 分析 sorry 的证明策略
 */
async function analyzeSorryWithLLM(
  theorem: any,
  moduleDescription: string
): Promise<{ strategy: string; difficulty: number; suggestedTactics: string[] }> {
  try {
    const prompt = generateSorryAnalysisPrompt(theorem, moduleDescription);
    const response = await researchChat({
      systemPrompt: "You are a formal mathematics expert specializing in Lean 4 proof assistant. Analyze incomplete proofs and provide detailed strategies for completing them. Respond in Chinese.",
      userPrompt: prompt,
      temperature: 0.3,
      model: "glm-5.1",
      provider: "zhipu",
    });

    const content = response.content || "";

    // 解析 LLM 响应，提取结构化信息
    const difficultyMatch = content.match(/难度[：:]\s*(\d+)/);
    const difficulty = difficultyMatch ? parseInt(difficultyMatch[1]) : 5;

    const tacticsMatch = content.match(/建议 tactics?[：:]\s*([\s\S]*?)(?=\n\n|$)/i);
    const suggestedTactics = tacticsMatch
      ? tacticsMatch[1].split(/[,;\n]/).map((t: string) => t.trim()).filter(Boolean)
      : [];

    return {
      strategy: content,
      difficulty: Math.min(10, Math.max(1, difficulty)),
      suggestedTactics,
    };
  } catch (error) {
    console.error("[sylva-sync] LLM analysis failed:", error);
    return {
      strategy: "LLM 分析失败，请手动分析。" + (error as Error).message,
      difficulty: 5,
      suggestedTactics: [],
    };
  }
}

// POST: 同步 TOE-SYLVA 到千界花园
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { analyzeWithLLM = true, createTasks = true } = body;

    // 1. 读取 TOE-SYLVA 文件
    const files = await readSYLVAFiles();
    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No Lean files found in TOE-SYLVA" },
        { status: 404 }
      );
    }

    // 2. 解析 Lean 文件
    const parsed = parseSYLVAProject(files);

    // 3. 同步到数据库
    const result = await prisma.$transaction(async (tx) => {
      const syncResult = {
        modulesCreated: 0,
        modulesUpdated: 0,
        theoremsCreated: 0,
        theoremsUpdated: 0,
        tasksCreated: 0,
        notesCreated: 0,
        llmAnalyses: 0,
        errors: [] as string[],
      };

      for (const module of parsed.modules) {
        // 同步或创建 ResearchModule
        const moduleData = generateModuleSyncData(module);
        let researchModule = await tx.researchModule.findFirst({
          where: { filePath: module.filePath },
        });

        if (researchModule) {
          researchModule = await tx.researchModule.update({
            where: { id: researchModule.id },
            data: {
              lineCount: moduleData.lineCount,
              sorryCount: moduleData.sorryCount,
              theoremCount: moduleData.theoremCount,
              definitionCount: moduleData.definitionCount,
              dependencies: moduleData.dependencies,
              updatedAt: new Date(),
            },
          });
          syncResult.modulesUpdated++;
        } else {
          researchModule = await tx.researchModule.create({
            data: moduleData,
          });
          syncResult.modulesCreated++;
        }

        // 同步 Theorems
        for (const theorem of module.theorems) {
          const theoremData = generateTheoremSyncData(theorem, researchModule.id);
          const existingTheorem = await tx.researchTheorem.findFirst({
            where: { name: theorem.name, moduleId: researchModule.id },
          });

          if (existingTheorem) {
            await tx.researchTheorem.update({
              where: { id: existingTheorem.id },
              data: {
                status: theoremData.status,
                proofStrategy: theoremData.proofStrategy,
                leanCode: theoremData.leanCode,
                updatedAt: new Date(),
              },
            });
            syncResult.theoremsUpdated++;
          } else {
            await tx.researchTheorem.create({
              data: theoremData,
            });
            syncResult.theoremsCreated++;
          }

          // 为 sorry 创建 ResearchNote
          if (theorem.hasSorry && theorem.proofStrategy) {
            const existingNote = await tx.researchNote.findFirst({
              where: {
                title: `策略: ${theorem.name}`,
                moduleId: researchModule.id,
              },
            });
            if (!existingNote) {
              await tx.researchNote.create({
                data: {
                  title: `策略: ${theorem.name}`,
                  content: theorem.proofStrategy,
                  tags: JSON.stringify(["sorry", "proof-strategy", theorem.type]),
                  moduleId: researchModule.id,
                },
              });
              syncResult.notesCreated++;
            }
          }
        }

        // 同步 Definitions
        for (const def of module.definitions) {
          const existingDef = await tx.researchTheorem.findFirst({
            where: { name: def.name, moduleId: researchModule.id },
          });
          if (!existingDef) {
            await tx.researchTheorem.create({
              data: {
                name: def.name,
                statement: def.statement,
                moduleId: researchModule.id,
                status: "proven", // definitions are axiomatic
                leanCode: `${def.name} (${def.type}): ${def.statement}`,
              },
            });
            syncResult.theoremsCreated++;
          }
        }

        // 创建 AcademicTask（用于跟踪 sorry）
        if (createTasks) {
          // 查找或创建 Workshop 和 Pipeline
          let workshop = await tx.academicWorkshop.findFirst({
            where: { topic: { contains: module.fileName.replace(/\.lean$/, "") } },
          });
          let pipeline = await tx.manuscriptPipeline.findFirst({
            where: { title: { contains: module.fileName.replace(/\.lean$/, "") } },
          });

          for (const theorem of module.theorems) {
            if (theorem.hasSorry) {
              const taskData = generateTaskForSorry(
                theorem,
                module.fileName,
                workshop?.id || null,
                pipeline?.id || null
              );
              const existingTask = await tx.academicTask.findFirst({
                where: {
                  title: taskData.title,
                  targetPaper: theorem.name,
                },
              });
              if (!existingTask) {
                await tx.academicTask.create({
                  data: taskData,
                });
                syncResult.tasksCreated++;
              }
            }
          }
        }

        // LLM 分析
        if (analyzeWithLLM) {
          for (const theorem of module.theorems) {
            if (theorem.hasSorry && theorem.sorryCount <= 3) {
              // 只对少量 sorry 的定理进行 LLM 分析（避免 API 调用过多）
              try {
                const analysis = await analyzeSorryWithLLM(
                  theorem,
                  module.moduleDescription
                );
                const existingNote = await tx.researchNote.findFirst({
                  where: {
                    title: `LLM分析: ${theorem.name}`,
                    moduleId: researchModule.id,
                  },
                });
                if (!existingNote) {
                  await tx.researchNote.create({
                    data: {
                      title: `LLM分析: ${theorem.name}`,
                      content: `**难度**: ${analysis.difficulty}/10\n\n**策略**:\n${analysis.strategy}\n\n**建议 Tactics**: ${analysis.suggestedTactics.join(", ")}`,
                      tags: JSON.stringify(["llm-analysis", "sorry", `difficulty-${analysis.difficulty}`]),
                      moduleId: researchModule.id,
                    },
                  });
                  syncResult.notesCreated++;
                  syncResult.llmAnalyses++;
                }
              } catch (err) {
                syncResult.errors.push(`LLM analysis failed for ${theorem.name}: ${(err as Error).message}`);
              }
            }
          }
        }
      }

      // 记录同步历史
      await tx.researchSync.create({
        data: {
          repoName: "TOE-SYLVA",
          commitHash: "local",
          branch: "main",
          filesChanged: files.length,
          insertions: 0,
          deletions: 0,
        },
      });

      return syncResult;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          message: "TOE-SYLVA 同步完成",
          filesParsed: files.length,
          modulesTotal: parsed.modules.length,
          theoremsTotal: parsed.totalTheorems,
          definitionsTotal: parsed.totalDefinitions,
          sorryTotal: parsed.totalSorry,
          axiomTotal: parsed.totalAxiom,
          millenniumProblems: parsed.millenniumProblems.map((mp) => mp.name),
          syncDetails: result,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/research/sylva-sync] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Failed to sync TOE-SYLVA",
      },
      { status: 500 }
    );
  }
}

// GET: 获取同步状态
export async function GET(request: NextRequest) {
  try {
    const [modules, theorems, tasks, syncs] = await Promise.all([
      prisma.researchModule.findMany({
        orderBy: { sorryCount: "desc" },
        take: 10,
      }),
      prisma.researchTheorem.findMany({
        where: { status: "research" },
        take: 10,
      }),
      prisma.academicTask.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.researchSync.findMany({
        orderBy: { syncedAt: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          topModules: modules.map((m) => ({
            name: m.name,
            sorryCount: m.sorryCount,
            theoremCount: m.theoremCount,
            filePath: m.filePath,
          })),
          activeResearch: theorems.map((t) => ({
            name: t.name,
            status: t.status,
            moduleId: t.moduleId,
            proofStrategy: t.proofStrategy?.substring(0, 100),
          })),
          recentTasks: tasks.map((t) => ({
            title: t.title,
            status: t.status,
            priority: t.priority,
            type: t.type,
          })),
          syncHistory: syncs.map((s) => ({
            repoName: s.repoName,
            filesChanged: s.filesChanged,
            syncedAt: s.syncedAt,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/research/sylva-sync] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sync status",
      },
      { status: 500 }
    );
  }
}
