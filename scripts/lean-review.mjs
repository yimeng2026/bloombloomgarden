const STANDARD_AXIOMS = ["propext", "Classical.choice", "Quot.sound"];
const PRIORITY = { P1: 1, P2: 2, P3: 3 };

function questionFor(type) {
  const questions = {
    source_commit_changed: "新提交中的定义、证明和外部依赖是否真的改变，还是仅版本推进？",
    source_dirty_changed: "未提交变化是否已完整纳入文件哈希与验证范围？",
    toolchain_changed: "工具链变化是否影响构建可复现性与声明含义？",
    manifest_changed: "构建范围和预期公理为何变化，是否引入或隐藏额外假设？",
    file_added: "新增源文件中的定义与声明应接受哪些语义和边界复核？",
    file_removed: "移除源文件会影响哪些依赖，还是仅缩小了审查范围？",
    build_target_added: "新增构建目标的命题、依赖和适用范围是否准确？",
    build_target_removed: "减少构建目标是否削弱了原有的验证覆盖？",
    build_status_changed: "构建状态变化源于源码、工具链还是环境？",
    build_exit_code_changed: "构建退出码变化的直接技术原因是什么？",
    build_jobs_changed: "构建依赖图和资源消耗变化是否合理？",
    declaration_added: "新增声明的自然语言含义是否与形式定义和证据状态一致？",
    declaration_removed: "移除声明会影响哪些下游依赖，还是仅缩小了审查范围？",
    declaration_dependencies_changed: "依赖增减是否得到真实证明、明确登记或独立复核？",
    declaration_classification_changed: "分类变化是否反映真实证明状态，而不是表述调整？",
    validation_result_count_changed: "验证数量变化对应哪些具体执行记录和覆盖范围？",
    research_task_status_changed: "研究任务状态是否有可回读的执行证据支撑？",
  };
  return questions[type] || "这项执行证据变化需要怎样的独立语义与技术复核？";
}

function priorityFor(change) {
  const after = change.after;
  if (change.type === "declaration_dependencies_changed") {
    if (after.includes("sorryAx")) return "P1";
    return after.some((axiom) => !STANDARD_AXIOMS.includes(axiom)) ? "P1" : "P2";
  }
  if (change.type === "source_dirty_changed") return after === true ? "P1" : "P2";
  if (change.type === "build_status_changed") return after !== "success" ? "P1" : "P2";
  if (change.type === "build_exit_code_changed") return after !== 0 ? "P1" : "P2";
  if (change.type === "declaration_added" || change.type === "declaration_classification_changed") {
    return after === "declared_axiom_debt" ? "P1" : "P2";
  }
  if (["source_commit_changed", "build_jobs_changed", "validation_result_count_changed", "research_task_status_changed"].includes(change.type)) {
    return "P3";
  }
  return "P2";
}

export function createLeanReview(comparison) {
  if (!comparison.hasChanges) {
    return {
      requiresHumanReview: false,
      summary: { P1: 0, P2: 0, P3: 0, total: 0 },
      reviewQueue: [],
      semanticReview: "no recorded execution-evidence changes require review",
    };
  }
  const queue = comparison.changes.map((change) => ({
    priority: priorityFor(change),
    category: change.type,
    subject: change.subject || "repository",
    question: questionFor(change.type),
    evidence: change,
  })).sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority]
    || a.subject.localeCompare(b.subject)
    || a.category.localeCompare(b.category))
    .map((item, index) => ({ id: `R-${String(index + 1).padStart(3, "0")}`, ...item }));
  const count = (priority) => queue.filter((item) => item.priority === priority).length;
  return {
    requiresHumanReview: queue.length > 0,
    summary: {
      P1: count("P1"),
      P2: count("P2"),
      P3: count("P3"),
      total: queue.length,
    },
    priorityMeaning: {
      P1: "urgent evidence or assumption review; not automatic falsification",
      P2: "required semantic, dependency or coverage review",
      P3: "metadata, resource or accounting review",
    },
    reviewQueue: queue,
    semanticReview: "priority only orders human review; it does not prove or refute mathematical or physical claims",
  };
}
