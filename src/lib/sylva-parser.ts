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
  definitions: LeanTheorem[];  // 共享类型，但逻辑上是定义
  sorryCount: number;
  todoCount: number;
  imports: string[];
  namespace: string;
  moduleDescription: string;  // 从文件顶部注释提取
}

export interface ParsedSYLVA {
  modules: LeanModule[];
  totalTheorems: number;
  totalDefinitions: number;
  totalSorry: number;
  totalAxiom: number;
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

/**
 * 解析单个 Lean 文件
 */
export function parseLeanFile(filePath: string, content: string): LeanModule {
  const lines = content.split("\n");
  const fileName = filePath.split("/").pop() || filePath.split("\\").pop() || filePath;

  const module: LeanModule = {
    fileName,
    filePath,
    totalLines: lines.length,
    theorems: [],
    definitions: [],
    sorryCount: 0,
    todoCount: 0,
    imports: [],
    namespace: "",
    moduleDescription: "",
  };

  // 提取文件描述（顶部注释）
  const descriptionLines: string[] = [];
  let i = 0;
  while (i < lines.length && (lines[i].trim().startsWith("/-") || lines[i].trim().startsWith("-") || lines[i].trim() === "-/" || lines[i].trim() === "")) {
    if (lines[i].trim().startsWith("-")) {
      descriptionLines.push(lines[i].trim().replace(/^-\s*/, ""));
    }
    i++;
  }
  module.moduleDescription = descriptionLines.join(" ").trim();

  // 提取 imports
  for (const line of lines) {
    const importMatch = line.match(/^import\s+(.+)$/);
    if (importMatch) {
      module.imports.push(importMatch[1].trim());
    }
    const namespaceMatch = line.match(/^namespace\s+(\S+)/);
    if (namespaceMatch) {
      module.namespace = namespaceMatch[1];
    }
  }

  // 解析 theorem / lemma / def / axiom / conjecture / structure / inductive / instance
  const theoremPattern = /^(theorem|lemma|def|axiom|conjecture|structure|inductive|instance)\s+(\S+)/;
  const docPattern = /^\/---?\s*(.*)/;

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

    // 文档注释
    if (docPattern.test(trimmed)) {
      const docMatch = trimmed.match(docPattern);
      if (docMatch) {
        if (currentBlock) {
          currentBlock.docLines.push(docMatch[1]);
        }
      }
      continue;
    }

    // 定理/定义声明开始
    const match = trimmed.match(theoremPattern);
    if (match) {
      // 保存前一个 block
      if (currentBlock) {
        finalizeBlock(currentBlock, module);
      }
      currentBlock = {
        name: match[2],
        type: match[1] as LeanTheorem["type"],
        lineStart: lineIdx + 1,
        lines: [line],
        docLines: [],
      };
      continue;
    }

    // 收集 block 内容
    if (currentBlock) {
      currentBlock.lines.push(line);
      // 检测 block 结束：下一行是新的 theorem/def 或者空行后跟 theorem/def
      // 或者当前行是 "end Namespace"
      if (trimmed.startsWith("end ")) {
        finalizeBlock(currentBlock, module);
        currentBlock = null;
      }
    }
  }

  // 处理最后一个 block
  if (currentBlock) {
    finalizeBlock(currentBlock, module);
  }

