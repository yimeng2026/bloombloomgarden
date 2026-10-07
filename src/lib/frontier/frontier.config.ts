/**
 * frontier.config.ts — 前沿吞并引擎监测主题配置
 *
 * 主题 = arXiv 分类 + 关键词表 + TOE-SYLVA 关系标签规则。
 * 标签体系（关系标签，用于 KB 卡与快报筛选）：
 *   - 对接     ：可与 TOE-SYLVA 框架对接（量子引力/涌现时空/信息几何/统一场论等）
 *   - 竞品     ：竞争性统一理论 / 同靶点方案（需跟踪其进展与引用）
 *   - 可形式化 ：Lean/mathlib/Coq/Isabelle 等可纳入形式化流水线
 *   - 可评论   ：值得撰写评论/批注（哲学含义、方法评审、争议性 claim）
 */

export interface FrontierTopic {
  /** 主题 slug（KB 目录名 / API 过滤参数） */
  slug: string;
  /** 展示名 */
  name: string;
  /** arXiv 分类（cat:xxx） */
  categories: string[];
  /** 关键词（arXiv all: 检索 + 关系标签命中依据） */
  keywords: string[];
}

export interface RelationTagRule {
  tag: "对接" | "竞品" | "可形式化" | "可评论";
  /** 命中任一即打标（对 title+abstract 大小写不敏感子串匹配） */
  markers: string[];
}

export const FRONTIER_TOPICS: FrontierTopic[] = [
  {
    slug: "quant-ph",
    name: "量子物理",
    categories: ["quant-ph"],
    keywords: ["entanglement", "quantum information", "decoherence", "quantum gravity", "Hawking radiation", "black hole information"],
  },
  {
    slug: "gr-qc",
    name: "广义相对论与量子宇宙学",
    categories: ["gr-qc"],
    keywords: ["emergent spacetime", "holographic", "dark matter", "quantum gravity", "modified gravity", "information geometry"],
  },
  {
    slug: "hep-th",
    name: "高能理论",
    categories: ["hep-th"],
    keywords: ["unification", "string theory", "AdS/CFT", "swampland", "amplitudes", "quantum field theory"],
  },
  {
    slug: "math-ag",
    name: "代数几何",
    categories: ["math.AG"],
    keywords: ["moduli", "mirror symmetry", "Calabi-Yau", "Hodge", "derived category"],
  },
  {
    slug: "math-nt",
    name: "数论",
    categories: ["math.NT"],
    keywords: ["Riemann zeta", "L-function", "Langlands", "prime gaps", "automorphic"],
  },
  {
    slug: "cs-lo",
    name: "逻辑与形式化",
    categories: ["cs.LO"],
    keywords: ["Lean", "mathlib", "formalization", "formal proof", "theorem prover", "Coq", "Isabelle", "type theory"],
  },
];

/** 关系标签规则（按优先级先后命中，多标签可叠加） */
export const RELATION_TAG_RULES: RelationTagRule[] = [
  {
    tag: "可形式化",
    markers: ["lean", "mathlib", "formalization", "formal proof", "formally verified", "coq", "isabelle", "theorem prover", "proof assistant", "type theory"],
  },
  {
    tag: "竞品",
    markers: ["theory of everything", "unified theory", "grand unified", "unification of all", "final theory", "complete theory of quantum gravity"],
  },
  {
    tag: "对接",
    markers: ["emergent spacetime", "emergence", "holographic", "entanglement entropy", "information geometry", "quantum gravity", "dark matter", "unification", "effective field theory", "swampland", "hawking", "black hole", "entropy", "modular", "zeta", "l-function", "langlands", "mirror symmetry", "calabi-yau", "hodge"],
  },
  {
    tag: "可评论",
    markers: ["consciousness", "philosophy", "interpretation of quantum", "foundations", "fine-tuning", "anthropic", "controversy", "critique", "no-go", "paradox"],
  },
];

/** arXiv API 端点与抓取参数 */
export const ARXIV_API = "http://export.arxiv.org/api/query";
export const ARXIV_HTTPS_API = "https://export.arxiv.org/api/query";
/** 单主题单次最大返回数 */
export const MAX_RESULTS_PER_TOPIC = 25;
/** 主题间礼貌间隔（arXiv 建议 ≥3s；摄取批量取较短 1200ms，失败重试另计） */
export const TOPIC_DELAY_MS = 1200;

/** 数据落盘根目录（相对项目根） */
export const FRONTIER_DATA_DIR = "data/frontier";
export const FRONTIER_KB_DIR = "data/frontier/kb";
