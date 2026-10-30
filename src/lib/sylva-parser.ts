/**
 * TOE-SYLVA Lean 4 代码解析器
 * 
 * 解析 Lean 文件，提取结构信息用于同步到千界花园学术研究系统。
 * 纯文本解析（不依赖 lake/lean 编译），基于正则表达式和字符串模式匹配。
 */

export interface LeanTheorem {
  name: string;
  type: "theorem" | "lemma" | "def" | "axiom" | "conjecture" | "structure" | "inductive" | "instance";
  lineStart: number;
  lineEnd: number;
  statement: string;       // 定理声明文本（不含证明体）
  proofStrategy: string;   // 证明策略注释（从 sorry 前的注释提取）
  hasSorry: boolean;         // 是否包含 sorry
  sorryCount: number;      // sorry 数量
  sorryLines: number[];    // sorry 所在行号
  isMillennium: boolean;    // 是否标注为 Millennium Problem
}

export interface LeanModule {
  fileName: string;
  filePath: string;
  totalLines: number;
  theorems: LeanTheorem[];
  definitions: LeanTheorem[];
  sorryCount: number;
  todoCount: number;
  imports: string[];
  namespace: string;
  moduleDescription: string;
  analysisMode: "text_only_not_compiled";
}

export interface ParsedSYLVA {
  modules: LeanModule[];
  totalTheorems: number;
  totalConjectures: number;
  totalDefinitions: number;
  totalSorry: number;
  totalAxiom: number;
  skippedGeneratedFiles: string[];
  millenniumProblems: Array<{
    name: string;
    filePath: string;
    line: number;
    type: "axiom" | "theorem" | "conjecture";
  }>;
  todoItems: Array<{
    filePath: string;
    line: number;
    content: string;
  }>;
}

/** Remove line/nested block comments while preserving strings and line numbers. */
export function stripLeanComments(content: string): string {
  const cleaned: string[] = [];
  let blockDepth = 0;
  let inString = false;
  for (const line of content.split("\n")) {
    let output = "";
    let i = 0;
    while (i < line.length) {
      const pair = line.slice(i, i + 2);
      const char = line[i];
      if (blockDepth > 0) {
        if (pair === "/-") {
          blockDepth += 1;
          i += 2;
        } else if (pair === "-/") {
          blockDepth -= 1;
          i += 2;
        } else {
          i += 1;
        }
        continue;
      }
      if (inString) {
        output += char;
        if (char === "\\" && i + 1 < line.length) {
          output += line[i + 1];
          i += 2;
          continue;
        }
        if (char === '"') inString = false;
        i += 1;
        continue;
      }
      if (pair === "--") break;
      if (pair === "/-") {
        blockDepth = 1;
        i += 2;
        continue;
      }
      output += char;
      if (char === '"') inString = true;
      i += 1;
    }
    cleaned.push(output);
  }
  return cleaned.join("\n");
}

function countSorryTokens(line: string): number {
  const withoutStrings = line.replace(/"(?:\\.|[^"\\])*"/g, '""');
  return (withoutStrings.match(/\bsorry\b/g) || []).length;
}

