// ================================================================
// BloomBloomGarden 工具注册表 — 真实工具调用层
// ================================================================

import { search } from "duck-duck-scrape";
import yahooFinance from "yahoo-finance2";
// child_process 在客户端不可用，动态导入
const execSync = async (cmd: string, opts: any) => {
  const cp = await import("child_process");
  return cp.execSync(cmd, opts);
};

// ===================== 工具类型定义 =====================

export type ToolName =
  | "web-search"
  | "market-data"
  | "code-exec"
  | "web-scraper"
  | "github"
  | "pdf-parser"
  | "chart-gen"
  | "sql-query"
  | "knowledge-graph"
  | "ontology";

export interface ToolDefinition {
  name: ToolName;
  description: string;
  params: Record<string, string>; // paramName -> type description
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

// ===================== 工具实现 =====================

/**
 * WebSearch - 使用 DuckDuckGo 搜索
 * @param params.query - 搜索关键词
 */
async function WebSearch(params: Record<string, unknown>): Promise<string> {
  const query = typeof params.query === "string" ? params.query : "";
  if (!query.trim()) return "错误：缺少搜索关键词（query）";

  try {
    const results = await search(query, { safeSearch: 0 });
    if (!results?.results?.length) {
      return `未找到 "${query}" 的搜索结果。`;
    }

    const top = results.results.slice(0, 5);
    const summary = top
      .map(
        (r, i) =>
          `${i + 1}. ${r.title}\n   链接: ${r.url}\n   摘要: ${r.description?.slice(0, 200) || "无摘要"}`
      )
      .join("\n\n");

    return `搜索 "${query}" 的结果（共 ${results.results.length} 条，展示前 ${top.length} 条）：\n\n${summary}`;
  } catch (err) {
    return `WebSearch 错误：${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * MarketData - 使用 Yahoo Finance 获取股票行情
 * @param params.symbol - 股票代码（如 AAPL, TSLA, 600519.SS）
 */
async function MarketData(params: Record<string, unknown>): Promise<string> {
  const symbol = typeof params.symbol === "string" ? params.symbol : "";
  if (!symbol.trim()) return "错误：缺少股票代码（symbol）";

  try {
    const quote = await yahooFinance.quote(symbol);
    if (!quote) {
      return `未找到股票 "${symbol}" 的行情数据。`;
    }

    const q = quote as Record<string, unknown>;
    const fields = [
      ["股票代码", q.symbol],
      ["名称", q.shortName || q.longName],
      ["当前价格", q.regularMarketPrice],
      ["涨跌幅", q.regularMarketChangePercent],
      ["成交量", q.regularMarketVolume],
      ["市值", q.marketCap],
      ["52周最高", q.fiftyTwoWeekHigh],
      ["52周最低", q.fiftyTwoWeekLow],
      ["市盈率(TTM)", q.trailingPE],
    ];

    const summary = fields
      .map(([label, val]) => {
        if (val === undefined || val === null) return null;
        let formatted = String(val);
        if (label === "涨跌幅" && typeof val === "number") {
          formatted = `${val > 0 ? "+" : ""}${val.toFixed(2)}%`;
        } else if (
          (label === "当前价格" || label === "52周最高" || label === "52周最低") &&
          typeof val === "number"
        ) {
          formatted = val.toFixed(2);
        } else if (label === "成交量" && typeof val === "number") {
          formatted = val.toLocaleString();
        } else if (label === "市值" && typeof val === "number") {
          formatted = `${(val / 1e9).toFixed(2)}B`;
        }
        return `${label}: ${formatted}`;
      })
      .filter(Boolean)
      .join("\n");

    return `【${symbol} 实时行情】\n${summary}\n\n数据来源: Yahoo Finance`;
  } catch (err) {
    return `MarketData 错误：${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * CodeExecutor - 执行代码（Python 或 Node.js）
 * @param params.code - 代码内容
 * @param params.language - 语言（python 或 node，默认 python）
 */
async function CodeExecutor(params: Record<string, unknown>): Promise<string> {
  const code = typeof params.code === "string" ? params.code : "";
  const lang = typeof params.language === "string" ? params.language : "python";

  if (!code.trim()) return "错误：缺少代码内容（code）";

  try {
    let output: Buffer;
    const cp = await import("child_process");
    if (lang === "python" || lang === "py") {
      output = cp.execSync(`python -c "${code.replace(/"/g, "\\\"").replace(/\n/g, "; ")}"`, {
        timeout: 10000,
        encoding: "buffer",
      });
    } else if (lang === "node" || lang === "javascript" || lang === "js") {
      output = cp.execSync(`node -e "${code.replace(/"/g, "\\\"").replace(/\n/g, "; ")}"`, {
        timeout: 10000,
        encoding: "buffer",
      });
    } else {
      return `错误：不支持的语言 "${lang}"，仅支持 python 或 node。`;
    }
    return `代码执行成功（${lang}）：\n\n${output.toString().trim() || "（无输出）"}`;
  } catch (err) {
    return `CodeExecutor 错误：${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * WebScraper - 简单网页抓取
 * @param params.url - 目标 URL
 */
async function WebScraper(params: Record<string, unknown>): Promise<string> {
  const url = typeof params.url === "string" ? params.url : "";
  if (!url.trim()) return "错误：缺少目标 URL（url）";

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!resp.ok) {
      return `抓取失败：HTTP ${resp.status} ${resp.statusText}`;
    }

    const html = await resp.text();

    // 简单提取：去除 script/style 标签，提取文本
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const maxLen = 3000;
    if (text.length > maxLen) {
      text = text.slice(0, maxLen) + `\n\n...[共 ${text.length} 字符，已截断]`;
    }

    return `已抓取 ${url} 的内容：\n\n${text}`;
  } catch (err) {
    return `WebScraper 错误：${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * GitHub - 使用 GitHub API 搜索仓库
 * @param params.query - 搜索关键词
 * @param params.language - 编程语言过滤（可选）
 */
async function GitHub(params: Record<string, unknown>): Promise<string> {
  const query = typeof params.query === "string" ? params.query : "";
  const language = typeof params.language === "string" ? params.language : "";

  if (!query.trim()) return "错误：缺少搜索关键词（query）";

  try {
    const q = language ? `${query}+language:${language}` : query;
    const resp = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=5`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "BloomBloomGarden-Tool",
        },
      }
    );

    if (!resp.ok) {
      return `GitHub API 错误：HTTP ${resp.status} ${resp.statusText}`;
    }

    const data = (await resp.json()) as { items?: Array<Record<string, unknown>> };
    const items = data.items || [];

    if (items.length === 0) {
      return `GitHub 搜索 "${query}" 未找到相关仓库。`;
    }

    const summary = items
      .slice(0, 5)
      .map((repo, i) => {
        const name = repo.full_name || repo.name || "未知";
        const stars = repo.stargazers_count ?? "?";
        const desc = (repo.description as string) || "无描述";
        const url = repo.html_url || "";
        return `${i + 1}. ${name}\n   ⭐ ${stars} | ${desc.slice(0, 120)}\n   ${url}`;
      })
      .join("\n\n");

    return `GitHub 搜索 "${query}" 的结果（展示前 5 个）：\n\n${summary}`;
  } catch (err) {
    return `GitHub 错误：${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * PDFParser - 提取 PDF 文字（基础版，使用 fetch + 简单解析）
 * @param params.url - PDF 文件 URL
 */
async function PDFParser(params: Record<string, unknown>): Promise<string> {
  const url = typeof params.url === "string" ? params.url : "";
  if (!url.trim()) return "错误：缺少 PDF URL（url）";

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return `下载失败：HTTP ${resp.status} ${resp.statusText}`;
    }

    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 简单文本提取：从 PDF 中提取文本流（基础版，非完整解析）
    let text = "";
    const decoder = new TextDecoder("utf-8");
    const raw = decoder.decode(bytes);

    // 提取 PDF 文本流中的基本文本
    const textMatches = raw.matchAll(/\(([^\)]{3,500})\)/g);
    const chunks: string[] = [];
    for (const match of textMatches) {
      const chunk = match[1]
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "")
        .replace(/\\\\/g, "\\")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")");
      if (chunk.trim() && chunk.length > 3) chunks.push(chunk);
    }

    text = chunks.join(" ").replace(/\s+/g, " ").trim();

    if (!text) {
      return `PDF 解析提示：已下载 ${bytes.length} 字节，但基础解析器无法提取文本。\n建议使用专用 PDF 解析库（如 pdf-parse）。`;
    }

    const maxLen = 3000;
    if (text.length > maxLen) {
      text = text.slice(0, maxLen) + `\n\n...[共 ${text.length} 字符，已截断]`;
    }

    return `PDF 文本提取结果：\n\n${text}`;
  } catch (err) {
    return `PDFParser 错误：${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * @param params.query - 查询问题
 */
async function KnowledgeGraph(params: Record<string, unknown>): Promise<string> {
  const query = typeof params.query === "string" ? params.query : "";
  if (!query.trim()) return "错误：缺少查询问题（query）";

  try {
    // 动态导入 GraphRAG 引擎
    const { graphrag } = await import("./graphrag");
    const result = await graphrag.query(query, "mix");
    const sources = result.sources
      .map((s) => `[${s.type}] ${s.name}: ${s.content.slice(0, 100)}`)
      .join("\n");
    return `GraphRAG 查询结果:\n\n${result.answer}\n\n--- 来源 ---\n${sources}`;
  } catch (err) {
    return `KnowledgeGraph 错误：${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * Ontology - 使用 Ontology 引擎进行本体查询和抽取
 * @param params.query - 查询问题或文本内容
 * @param params.schemaId - Ontology Schema ID（可选）
 * @param params.mode - 模式：query（查询）或 extract（抽取）
 */
async function Ontology(params: Record<string, unknown>): Promise<string> {
  const query = typeof params.query === "string" ? params.query : "";
  const schemaId = typeof params.schemaId === "string" ? params.schemaId : "";
  const mode = typeof params.mode === "string" ? params.mode : "query";

  if (!query.trim()) return "错误：缺少查询内容（query）";

  try {
    const { OntologyEngine } = await import("./ontology");
    const engine = new OntologyEngine();

    if (mode === "extract") {
      const result = await engine.extractWithOntology(query, schemaId || "default");
      return `Ontology 抽取结果:\n\n${JSON.stringify(result, null, 2)}`;
    }

    const result = await engine.queryWithOntology(query, schemaId || "default", "hybrid");
    return `Ontology 查询结果:\n\n${JSON.stringify(result, null, 2)}`;
  } catch (err) {
    return `Ontology 错误：${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * ChartGen - 生成图表描述（用于前端渲染）
 * @param params.type - 图表类型（line, bar, pie, area）
 * @param params.data - 数据对象（JSON 字符串或对象）
 * @param params.title - 图表标题
 */
async function ChartGen(params: Record<string, unknown>): Promise<string> {
  const type = typeof params.type === "string" ? params.type : "line";
  const title = typeof params.title === "string" ? params.title : "未命名图表";
  let data: unknown = params.data;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return "错误：data 参数不是有效的 JSON 字符串";
    }
  }

  const validTypes = ["line", "bar", "pie", "area", "scatter", "radar"];
  if (!validTypes.includes(type)) {
    return `错误：不支持的图表类型 "${type}"。支持: ${validTypes.join(", ")}`;
  }

  const chartDesc = `
图表类型: ${type}
标题: ${title}
数据: ${JSON.stringify(data, null, 2)}

说明：此为图表数据描述，前端可使用 recharts / chart.js / echarts 等库渲染。
建议配置：
- 类型: ${type}
- 标题: "${title}"
- 响应式: 是
- 动画: 开启
`.trim();

  return chartDesc;
}

/**
 * SQLQuery - 执行 SQLite 查询（通过 Prisma 的 $queryRaw）
 * @param params.query - SQL 查询语句（仅限 SELECT）
 */
async function SQLQuery(params: Record<string, unknown>): Promise<string> {
  const query = typeof params.query === "string" ? params.query : "";
  if (!query.trim()) return "错误：缺少 SQL 查询（query）";

  // 安全检查：仅允许 SELECT 查询
  const normalized = query.trim().toUpperCase();
  if (!normalized.startsWith("SELECT ")) {
    return "错误：仅支持 SELECT 查询，禁止执行修改数据的操作。";
  }

  try {
    // 动态导入 Prisma 以避免循环依赖和构建问题
    const { prisma } = await import("./prisma");
    const results = await prisma.$queryRawUnsafe<unknown[]>(query);

    if (!results || results.length === 0) {
      return "查询执行成功，返回 0 条记录。";
    }

    const json = JSON.stringify(results, null, 2);
    return `查询执行成功（${results.length} 条记录）：\n\n${json}`;
  } catch (err) {
    return `SQLQuery 错误：${err instanceof Error ? err.message : String(err)}`;
  }
}

// ===================== 工具映射 =====================

const TOOL_MAP: Record<ToolName, (params: Record<string, unknown>) => Promise<string>> = {
  "web-search": WebSearch,
  "market-data": MarketData,
  "code-exec": CodeExecutor,
  "web-scraper": WebScraper,
  "github": GitHub,
  "pdf-parser": PDFParser,
  "chart-gen": ChartGen,
  "sql-query": SQLQuery,
  "knowledge-graph": KnowledgeGraph,
  "ontology": Ontology,
};

// ===================== 工具注册表 =====================

export class ToolRegistry {
  private tools: Map<ToolName, (params: Record<string, unknown>) => Promise<string>> = new Map();

  constructor() {
    // 注册所有内置工具
    for (const [name, fn] of Object.entries(TOOL_MAP)) {
      this.tools.set(name as ToolName, fn);
    }
  }

  /**
   * 注册自定义工具
   */
  register(
    name: ToolName,
    fn: (params: Record<string, unknown>) => Promise<string>
  ): void {
    this.tools.set(name, fn);
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name as ToolName);
  }

  /**
   * 获取所有已注册工具名称
   */
  list(): ToolName[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 执行指定工具
   */
  async execute(name: string, params: Record<string, unknown>): Promise<string> {
    const fn = this.tools.get(name as ToolName);
    if (!fn) {
      return `错误：未找到工具 "${name}"。可用工具：${this.list().join(", ")}`;
    }
    try {
      return await fn(params);
    } catch (err) {
      return `工具执行异常：${err instanceof Error ? err.message : String(err)}`;
    }
  }
}

// ===================== 便捷导出 =====================

/** 全局默认注册表实例 */
export const defaultRegistry = new ToolRegistry();

/**
 * 执行指定工具（便捷函数，使用默认注册表）
 * @param toolName - 工具名称（如 "web-search", "market-data"）
 * @param params - 工具参数
 */
export async function executeTool(
  toolName: string,
  params: Record<string, unknown>
): Promise<string> {
  return defaultRegistry.execute(toolName, params);
}

/**
 * 获取所有可用工具定义（用于 LLM 工具描述）
 */
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: "web-search",
      description: "使用 DuckDuckGo 搜索网页，获取最新信息",
      params: { query: "string // 搜索关键词" },
    },
    {
      name: "market-data",
      description: "使用 Yahoo Finance 获取股票实时行情",
      params: { symbol: "string // 股票代码，如 AAPL, TSLA, 600519.SS" },
    },
    {
      name: "code-exec",
      description: "执行 Python 或 Node.js 代码片段",
      params: {
        code: "string // 代码内容",
        language: "string // 语言：python 或 node（默认 python）",
      },
    },
    {
      name: "web-scraper",
      description: "抓取网页并提取文本内容",
      params: { url: "string // 目标网页 URL" },
    },
    {
      name: "github",
      description: "使用 GitHub API 搜索仓库",
      params: {
        query: "string // 搜索关键词",
        language: "string // 编程语言过滤（可选）",
      },
    },
    {
      name: "pdf-parser",
      description: "从 PDF 文件中提取文本（基础版）",
      params: { url: "string // PDF 文件 URL" },
    },
    {
      name: "chart-gen",
      description: "生成图表数据描述，供前端渲染使用",
      params: {
        type: "string // 图表类型：line, bar, pie, area, scatter, radar",
        data: "object | string // 图表数据（JSON 对象或字符串）",
        title: "string // 图表标题",
      },
    },
    {
      name: "sql-query",
      description: "执行 SQLite SELECT 查询（只读）",
      params: { query: "string // SELECT SQL 语句" },
    },
    {
      name: "knowledge-graph",
      description: "使用 GraphRAG 知识图谱查询已摄入的文档知识",
      params: { query: "string // 查询问题" },
    },
    {
      name: "ontology",
      description: "使用 Ontology 本体引擎进行结构化知识查询和抽取（Palantir 风格）",
      params: {
        query: "string // 查询问题或文本内容",
        schemaId: "string // Ontology Schema ID（可选）",
        mode: "string // query（查询）或 extract（抽取），默认 query",
      },
    },
  ];
}

/** 从 platforms.ts 中的技能 ID 映射到工具名称 */
export function skillToToolName(skillId: string): ToolName | null {
  const map: Record<string, ToolName> = {
    "web-search": "web-search",
    "market-data": "market-data",
    "code-exec": "code-exec",
    "web-scraper": "web-scraper",
    "github": "github",
    "pdf-parser": "pdf-parser",
    "chart-gen": "chart-gen",
    "sql-query": "sql-query",
    "knowledge-graph": "knowledge-graph",
    "ontology": "ontology",
  };
  return map[skillId] || null;
}
