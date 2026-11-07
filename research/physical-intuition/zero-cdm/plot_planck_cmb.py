"""Plot the verified Planck CMB zero-minus-baseline likelihood differences."""

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
LIKELIHOODS = [
    "planck_2018_highl_CamSpec2021.TTTEEE",
    "planck_2018_lowl.TT",
    "planck_2018_lowl.EE",
    "planck_2018_lensing.native",
]
LABELS = ["CamSpec TT/TE/EE", "低多极 TT", "低多极 EE", "native 透镜", "总计"]


def values(case, unbounded):
    prefix = "planck-cmb-unbounded-" if unbounded else "planck-cmb-"
    summary = json.loads((OUT / f"{prefix}{case}-summary.json").read_text(encoding="utf-8"))
    comparison = summary["comparison"] if unbounded else summary["comparison"]["profiled_nuisance_posterior"]
    return [comparison["delta_chi_squared_by_likelihood"][name] for name in LIKELIHOODS] + [comparison["delta_chi_squared_total"]]


plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "planck-cmb-v1",
})
fig, axes = plt.subplots(1, 2, figsize=(13, 5.4), sharey=True, constrained_layout=True)
x = np.arange(len(LABELS))
width = 0.36
for ax, case, title in zip(axes, ["hyrec", "recfast"], ["CLASS HyRec", "CLASS RECFAST"]):
    default = values(case, False)
    extended = values(case, True)
    bars1 = ax.bar(x - width / 2, default, width, label="默认 5σ 校准搜索边界", color="#9a6a45")
    bars2 = ax.bar(x + width / 2, extended, width, label="不截断高斯校准（保留先验）", color="#2563a6")
    ax.set_yscale("log")
    ax.set_ylim(0.5, 1.0e8)
    ax.set_xticks(x, LABELS, rotation=18, ha="right")
    ax.set_title(title)
    ax.grid(axis="y", alpha=0.25, which="both")
    for bars in [bars1, bars2]:
        for bar in bars:
            value = bar.get_height()
            ax.annotate(f"{value:.3g}", (bar.get_x() + bar.get_width() / 2, value), xytext=(0, 3), textcoords="offset points", ha="center", fontsize=7)
    ax.legend(frameon=False, fontsize=8, loc="upper left")
axes[0].set_ylabel("零模型 − ΛCDM：Δχ²（对数坐标）")
fig.suptitle("固定宇宙学输入的 Planck 温度／偏振／native 透镜联合诊断\n每模型独立优化前景；不是宇宙学后验或模型族排除", fontsize=12)
figure = OUT / "planck-cmb-comparison.svg"
preview = REPO / ".tmp/planck-cmb-comparison.png"
fig.savefig(figure, bbox_inches="tight", metadata={"Date": None})
figure.write_text(
    "\n".join(line.rstrip() for line in figure.read_text(encoding="utf-8").splitlines()) + "\n",
    encoding="utf-8",
)
fig.savefig(preview, dpi=150, bbox_inches="tight", metadata={"Date": None})
print(json.dumps({"figure": str(figure), "preview": str(preview), "hyrec_unbounded": values("hyrec", True), "recfast_unbounded": values("recfast", True)}, ensure_ascii=False, indent=2))
