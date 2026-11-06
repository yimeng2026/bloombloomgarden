import type { StructureCard, UsageLabel } from "./types";

function uses(candidate: string, historical: string, analogy: string, rejected: string): UsageLabel[] {
  return [
    { label: candidate, status: "candidate", rationale: "仅在当前约束与映射检验成立后，才可发展为候选模型" },
    { label: historical, status: "historical", rationale: "已有理论用途只说明历史经验，不自动覆盖当前问题" },
    { label: analogy, status: "analogy", rationale: "类比可帮助生成假设，但不能替代定义与验证" },
    { label: rejected, status: "rejected", rationale: "该全称推断缺少必要定义或存在明显反例" },
  ];
}

const CARDS: StructureCard[] = [
  {
    key: "matrix_states",
    signature: "以两个状态索引组织的数组、跃迁振幅、乘法和非对易关系",
    possibleUses: uses("跃迁、状态表示与谱候选", "矩阵力学和算符表示", "把数组当作可视化工具", "任何数组或非对易结构都被直接宣布为量子力学"),
    baselineDifference: "从单一经典轨道转向状态与跃迁的代数关系",
    quickChecks: ["矩阵形状", "对易残差", "谱与不变量", "可观测量映射"],
  },
  {
    key: "hamiltonian_dynamics",
    signature: "能量函数、泊松结构、对称性与演化",
    possibleUses: uses("演化与守恒候选", "经典与量子 Hamiltonian 体系", "把能量函数当记账工具", "写出能量函数就宣称必然守恒"),
    baselineDifference: "用能量和对称性补充纯轨迹拟合",
    quickChecks: ["能量残差", "对称性", "极限", "稳定性"],
  },
  {
    key: "sparse_symbolic_dynamics",
    signature: "在显式候选库中寻找稀疏、可读、可拟合的动力学表达式",
    possibleUses: uses("唯象动力学候选", "SINDy 与符号回归", "把表达式当压缩工具", "留出轨迹上的拟合直接称为自然定律"),
    baselineDifference: "以可读稀疏表达式对照黑箱或高阶拟合",
    quickChecks: ["量纲", "留出误差", "候选基", "外推"],
  },
  {
    key: "causal_poset",
    signature: "具有偏序关系的离散事件集、因果链和集合映射",
    possibleUses: uses("离散因果结构候选", "因果集量子引力", "用偏序图组织假设", "画出偏序就证明时空本质离散"),
    baselineDifference: "以离散事件和偏序补充连续时空描述",
    quickChecks: ["偏序公理", "因果链", "连续极限", "Lorentz 映射"],
  },
  {
    key: "relation_graph",
    signature: "节点、连接、边界、图不变量与网络动力学",
    possibleUses: uses("关系与网络候选", "复杂系统与图模型", "把网络图当思维导图", "网络图直接等同于物理因果图"),
    baselineDifference: "用显式关系替代只列变量和方程",
    quickChecks: ["节点与边定义", "边界", "图不变量", "动力学"],
  },
  {
    key: "symmetry_invariants",
    signature: "群作用、对称变换、守恒量与不变量",
    possibleUses: uses("约束与守恒候选", "Noether 结构与普适分类", "把对称性当简化审美", "形式对称必然对应真实物理对称"),
    baselineDifference: "以不变量压缩候选模型，而非仅增加参数",
    quickChecks: ["群作用", "守恒量", "表示", "对称破缺"],
  },
];

export function listStructureCards(): StructureCard[] {
  return CARDS.map((card) => ({ ...card, possibleUses: card.possibleUses.map((use) => ({ ...use })), quickChecks: [...card.quickChecks] }));
}

export function getStructureCard(key: string): StructureCard | undefined {
  const card = CARDS.find((item) => item.key === key);
  return card ? { ...card, possibleUses: card.possibleUses.map((use) => ({ ...use })), quickChecks: [...card.quickChecks] } : undefined;
}
