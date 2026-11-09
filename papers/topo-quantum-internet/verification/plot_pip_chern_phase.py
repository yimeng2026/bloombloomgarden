"""由真实数值扫描绘制晶格与连续 p+ip 相图，不使用手工相区曲线。"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib import font_manager
import numpy as np

from pip_chern_convention import continuum_degree, lattice_degree

HERE = Path(__file__).resolve().parent
PAPERS = HERE.parent
FIGURE = PAPERS / "figures/pip_chern_phase_diagram.png"
SUMMARY = HERE / "pip_phase_figure_summary.json"
SWEEP = HERE / "pip_phase_sweep.json"


def main() -> int:
    for name in ("Microsoft YaHei", "Noto Sans CJK SC", "SimHei"):
        if name in {font.name for font in font_manager.fontManager.ttflist}:
            plt.rcParams["font.family"] = name
            break
    plt.rcParams["axes.unicode_minus"] = False
    mus = np.linspace(-6.0, 6.0, 241)
    lattice = []
    for mu in mus:
        try:
            value = lattice_degree(float(mu), 1.0, 0.5, 81)
        except ValueError:
            value = None
        lattice.append({"mu": float(mu), "chern": value})
    SWEEP.write_text(json.dumps(lattice, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8", newline="\n")
    gapless = [row["mu"] for row in lattice if row["chern"] is None]
    expected_gapless = [-4.0, 0.0, 4.0]
    if gapless != expected_gapless:
        raise RuntimeError(f"隙闭合点不符：期望 {expected_gapless}，实际 {gapless}")

    continuum = [{"mu": float(mu), "chern": continuum_degree(float(mu))} for mu in np.linspace(-3.0, 3.0, 61) if mu != 0]
    selected = json.loads((HERE / "pip_chern_convention_results.json").read_text(encoding="utf-8"))["lattice"]
    selected = [row for row in selected if row["grid"] == 161]

    fig, axes = plt.subplots(1, 2, figsize=(11.2, 4.6), dpi=180)
    ax = axes[0]
    ax.axvspan(-4, 0, color="#dfeee8", alpha=0.9)
    ax.axvspan(0, 4, color="#f7e6d5", alpha=0.9)
    ax.scatter([row["mu"] for row in lattice if row["chern"] is not None], [row["chern"] for row in lattice if row["chern"] is not None], s=5, color="#315f72", label="逐点积分（81×81）")
    ax.scatter([row["mu"] for row in selected], [row["degree"] for row in selected], s=40, color="#b94b4b", zorder=4, label="总账复核点（161×161）")
    for boundary in expected_gapless:
        ax.axvline(boundary, color="#6a6f76", linestyle="--", linewidth=0.8)
    ax.set(xlabel="化学势 μ/t", ylabel="Chern 数", title="晶格 p+ip：两个拓扑窗口", xlim=(-6, 6), ylim=(-1.35, 1.35))
    ax.text(-2, 0.55, "+1", fontsize=16, ha="center", color="#276454")
    ax.text(2, -0.55, "−1", fontsize=16, ha="center", color="#985a32")
    ax.legend(frameon=False, fontsize=8, loc="lower left")
    ax.grid(alpha=0.15)

    ax = axes[1]
    ax.scatter([row["mu"] for row in continuum], [row["chern"] for row in continuum], s=10, color="#276454")
    ax.axvline(0, color="#6a6f76", linestyle="--", linewidth=0.8)
    ax.set(xlabel="化学势 μ（连续模型单位）", ylabel="Chern 数", title="连续 p+ip：强弱配对转变", xlim=(-3, 3), ylim=(-0.2, 1.25))
    ax.text(1.3, 0.65, "弱配对：+1", fontsize=13, ha="center", color="#276454")
    ax.text(-1.4, 0.15, "强配对：0", fontsize=13, ha="center", color="#59636d")
    ax.grid(alpha=0.15)
    for ax in axes:
        ax.spines[["top", "right"]].set_visible(False)
    fig.suptitle("同一 Read–Green 约定下的两种模型（相变点不计算）", fontsize=14)
    fig.tight_layout(rect=(0, 0, 1, 0.94))
    FIGURE.parent.mkdir(exist_ok=True)
    fig.savefig(FIGURE, bbox_inches="tight")
    plt.close(fig)

    summary = {
        "schema": "pip-phase-figure-v1",
        "lattice_sweep_points": len(lattice),
        "lattice_grid": 81,
        "gapless_boundaries": gapless,
        "continuum_points": len(continuum),
        "source_results": "pip_chern_convention_results.json",
        "raw_sweep": SWEEP.name,
        "figure": str(FIGURE.relative_to(PAPERS)),
        "validation": "gapless boundaries and source artifact existence pass",
    }
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