  // 后处理：更精确地划分 block 边界
  // 使用缩进来检测 block 结束
  const finalizedTheorems: LeanTheorem[] = [];
  for (const t of module.theorems) {
    const blockLines = lines.slice(t.lineStart - 1, t.lineEnd);
    const baseIndent = getBaseIndent(blockLines[0]);
    let endLine = t.lineEnd;
    for (let j = t.lineStart; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() === "") continue;
      if (!l.startsWith(" ") && !l.startsWith("\t")) {
        // 顶行，可能是新的声明
        if (theoremPattern.test(l.trim()) || l.trim().startsWith("end ")) {
          endLine = j;
          break;
        }
      }
    }
    // 重新计算 sorry
    const actualBlock = lines.slice(t.lineStart - 1, endLine);
    const sorryLines: number[] = [];
    let proofStrategy = "";
    for (let k = 0; k < actualBlock.length; k++) {
      const actualLine = actualBlock[k];
      // 提取 sorry 前的注释作为 proofStrategy
      if (/\bsorry\b/.test(actualLine)) {
        sorryLines.push(t.lineStart + k);
        // 向前查找注释
        for (let m = k - 1; m >= Math.max(0, k - 5); m--) {
          const prevLine = actualBlock[m].trim();
          if (prevLine.startsWith("--")) {
            proofStrategy = prevLine.replace(/^--\s*/, "") + " " + proofStrategy;
          } else if (prevLine === "" || prevLine.startsWith("·")) {
            continue;
          } else {
            break;
          }
        }
      }
    }
    finalizedTheorems.push({
      ...t,
      lineEnd: endLine,
      statement: extractStatement(actualBlock),
      hasSorry: sorryLines.length > 0,
      sorryCount: sorryLines.length,
      sorryLines,
      proofStrategy: proofStrategy.trim(),
    });
  }
  module.theorems = finalizedTheorems;

  // 计算统计
  module.sorryCount = module.theorems.reduce((sum, t) => sum + t.sorryCount, 0);

  // 分离 definitions（type 为 def / structure / inductive / instance）
  module.definitions = module.theorems.filter(
    (t) => t.type === "def" || t.type === "structure" || t.type === "inductive" || t.type === "instance"
  );
  module.theorems = module.theorems.filter(
    (t) => t.type === "theorem" || t.type === "lemma" || t.type === "axiom" || t.type === "conjecture"
  );

  return module;
}

function finalizeBlock(
  block: { name: string; type: LeanTheorem["type"]; lineStart: number; lines: string[]; docLines: string[] },
  module: LeanModule
) {
  const lineEnd = block.lineStart + block.lines.length - 1;
  const content = block.lines.join("\n");
  const isMillennium =
    /Millennium\s*(Prize)?\s*(Problem|Problems)/i.test(content) ||
    /Clay\s*Mathematics/i.test(content) ||
    /千年\s*难题/i.test(content);

  module.theorems.push({
    name: block.name,
    type: block.type,
    lineStart: block.lineStart,
    lineEnd,
    statement: content.substring(0, Math.min(200, content.length)),
    proofStrategy: block.docLines.join(" "),
    hasSorry: /\bsorry\b/.test(content),
    sorryCount: (content.match(/\bsorry\b/g) || []).length,
    sorryLines: [],
    isMillennium,
  });
}

function getBaseIndent(line: string): number {
  let count = 0;
  for (const ch of line) {
    if (ch === " " || ch === "\t") count++;
    else break;
  }
  return count;
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
    totalDefinitions: 0,
    totalSorry: 0,
    totalAxiom: 0,
    millenniumProblems: [],
    todoItems: [],
  };

  for (const file of files) {
    if (!file.path.endsWith(".lean")) continue;
    const module = parseLeanFile(file.path, file.content);
    result.modules.push(module);
    result.totalTheorems += module.theorems.length;
    result.totalDefinitions += module.definitions.length;
    result.totalSorry += module.sorryCount;
    result.totalAxiom += module.theorems.filter((t) => t.type === "axiom").length;

    for (const t of module.theorems) {
      if (t.isMillennium || t.type === "axiom") {
        result.millenniumProblems.push({
          name: t.name,
          filePath: module.filePath,
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
export function generateModuleSyncData(module: LeanModule): {
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
    name: module.fileName.replace(/\.lean$/, ""),
    displayName: module.fileName,
    category: "Millennium_Problem",
    subcategory: module.namespace || "sylva",
    discipline: module.filePath.includes("Hodge") 
      ? "algebraic_geometry" 
      : module.filePath.includes("NavierStokes")
      ? "pde"
      : module.filePath.includes("Complexity")
      ? "computational_complexity"
      : module.filePath.includes("Riemann")
      ? "number_theory"
      : "mathematics",
    lineCount: module.totalLines,
    sorryCount: module.sorryCount,
    theoremCount: module.theorems.length,
    definitionCount: module.definitions.length,
    filePath: module.filePath,
    dependencies: JSON.stringify(module.imports),
  };
}

/**
 * 生成 ResearchTheorem 同步数据
 */
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
      : theorem.hasSorry 
      ? "research" 
      : "proven",
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
