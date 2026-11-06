export interface ScenarioWorkItem {
  id: string;
  title: string;
  kind: "retrieve" | "verify" | "request" | "review" | "compute" | "publish";
  integration: string;
  purpose: string;
}

export interface ResearchScenario {
  id: string;
  title: string;
  problem: string;
  outcome: string;
  requiredInputs: string[];
  evidenceBoundaries: string[];
  workItems: ScenarioWorkItem[];
  collaboration: {
    retrieval: string;
    verification: string;
    review: string;
    delivery: string;
  };
}

export const RESEARCH_SCENARIOS: ResearchScenario[] = [
  {
    id: "protocol-rescue",
    title: "实验协议求援与证据回填",
    problem: "数据库活性值可读，但原始实验条件、表格或数据血缘不完整。",
    outcome: "形成可追踪的作者求援、线索、回执、原文、协议和发布闭环；未取得证据时不升级结论。",
    requiredInputs: ["文档 ID 或 DOI", "题名", "公开学术联系渠道（如有）"],
    evidenceBoundaries: [
      "论坛帖和搜索摘要只登记为 lead，不冒充原文。",
      "作者回复或平台回执只证明沟通状态，不等于实验协议。",
      "只有带来源定位与原文引用的 full_text／protocol 才进入相应计数。",
    ],
    workItems: [
      { id: "source-scan", title: "核对文档身份与现有原文范围", kind: "retrieve", integration: "GET /api/graphrag/documents", purpose: "先确认是哪一篇，避免把同年同数值候选串错。" },
      { id: "author-request", title: "通过公开渠道申请方法与表格", kind: "request", integration: "POST /api/research/protocol-requests/:id/receipts", purpose: "合并求援、减少打扰，并保存发送事实而非假定送达。" },
      { id: "evidence-intake", title: "登记全文片段、协议和未决缺口", kind: "verify", integration: "POST /api/research/protocol-requests/:id/evidence", purpose: "区分线索、摘要、片段、全文与完整协议。" },
      { id: "panel-review", title: "实验、血缘与反方三角色复核", kind: "review", integration: "POST /api/research/protocol-requests/:id/review", purpose: "让 ProviderPool 集群复核材料，但禁止模型自行晋升证据。" },
      { id: "publication", title: "同步论文、组件和可重放审计", kind: "publish", integration: "garden-widgets + frontier-breakthrough", purpose: "只发布实际取得的证据与保留的限制。" },
    ],
    collaboration: {
      retrieval: "公开出版方、PubMed、机构仓储、BindingDB、论坛线索",
      verification: "ChEMBL／结构／活性专用检查脚本",
      review: "assay-specialist + provenance-auditor + skeptical-reviewer",
      delivery: "方法审计 JSON、研究论文、只读组件",
    },
  },
  {
    id: "assay-comparability",
    title: "跨文献活性与方法可比性审计",
    problem: "相同或不同的 Ki／IC50 被直接合并，可能掩盖方法差异与伪重复。",
    outcome: "输出文档内配对、方法矩阵、血缘独立性和禁止合并条件，而非虚构精确均值。",
    requiredInputs: ["化合物与靶点", "文档及 assay 标识", "活性类型、数值和单位"],
    evidenceBoundaries: [
      "potential_duplicate 是血缘提示，不是造假证明。",
      "BindingDB 的 Curated by ChEMBL 不是独立实验。",
      "方法不足时不做荟萃合并或普适选择性常数。",
    ],
    workItems: [
      { id: "activity-pairs", title: "构建文档内活性配对", kind: "compute", integration: "frontier-breakthrough/scripts/analyze_ca_document_stability.py", purpose: "保留原始值、方向与单位。" },
      { id: "method-matrix", title: "建立 assay 与物种／构建矩阵", kind: "verify", integration: "GET /api/research/method-lineage?requestId=<id>", purpose: "只用目标原始协议字段比较，缺失与冲突不得由外部方法补齐。" },
      { id: "independence-review", title: "审查参考值血缘与伪重复", kind: "review", integration: "POST /api/research/protocol-requests/:id/review", purpose: "把同库转录、历史引用与独立湿实验分开，保留正常结束状态。" },
      { id: "sensitivity-output", title: "发布范围与不可合并边界", kind: "publish", integration: "widgets/ca-activity", purpose: "用反例和负结果约束后续建模。" },
    ],
    collaboration: {
      retrieval: "ChEMBL + BindingDB + 原始表格",
      verification: "单位、方向和文档内比值重算",
      review: "enzymology + curation-lineage + statistics",
      delivery: "方法敏感性报告与配对组件",
    },
  },
  {
    id: "structure-sequence-control",
    title: "结构—序列构建与独立重复鉴别",
    problem: "同一蛋白的多个 PDB 结构被误当成同一野生型构建的独立重复。",
    outcome: "给出构建差异、配体身份、序列对齐和能否作为活性重复的明确边界。",
    requiredInputs: ["PDB ID", "UniProt accession", "目标配体或实验问题"],
    evidenceBoundaries: [
      "分辨率更高不代表构建相同。",
      "结构对照不自动等于 Ki 或湿实验重复。",
      "序列字符串长度与元数据不一致必须保留。",
    ],
    workItems: [
      { id: "entity-check", title: "核对物种、实体、配体和实验方法", kind: "retrieve", integration: "PDB + UniProt 快照", purpose: "先排除非同蛋白、非目标配体和不同物种。" },
      { id: "alignment", title: "执行全长序列对齐", kind: "compute", integration: "frontier-breakthrough/scripts/analyze_structural_control.py", purpose: "列出缺失、替换、插入和索引约定。" },
      { id: "construct-review", title: "判断对照与独立的证据类型", kind: "review", integration: "POST /api/research/validations", purpose: "不把不同构建写成独立野生型重复。" },
      { id: "structure-output", title: "发布构建对照与待核字段", kind: "publish", integration: "widgets/structure-control", purpose: "保留全部差异而不是只展示相似度。" },
    ],
    collaboration: {
      retrieval: "RCSB PDB + UniProt + 原始结构论文",
      verification: "全长对齐与配体身份检查",
      review: "structural-biology + sequence-curation",
      delivery: "构建对照报告和差异组件",
    },
  },
  {
    id: "law-discovery",
    title: "数据驱动规律与物理参数出生证",
    problem: "单段数据拟合被误称为普适规律，自由参数缺乏实体对应。",
    outcome: "形成候选生成、单位检查、留出验证、跨条件检验和负结果登记的完整链条。",
    requiredInputs: ["真实数据及来源", "候选对象或现象", "参数与量纲定义"],
    evidenceBoundaries: [
      "训练集 R² 不是普适性证明。",
      "已知答案合成基准只验证引擎，不是自然发现。",
      "无对应实体的自由参数不得包装成物理定律。",
    ],
    workItems: [
      { id: "data-audit", title: "固定数据来源、单位与排除项", kind: "retrieve", integration: "POST /api/graphrag/documents", purpose: "先记录数据血缘与测量条件。" },
      { id: "candidate-search", title: "生成稀疏候选与参数出生证", kind: "compute", integration: "PySINDy／RDKit／PyMatGen 隔离环境", purpose: "区分已知答案验证与真实数据发现。" },
      { id: "holdout-test", title: "执行留出与跨条件反证", kind: "verify", integration: "POST /api/research/validations", purpose: "用未参与拟合的数据和负结果约束推广。" },
      { id: "law-output", title: "登记规律、参数和失效域", kind: "publish", integration: "POST /api/research/law-packages", purpose: "保留参数实体、基线和适用范围。" },
    ],
    collaboration: {
      retrieval: "实验数据 + 官方数据库 + 文献",
      verification: "稀疏辨识、量纲、留出与跨条件检查",
      review: "domain-expert + statistics + adversarial-referee",
      delivery: "规律包、负结果和下一项实验",
    },
  },
  {
    id: "proof-budget",
    title: "数学证明成本与形式化审计",
    problem: "把证明长度、调用费用或模型跑分误当成数学层级与真理等级。",
    outcome: "把命题难度、证明成本、计算资源、验证强度和未证状态分账。",
    requiredInputs: ["命题与当前证明状态", "候选工具或证明路径", "预算与验收标准"],
    evidenceBoundaries: [
      "API 费用是工程成本，不是数学真理性或固有层级。",
      "UNSAT／编译通过只覆盖明确约束和实现环境。",
      "模型生成的证明必须经独立检查或形式化验证。",
    ],
    workItems: [
      { id: "claim-normalize", title: "规范化命题与假设边界", kind: "retrieve", integration: "POST /api/ontology/extract", purpose: "避免把不同命题或不同强度混为一谈。" },
      { id: "proof-attempt", title: "生成候选证明或反例", kind: "review", integration: "POST /api/research/competitions/:id/rounds (mode=certificate)", purpose: "构造者独立工作，反方审查范围，确定性程序裁决证书，禁止随机评分。" },
      { id: "formal-check", title: "运行形式化与已知答案检查", kind: "verify", integration: "Z3／Lean／自定义验证脚本", purpose: "把编译、公理依赖和 sorry 分开记录。" },
      { id: "budget-ledger", title: "记录成本、失败与未决状态", kind: "publish", integration: "POST /api/research/validations", purpose: "费用只用于资源规划，不晋升数学结论。" },
    ],
    collaboration: {
      retrieval: "命题文献 + 形式化库 + 既有反例",
      verification: "约束求解、编译与公理审计",
      review: "constructive-prover + counterexample-referee + proof-engineer",
      delivery: "证明成本账本与机器可核证据",
    },
  },
  {
    id: "toe-adjudication",
    title: "TOE 矛盾、参数与判决实验图谱",
    problem: "不同 TOE 的术语和预测互相冲突，却被宣传式合并或互相吞并。",
    outcome: "把不可通约概念、共享经验结构、参数来源、矛盾预测和判决实验显式分开。",
    requiredInputs: ["至少两个理论或模块", "参数与定义", "各自预测和证据范围"],
    evidenceBoundaries: [
      "术语相同不代表对象相同，术语不同也不自动构成新物理。",
      "矛盾必须落到可测条件，不以辩论胜负代替实验。",
      "战略实验设施不可用时，只提供判据、数据质量和轻量验证，不虚构合作。",
    ],
    workItems: [
      { id: "concept-map", title: "建立概念—参数—实体映射", kind: "retrieve", integration: "POST /api/ontology/extract", purpose: "找出不可通约定义与共享经验对象。" },
      { id: "prediction-matrix", title: "列出分歧预测和共存条件", kind: "compute", integration: "POST /api/research/tasks", purpose: "把理论冲突转成具体、带条件的预测。" },
      { id: "adversarial-review", title: "组织互证与反方评审", kind: "review", integration: "POST /api/research/panels", purpose: "同时检查各理论自身自洽与跨理论可比性。" },
      { id: "decision-protocol", title: "发布判决实验与退出条件", kind: "publish", integration: "POST /api/research/validations", purpose: "明确什么结果会改变各自的支持与降级状态。" },
    ],
    collaboration: {
      retrieval: "各方原文、代码、数据和公开评论",
      verification: "量纲、参数、独立复算与反例",
      review: "theory-A + theory-B + measurement-referee",
      delivery: "矛盾图谱、判决协议和负结果",
    },
  },
];

export function getScenario(id: string) {
  return RESEARCH_SCENARIOS.find((scenario) => scenario.id === id);
}