/** Parse text only; no Lean compiler or proof checker is invoked. */
export function parseLeanFile(filePath: string, content: string): LeanModule {
  const rawLines = content.split("\n");
  const lines = stripLeanComments(content).split("\n");
  const fileName = filePath.split(/[\\/]/).pop() || filePath;

  const leanModule: LeanModule = {
    fileName,
    filePath,
    totalLines: rawLines.length,
    theorems: [],
    definitions: [],
    sorryCount: 0,
    todoCount: 0,
    imports: [],
    namespace: "",
    moduleDescription: "",
    analysisMode: "text_only_not_compiled",
  };

  const descriptionLines: string[] = [];
  let i = 0;
  while (i < rawLines.length && (rawLines[i].trim().startsWith("/-") || rawLines[i].trim().startsWith("-") || rawLines[i].trim() === "-/" || rawLines[i].trim() === "")) {
    if (rawLines[i].trim().startsWith("-")) {
      descriptionLines.push(rawLines[i].trim().replace(/^-\s*/, ""));
    }
    i++;
  }
  leanModule.moduleDescription = descriptionLines.join(" ").trim();

  for (const line of lines) {
    const importMatch = line.match(/^import\s+(.+)$/);
    if (importMatch) leanModule.imports.push(importMatch[1].trim());
    const namespaceMatch = line.match(/^namespace\s+(\S+)/);
    if (namespaceMatch) leanModule.namespace = namespaceMatch[1];
  }

  const theoremPattern = /^(?:(?:noncomputable|private|protected|partial|unsafe)\s+)*(theorem|lemma|def|axiom|conjecture|structure|inductive|instance)\s+([^\s:({\[]+)/;
  const docPattern = /^\/---?\s*(.*)/;
  let pendingDocLines: string[] = [];
  let currentBlock: {
    name: string;
    type: LeanTheorem["type"];
    lineStart: number;
    lines: string[];
    docLines: string[];
  } | null = null;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmed = line.trim();
    const rawTrimmed = rawLines[lineIdx].trim();
    const docMatch = rawTrimmed.match(docPattern);
    if (docMatch) {
      pendingDocLines.push(docMatch[1]);
      continue;
    }

    if (/^example\b/.test(trimmed)) {
      if (currentBlock) finalizeBlock(currentBlock, leanModule);
      currentBlock = null;
      continue;
    }

    const match = trimmed.match(theoremPattern);
    if (match) {
      if (currentBlock) finalizeBlock(currentBlock, leanModule);
      currentBlock = {
        name: match[2],
        type: match[1] as LeanTheorem["type"],
        lineStart: lineIdx + 1,
        lines: [line],
        docLines: pendingDocLines,
      };
      pendingDocLines = [];
      continue;
    }

    if (currentBlock) {
      currentBlock.lines.push(line);
      if (trimmed.startsWith("end ")) {
        finalizeBlock(currentBlock, leanModule);
        currentBlock = null;
      }
    }
  }

  // 处理最后一个 block
  if (currentBlock) {
    finalizeBlock(currentBlock, leanModule);
  }

  const finalizedTheorems: LeanTheorem[] = [];
  for (const theorem of leanModule.theorems) {
    const actualBlock = lines.slice(theorem.lineStart - 1, theorem.lineEnd);
    const sorryLines: number[] = [];
    let sorryCount = 0;
    for (let k = 0; k < actualBlock.length; k++) {
      const count = countSorryTokens(actualBlock[k]);
      if (count > 0) {
        sorryLines.push(theorem.lineStart + k);
        sorryCount += count;
      }
    }
    finalizedTheorems.push({
      ...theorem,
      statement: extractStatement(actualBlock),
      hasSorry: sorryCount > 0,
      sorryCount,
      sorryLines,
      proofStrategy: theorem.proofStrategy.trim(),
    });
  }
  leanModule.theorems = finalizedTheorems;

  // Global code-token count also covers definitions and anonymous examples.
  leanModule.sorryCount = lines.reduce((sum, line) => sum + countSorryTokens(line), 0);

  leanModule.definitions = leanModule.theorems.filter(
    (t) => t.type === "def" || t.type === "structure" || t.type === "inductive" || t.type === "instance"
  );
  leanModule.theorems = leanModule.theorems.filter(
    (t) => t.type === "theorem" || t.type === "lemma" || t.type === "axiom" || t.type === "conjecture"
  );

  return leanModule;
}

function finalizeBlock(
  block: { name: string; type: LeanTheorem["type"]; lineStart: number; lines: string[]; docLines: string[] },
  leanModule: LeanModule
) {
  const lineEnd = block.lineStart + block.lines.length - 1;
  const content = block.lines.join("\n");
  const sorryCount = block.lines.reduce((sum, line) => sum + countSorryTokens(line), 0);
  const millenniumEvidence = [content, block.docLines.join(" "), leanModule.filePath].join("\n");
  const isMillennium =
    /Millennium\s*(Prize)?\s*(Problem|Problems)/i.test(millenniumEvidence) ||
    /Clay\s*Mathematics/i.test(millenniumEvidence) ||
    /千年\s*难题/i.test(millenniumEvidence);

  leanModule.theorems.push({
    name: block.name,
    type: block.type,
    lineStart: block.lineStart,
    lineEnd,
    statement: content.substring(0, Math.min(200, content.length)),
    proofStrategy: block.docLines.join(" "),
    hasSorry: sorryCount > 0,
    sorryCount,
    sorryLines: [],
    isMillennium,
  });
}

function extractStatement(blockLines: string[]): string {
  // 提取声明部分（:= by 之前的文本）
  const fullText = blockLines.join("\n");
  const byMatch = fullText.match(/(:=\s*by\b)/);
  if (byMatch) {
    return fullText.substring(0, byMatch.index!).trim();
  }
  const whereMatch = fullText.match(/(:=\s*\{)/);
  if (whereMatch) {
    return fullText.substring(0, whereMatch.index!).trim();
  }
  // 对于 axiom/def 没有 by
  const simpleMatch = fullText.match(/(:=\s*)/);
  if (simpleMatch) {
    return fullText.substring(0, simpleMatch.index!).trim();
  }
  return fullText.substring(0, Math.min(300, fullText.length)).trim();
}

/**
 * 从 Lean 代码中提取 TODO(research) 项
 */
export function extractTODOs(filePath: string, content: string): Array<{ filePath: string; line: number; content: string }> {
  const lines = content.split("\n");
  const todos: Array<{ filePath: string; line: number; content: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/TODO\(research\)[\s:]?(.*)/i);
    if (match) {
      todos.push({
        filePath,
        line: i + 1,
        content: match[1].trim(),
      });
    }
  }
  return todos;
}

/**
 * 解析整个 TOE-SYLVA 项目的 Lean 文件
 */
export function parseSYLVAProject(files: Array<{ path: string; content: string }>): ParsedSYLVA {
  const result: ParsedSYLVA = {
    modules: [],
    totalTheorems: 0,
    totalConjectures: 0,
    totalDefinitions: 0,
    totalSorry: 0,
    totalAxiom: 0,
    skippedGeneratedFiles: [],
    millenniumProblems: [],
    todoItems: [],
  };

  for (const file of files) {
    if (!file.path.endsWith(".lean")) continue;
    const fileName = file.path.split(/[\\/]/).pop() || file.path;
    if (/^SYLVA_Proven.*R\d+M\d+\.lean$/i.test(fileName)) {
      result.skippedGeneratedFiles.push(file.path);
      continue;
    }
    const leanModule = parseLeanFile(file.path, file.content);
    result.modules.push(leanModule);
    result.totalTheorems += leanModule.theorems.filter(
      (t) => t.type === "theorem" || t.type === "lemma"
    ).length;
    result.totalConjectures += leanModule.theorems.filter((t) => t.type === "conjecture").length;
    result.totalDefinitions += leanModule.definitions.length;
    result.totalSorry += leanModule.sorryCount;
    result.totalAxiom += leanModule.theorems.filter((t) => t.type === "axiom").length;

    for (const t of leanModule.theorems) {
      if (t.isMillennium) {
        result.millenniumProblems.push({
          name: t.name,
          filePath: leanModule.filePath,
          line: t.lineStart,
          type: t.type === "axiom" ? "axiom" : t.type === "conjecture" ? "conjecture" : "theorem",
        });
      }
    }

    result.todoItems.push(...extractTODOs(file.path, file.content));
  }

  return result;
}

/**
 * 生成 ResearchModule 同步数据
 */
export function generateModuleSyncData(leanModule: LeanModule): {
  name: string;
  displayName: string;
  category: string;
  subcategory: string;
  discipline: string;
  lineCount: number;
  sorryCount: number;
  theoremCount: number;
  definitionCount: number;
  filePath: string;
  dependencies: string;
} {
  return {
    name: leanModule.fileName.replace(/\.lean$/, ""),
    displayName: leanModule.fileName,
    category: leanModule.theorems.some((t) => t.isMillennium) ? "Millennium_Problem" : "SYLVA_Module",
    subcategory: leanModule.namespace || "sylva",
    discipline: leanModule.filePath.includes("Hodge")
      ? "algebraic_geometry"
      : leanModule.filePath.includes("NavierStokes")
      ? "pde"
      : leanModule.filePath.includes("Complexity")
      ? "computational_complexity"
      : leanModule.filePath.includes("Riemann")
      ? "number_theory"
      : "mathematics",
    lineCount: leanModule.totalLines,
    sorryCount: leanModule.sorryCount,
    theoremCount: leanModule.theorems.filter((t) => t.type === "theorem" || t.type === "lemma").length,
    definitionCount: leanModule.definitions.length,
    filePath: leanModule.filePath,
    dependencies: JSON.stringify(leanModule.imports),
  };
}

/** Generate sync data with explicit text-scan status, never a proof claim. */
export function generateTheoremSyncData(
  theorem: LeanTheorem,
  moduleId: string
): {
  name: string;
  statement: string;
  moduleId: string;
  status: string;
  proofStrategy: string;
  leanCode: string;
} {
  return {
    name: theorem.name,
    statement: theorem.statement,
    moduleId,
    status: theorem.type === "axiom"
      ? "axiom"
      : theorem.type === "conjecture"
      ? "conjecture"
      : theorem.hasSorry
      ? "research"
      : "parsed",
    proofStrategy: theorem.proofStrategy,
    leanCode: `${theorem.name} (${theorem.type}): ${theorem.statement}`,
  };
}

/**
 * 生成 AcademicTask 同步数据（用于 sorry 跟踪）
 */
export function generateTaskForSorry(
  theorem: LeanTheorem,
  moduleName: string,
  workshopId: string | null,
  pipelineId: string | null
): {
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  targetModule: string;
  targetPaper: string;
  workshopId: string | null;
  pipelineId: string | null;
} {
  const priority = theorem.isMillennium ? "critical" : theorem.sorryCount > 3 ? "high" : "normal";
  return {
    title: `证明 ${theorem.name} (${theorem.sorryCount} 个 sorry)`,
    description: `模块 ${moduleName} 中的定理 ${theorem.name} 需要完成 ${theorem.sorryCount} 个 sorry 的证明。` +
      (theorem.proofStrategy ? ` 已知策略: ${theorem.proofStrategy}` : "") +
      (theorem.isMillennium ? " [Millennium Problem]" : ""),
    type: theorem.type === "axiom" ? "verify" : "prove",
    status: "pending",
    priority,
    targetModule: moduleName,
    targetPaper: theorem.name,
    workshopId,
    pipelineId,
  };
}

/**
 * 生成 LLM 分析提示词（用于分析 sorry 的证明策略）
 */
export function generateSorryAnalysisPrompt(
  theorem: LeanTheorem,
  moduleDescription: string
): string {
  return `请分析以下 Lean 4 定理中的 sorry，并提供详细的证明策略：

**定理**: ${theorem.name}
**类型**: ${theorem.type}
**模块描述**: ${moduleDescription}
**已有策略注释**: ${theorem.proofStrategy || "无"}

**定理声明**:
${theorem.statement}

**sorry 数量**: ${theorem.sorryCount}

请提供：
1. 该定理的数学背景解释
2. 每个 sorry 对应的证明步骤
3. 建议使用的 Lean 4 tactics
4. 相关数学定理/引理的引用
5. 证明难度评估（1-10）

请以结构化格式输出。`;
}
