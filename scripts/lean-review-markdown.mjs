import fs from "node:fs";
import path from "node:path";

function code(value) {
  return String(value ?? "").replace(/`/g, "\\`").replace(/\r?\n/g, " ");
}

export function renderLeanReviewMarkdown(result) {
  if (!result.review) throw new Error("Markdown export requires a review result");
  const { before, after, comparison, review } = result;
  const lines = [
    "# Lean 证据差异审查清单",
    "",
    "> 由只读历史比较生成。优先级只安排复核顺序，不自动证明或证伪数学、物理主张。",
    "",
    `- 前一快照：\`${code(before.snapshotId)}\`，提交 \`${code(before.commit)}\`。`,
    `- 后一快照：\`${code(after.snapshotId)}\`，提交 \`${code(after.commit)}\`。`,
    `- 执行证据变化：${comparison.changeCount} 项。`,
    `- 审查优先级：P1 ${review.summary.P1} 项，P2 ${review.summary.P2} 项，P3 ${review.summary.P3} 项。`,
    "",
  ];
  for (const priority of ["P1", "P2", "P3"]) {
    const items = review.reviewQueue.filter((item) => item.priority === priority);
    if (!items.length) continue;
    lines.push(`## ${priority}`, "");
    for (const item of items) {
      lines.push(
        `- [ ] **${code(item.id)} · ${code(item.category)}**`,
        `  - 对象：\`${code(item.subject)}\``,
        `  - 复核问题：${code(item.question)}`,
        `  - 证据：\`${code(JSON.stringify(item.evidence))}\``,
        "",
      );
    }
  }
  if (!review.reviewQueue.length) lines.push("暂无需要人工复核的执行证据变化。", "");
  lines.push(
    "## 审查边界",
    "",
    "- P1 不自动等于错误，P3 也不等于无意义；每项都需要结合源码、推导和实验语境复核。",
    "- 本文件是由比较结果派生的审查清单，不修改任何原始快照、定理状态或验证结论。",
    "- 技术构建和公理审计不能替代数学语义、物理映射与外部独立评审。",
    "",
  );
  return lines.join("\n");
}

export function exportLeanReviewMarkdown({ result, directory, filename }) {
  if (typeof filename !== "string" || !filename.trim()) throw new Error("Markdown filename is required");
  const root = path.resolve(directory);
  const target = path.isAbsolute(filename) ? path.resolve(filename) : path.resolve(root, filename);
  if (path.dirname(target) !== root) throw new Error("Markdown export must stay within the Lean history directory");
  if (!target.endsWith(".md")) throw new Error("Markdown export filename must end with .md");
  const content = renderLeanReviewMarkdown(result);
  fs.mkdirSync(root, { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, content, "utf8");
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
  return target;
}
