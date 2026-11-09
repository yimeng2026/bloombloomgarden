"""p+ip Read–Green 绕数：晶格 FHS／直接积分与连续模型交叉核验。

约定：H=Re(Δ)τx−Im(Δ)τy+ετz，E=(ReΔ,−ImΔ,ε)，A=+i〈u|∂u〉。
FHS 链接展开给出 C=−Σarg(plaquette)/(2π)，与 E 向量积分同号。
不要把本文件的晶格相区直接套用到连续强／弱配对判据。
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
RESULTS = HERE / "pip_chern_convention_results.json"
MUS = (-5.0, -1.0, 1.0, 5.0)
HIGH_SYMMETRY = ((0.0, 0.0), (np.pi, 0.0), (0.0, np.pi), (np.pi, np.pi))


def bdg(kx, ky, mu, t=1.0, delta=0.5, chirality=1):
    """返回两带 BdG 矩阵；chirality=±1 区分 p+ip 与 p−ip。"""
    if chirality not in (-1, 1):
        raise ValueError("chirality 必须为 +1 或 −1；Δ0 的整体符号不是手性")
    eps = -mu - 2.0 * t * (np.cos(kx) + np.cos(ky))
    pairing = delta * (np.sin(kx) + 1j * chirality * np.sin(ky))
    return np.array([[eps, pairing], [pairing.conjugate(), -eps]], dtype=complex)


def e_map(kx, ky, mu, t, delta, chirality=1):
    """Read–Green 向量 E=(ReΔ,−ImΔ,ε)，而非 +ImΔ。"""
    if chirality not in (-1, 1):
        raise ValueError("chirality 必须为 +1 或 −1；Δ0 的整体符号不是手性")
    return np.stack(
        [delta * np.sin(kx), -chirality * delta * np.sin(ky), -mu - 2.0 * t * (np.cos(kx) + np.cos(ky))],
        axis=-1,
    )


def momentum_grid(grid):
    if not isinstance(grid, int) or grid < 5:
        raise ValueError("grid 必须是至少为 5 的整数")
    k = np.linspace(-np.pi, np.pi, grid, endpoint=False)
    return np.meshgrid(k, k, indexing="ij")


def assert_gapped(kx, ky, mu, t, delta, chirality=1):
    """先查 sin k=0 的解析隙闭合点，再查数值网格，避免网格漏掉相变。"""
    if t == 0 or delta == 0:
        raise ValueError("t 与 delta 必须非零；无配对时此模型没有全局能隙")
    special_gap = min(float(np.linalg.norm(e_map(x, y, mu, t, delta, chirality))) for x, y in HIGH_SYMMETRY)
    if special_gap < 1e-8:
        raise ValueError(f"高对称点能隙闭合：min|E|={special_gap:.3e}")
    sampled_gap = float(np.linalg.norm(e_map(kx, ky, mu, t, delta, chirality), axis=-1).min())
    if sampled_gap < 1e-8:
        raise ValueError(f"采样网格能隙闭合或不可分辨：min|E|={sampled_gap:.3e}")
    return min(special_gap, sampled_gap)


def lattice_degree(mu, t=1.0, delta=0.5, grid=81, chirality=1):
    """用解析导数积分 Read–Green 绕数，避免粗网格中心差分失真。"""
    kx, ky = momentum_grid(grid)
    assert_gapped(kx, ky, mu, t, delta, chirality)
    e = e_map(kx, ky, mu, t, delta, chirality)
    norm = np.linalg.norm(e, axis=-1, keepdims=True)
    dx = np.stack([delta * np.cos(kx), np.zeros_like(kx), 2.0 * t * np.sin(kx)], axis=-1)
    dy = np.stack([np.zeros_like(ky), -chirality * delta * np.cos(ky), 2.0 * t * np.sin(ky)], axis=-1)
    dx_hat = dx / norm - e * np.sum(e * dx, axis=-1, keepdims=True) / norm**3
    dy_hat = dy / norm - e * np.sum(e * dy, axis=-1, keepdims=True) / norm**3
    e_hat = e / norm
    curvature = np.sum(e_hat * np.cross(dx_hat, dy_hat), axis=-1)
    dk = 2.0 * np.pi / grid
    return float(curvature.sum() * dk * dk / (4.0 * np.pi))


def normalized_link(values):
    modulus = np.abs(values)
    if np.any(modulus < 1e-12):
        raise ValueError("FHS 链接变量模长接近零，无法指定规范")
    return values / modulus


def fhs_chern(mu, t=1.0, delta=0.5, grid=81, chirality=1):
    """最低 BdG 能带的 FHS 陈数；A=+i〈u|∂u〉时整体取负号。"""
    kx, ky = momentum_grid(grid)
    assert_gapped(kx, ky, mu, t, delta, chirality)
    occupied = np.empty((grid, grid, 2), dtype=complex)
    for ix in range(grid):
        for iy in range(grid):
            _, vectors = np.linalg.eigh(bdg(kx[ix, iy], ky[ix, iy], mu, t, delta, chirality))
            occupied[ix, iy] = vectors[:, 0]
    ux = normalized_link(np.sum(occupied.conj() * np.roll(occupied, -1, axis=0), axis=-1))
    uy = normalized_link(np.sum(occupied.conj() * np.roll(occupied, -1, axis=1), axis=-1))
    plaquette = ux * np.roll(uy, -1, axis=0) * np.conj(np.roll(ux, -1, axis=1)) * np.conj(uy)
    flux = np.angle(plaquette)
    if np.any(np.abs(flux) >= np.pi):
        raise ValueError("FHS 通量触及分支切割；请加密网格而不是任意展开")
    # U≈1+〈u|∂u〉dk=1−iA dk，故 F_log=−iF，C=−ΣF_log/(2πi)。
    return float(-flux.sum() / (2.0 * np.pi))


def continuum_degree(mu, radial_grid=20000, r_max=200.0):
    """连续 E=(r cosφ,−r sinφ,r²−μ) 的复合 Simpson 紧化积分。"""
    if mu == 0:
        raise ValueError("μ=0 的连续模型在 k=0 能隙闭合")
    if radial_grid < 100 or radial_grid % 2 or r_max <= 0:
        raise ValueError("径向网格须为至少 100 的偶数且 r_max 必须为正")
    r = np.linspace(0.0, r_max, radial_grid + 1)
    f = r * r - mu
    df = 2.0 * r
    # d²k=r dr dφ，与 ∂kx×∂ky=(1/r)∂r×∂φ 合并后仍保留一个 r。
    integrand = 0.5 * r * (r * df - f) / np.power(r * r + f * f, 1.5)
    # 复合 Simpson；不用降低精度来换取表面上的整数。
    finite = (r[1] - r[0]) / 3.0 * (integrand[0] + integrand[-1] + 4.0 * integrand[1:-1:2].sum() + 2.0 * integrand[2:-2:2].sum())
    # E/|E| 在无穷远指向北极；补上 [R,∞) 的解析尾部，而非丢弃或取整。
    infinity_tail = 0.5 * (1.0 - f[-1] / np.sqrt(r[-1]**2 + f[-1]**2))
    return float(finite + infinity_tail)


def phase_region(mu, t=1.0):
    """晶格解析相区标签；不用于替代数值输出。"""
    if t <= 0:
        raise ValueError("本测试模型要求 t>0")
    if 0 < mu < 4.0 * t:
        return "-1"
    if -4.0 * t < mu < 0:
        return "+1"
    if abs(mu) > 4.0 * t:
        return "0"
    return "gapless"


def compute_results(grids=(41, 81, 161)):
    """保留每个网格的原始值，不只保留四舍五入后的整数。"""
    lattice = []
    for mu in MUS:
        for grid in grids:
            degree = lattice_degree(mu, 1.0, 0.5, grid)
            fhs = fhs_chern(mu, 1.0, 0.5, grid)
            kx, ky = momentum_grid(grid)
            lattice.append({
                "mu": mu,
                "t": 1.0,
                "delta": 0.5,
                "grid": grid,
                "analytic_phase": phase_region(mu),
                "minimum_sampled_gap": float(np.linalg.norm(e_map(kx, ky, mu, 1.0, 0.5), axis=-1).min()),
                "degree": degree,
                "fhs": fhs,
                "rounded_degree": int(round(degree)),
                "rounded_fhs": int(round(fhs)),
                "absolute_method_difference": abs(degree - fhs),
            })
    continuum = {f"mu={int(mu)}": round(continuum_degree(mu), 9) for mu in (-1.0, 1.0)}
    return {
        "schema": "pip-chern-convention-v1",
        "convention": {
            "bdg": "H=Re(Delta)tau_x-Im(Delta)tau_y+epsilon*tau_z",
            "e_vector": "(Re Delta, -Im Delta, epsilon)",
            "berry_connection": "A=+i<u|partial_k u>",
            "fhs_sign": "C=-sum(arg(plaquette))/(2*pi)",
            "lattice_epsilon": "-mu-2t(cos kx+cos ky)",
            "lattice_pairing": "Delta(sin kx+i sin ky)",
            "continuum_epsilon": "k^2-mu",
            "continuum_pairing": "kx+i ky",
        },
        "lattice": lattice,
        "continuum": continuum,
        "scope": "模型与约定核验，不是材料实验验证；不覆盖 CdGM、无序、相互作用或实验数字。",
        "references": [
            "https://arxiv.org/abs/cond-mat/9906453",
            "https://arxiv.org/abs/cond-mat/0503172",
        ],
    }


def main() -> int:
    result = compute_results()
    max_difference = max(row["absolute_method_difference"] for row in result["lattice"])
    continuum_ok = abs(result["continuum"]["mu=1"] - 1.0) < 1e-6 and abs(result["continuum"]["mu=-1"]) < 1e-6
    expected = {-5.0: 0, -1.0: 1, 1.0: -1, 5.0: 0}
    lattice_ok = all(row["rounded_degree"] == expected[row["mu"]] and row["rounded_fhs"] == expected[row["mu"]] for row in result["lattice"])
    result["validation"] = {
        "maximum_absolute_method_difference": max_difference,
        "lattice_expected_signs_pass": lattice_ok,
        "continuum_expected_signs_pass": continuum_ok,
        "tolerance": 0.03,
        "status": "pass" if max_difference < 0.03 and lattice_ok and continuum_ok else "fail",
    }
    RESULTS.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(RESULTS), **result["validation"]}, ensure_ascii=False, indent=2))
    return 0 if result["validation"]["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
