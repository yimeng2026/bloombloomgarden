"""Render the Kimi-only headless architecture diagram for the repository guide."""
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "images" / "kimi-headless-architecture.png"
plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "Noto Sans CJK SC", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False

fig, ax = plt.subplots(figsize=(16, 9), dpi=150)
fig.patch.set_facecolor("#f7f8fc")
ax.set_facecolor("#f7f8fc")
ax.set_xlim(0, 16)
ax.set_ylim(0, 9)
ax.axis("off")

COLORS = {
    "owner": "#eef2ff",
    "garden": "#e0f2fe",
    "service": "#ecfdf5",
    "cluster": "#fff7ed",
    "evidence": "#f5f3ff",
    "edge": "#475569",
}


def box(x, y, w, h, title, lines, color):
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.03,rounding_size=0.12",
        linewidth=1.5,
        edgecolor="#64748b",
        facecolor=color,
    )
    ax.add_patch(patch)
    ax.text(x + w / 2, y + h - 0.32, title, ha="center", va="top", fontsize=14, fontweight="bold", color="#0f172a")
    ax.text(x + w / 2, y + h / 2 - 0.22, "\n".join(lines), ha="center", va="center", fontsize=10.5, color="#334155", linespacing=1.5)


def arrow(x1, y1, x2, y2, text="", rad=0.04, text_xy=None):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", mutation_scale=16, linewidth=1.6, color=COLORS["edge"], connectionstyle=f"arc3,rad={rad}"))
    if text:
        position = text_xy or ((x1 + x2) / 2, (y1 + y2) / 2 + 0.17)
        ax.text(*position, text, ha="center", fontsize=9.5, color="#475569")


ax.text(8, 8.55, "千界花园 · Kimi 专用无界面研究架构", ha="center", fontsize=23, fontweight="bold", color="#0f172a")
ax.text(8, 8.18, "花园负责研究语义与证据；集群只负责模型执行与资源治理", ha="center", fontsize=12, color="#475569")

box(0.6, 6.25, 2.6, 1.2, "研究目标", ["自然语言 / 直接 API", "真实问题与验收条件"], COLORS["owner"])
box(4.2, 6.05, 3.6, 1.6, "Kimi 控制入口", ["操作目录与参数校验", "Bearer 鉴权 / 写入许可", "失败与调用审计"], COLORS["garden"])
box(9.0, 6.25, 2.7, 1.2, "真实功能 API", ["研究 / 群组 / 任务", "工作流 / 知识 / 备份"], COLORS["service"])
box(12.5, 6.05, 2.8, 1.6, "Kimi 集群", ["同 Provider 多节点", "负载 / 并发 / 熔断", "429 退避 / 故障切换"], COLORS["cluster"])

box(2.0, 3.65, 3.5, 1.45, "Next 研究 API", ["论文 / 定理 / 评审", "GraphRAG / arXiv / 本体"], COLORS["service"])
box(6.3, 3.65, 3.5, 1.45, "Express 编排后端", ["Agent / 角色 / 群组", "技能 / 干预 / 工作流"], COLORS["service"])
box(11.7, 3.65, 3.6, 1.45, "Kimi 执行节点", ["同一账户不等于新增配额", "正文与推理字段分离", "无其他供应商隐式 fallback"], COLORS["cluster"])
box(4.6, 1.05, 5.5, 1.45, "研究资产与验证闭环", ["版本化数据 / 代码 / 参数 / 日志", "负例 / 执行测试 / Lean 公理审计 / 独立复核"], COLORS["evidence"])

arrow(3.2, 6.85, 4.2, 6.85, "目标")
arrow(7.8, 6.85, 9.0, 6.85, "仅目录内操作")
arrow(11.7, 6.85, 12.5, 6.85, "执行")
arrow(6.1, 6.05, 4.0, 5.1, "研究读写")
arrow(7.0, 6.05, 7.8, 5.1, "编排读写")
arrow(5.5, 4.35, 11.7, 4.35, "统一模型请求", rad=0.22, text_xy=(8.5, 5.55))
arrow(9.8, 4.35, 11.7, 4.35, "对话 / 工具")
arrow(13.9, 6.05, 14.1, 5.1, "节点调用")
arrow(6.8, 3.65, 6.8, 2.5, "生成物登记")
ax.plot([4.6, 1.1, 1.1, 4.2], [1.75, 1.75, 5.85, 5.85], color=COLORS["edge"], linewidth=1.6)
arrow(4.2, 5.85, 4.2, 6.05)
ax.text(0.75, 4.55, "证据反馈 / 回滚", rotation=90, ha="center", fontsize=9.5, color="#475569")

ax.text(8, 0.38, "原则：先定义可证伪验收条件，再扩大自动化；失败和负面结果进入同一研究记录。", ha="center", fontsize=11, color="#334155")
OUT.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(OUT, bbox_inches="tight", facecolor=fig.get_facecolor())
print(OUT)
