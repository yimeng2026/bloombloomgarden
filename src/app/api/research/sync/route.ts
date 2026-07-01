import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repo } = body;

    if (repo !== "TOE-SYLVA" && repo !== "PFE") {
      return NextResponse.json(
        { success: false, error: "Invalid repo. Must be 'TOE-SYLVA' or 'PFE'" },
        { status: 400 }
      );
    }

    const repoPath =
      repo === "TOE-SYLVA"
        ? process.env.TOE_SYLVA_PATH || "../TOE-SYLVA"
        : process.env.PFE_PATH || "../PFE";

    // 执行 git pull
    let pullResult: string;
    try {
      const { stdout, stderr } = await execAsync(`git -C "${repoPath}" pull --stat`);
      pullResult = stdout || stderr;
    } catch (e: any) {
      pullResult = e.stdout || e.stderr || e.message || "Git pull failed";
    }

    // 获取最新 commit hash
    let commitHash = "";
    try {
      const { stdout } = await execAsync(`git -C "${repoPath}" rev-parse HEAD`);
      commitHash = stdout.trim();
    } catch {
      commitHash = "unknown";
    }

    // 获取分支名
    let branch = "main";
    try {
      const { stdout } = await execAsync(`git -C "${repoPath}" rev-parse --abbrev-ref HEAD`);
      branch = stdout.trim();
    } catch {
      branch = "main";
    }

    // 解析统计信息
    const filesChangedMatch = pullResult.match(/(\d+)\s+file/i);
    const insertionsMatch = pullResult.match(/(\d+)\s+insertion/i);
    const deletionsMatch = pullResult.match(/(\d+)\s+deletion/i);

    const filesChanged = filesChangedMatch ? parseInt(filesChangedMatch[1], 10) : 0;
    const insertions = insertionsMatch ? parseInt(insertionsMatch[1], 10) : 0;
    const deletions = deletionsMatch ? parseInt(deletionsMatch[1], 10) : 0;

    // 记录同步状态到 ResearchSync
    const sync = await prisma.researchSync.create({
      data: {
        repoName: repo,
        commitHash,
        branch,
        filesChanged,
        insertions,
        deletions,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        repo,
        commitHash,
        branch,
        filesChanged,
        insertions,
        deletions,
        syncedAt: sync.syncedAt,
        pullOutput: pullResult.substring(0, 2000), // 截断输出
      },
    });
  } catch (error) {
    console.error("[POST /api/research/sync] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync repository" },
      { status: 500 }
    );
  }
}
