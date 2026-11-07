"""Render the valid CMB-marginalized lensing comparison as one panel."""

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "research/physical-intuition/zero-cdm"
SUMMARY_PATH = OUT / "planck-lensing-cmbmarged-summary.json"
FIGURE_PATH = OUT / "planck-lensing-cmbmarged.svg"
PREVIEW_PATH = REPO / ".tmp/planck-lensing-cmbmarged.png"
summary = json.loads(SUMMARY_PATH.read_text(encoding="utf-8"))
record = summary["records"]["cmb_marginalized"]
bins = np.asarray(summary["data"]["bins"], dtype=float)
centers = bins[:, 3]
observed = np.asarray(record["observed_bandpower"], dtype=float)
errors = np.asarray(record["observed_error"], dtype=float)
models = ["class_hyrec", "class_recfast", "camb_recfast"]
colors = {"class_hyrec": "#111827", "class_recfast": "#c94f32", "camb_recfast": "#2563a6"}
labels = {"class_hyrec": "CLASS HyRec", "class_recfast": "CLASS RECFAST", "camb_recfast": "CAMB Recfast"}

plt.rcParams.update({
    "font.size": 9,
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "DejaVu Sans"],
    "svg.hashsalt": "planck-lensing-cmbmarged-v2",
})
fig, ax = plt.subplots(figsize=(8.5, 5.5), constrained_layout=True)
ax.errorbar(centers, observed, yerr=errors, fmt="ko", ms=4, capsize=2.5, label="Planck 2018 观测")
for model in models:
    zero = np.asarray(record["models"][model]["zero"]["corrected_bandpower"], dtype=float)
    baseline = np.asarray(record["models"][model]["baseline"]["corrected_bandpower"], dtype=float)
    ax.plot(centers, baseline, color=colors[model], lw=1.4, label=f"{labels[model]} ΛCDM")
    ax.plot(centers, zero, color=colors[model], lw=1.1, ls="--", label=f"{labels[model]} 零模型")
ax.set_yscale("symlog", linthresh=1.0e-8)
ax.set(
    title="CMB 边缘化协方差：修正透镜带功率",
    xlabel="带平均多极矩 L",
    ylabel="[L(L+1)]² Cφφ/(2π)",
)
ax.grid(alpha=0.25, which="both")
ax.legend(frameon=False, fontsize=8, ncol=2)
fig.savefig(FIGURE_PATH, bbox_inches="tight", metadata={"Date": None})
FIGURE_PATH.write_text(
    "\n".join(line.rstrip() for line in FIGURE_PATH.read_text(encoding="utf-8").splitlines()) + "\n",
    encoding="utf-8",
)
PREVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(PREVIEW_PATH, dpi=150, bbox_inches="tight", metadata={"Software": "planck-lensing-cmbmarged-v2"})
print(FIGURE_PATH)
