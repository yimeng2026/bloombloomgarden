import BerryConnection

/-!
# 闭合参数区间上的 Berry 相位规范不变性

## 模块目的

以实际 Hilbert Berry 联络的区间积分定义几何相位，证明端点单值的规范相位
不会改变该积分。结论针对参数区间 `[0,1]`，不冒充一般二维流形线积分理论。

## 主要定义与定理

- `berryPhaseIntegral`：态曲线在参数区间上的 Berry 联络积分。
- `BerryPhase_GaugeInvariance_model`：端点规范相位相等时，相位态与原态积分相等。

## 证明策略

由一般 Hilbert 规范律逐点分解联络，再用区间积分减法分离规范导数。
微积分基本定理把导数积分化为 `θ(1)-θ(0)`，端点相等使其为零。

## 依赖关系

依赖修补后的 `BerryConnection` 和 Mathlib 的区间积分、Fréchet 导数及微积分基本定理。
多值规范相位的整数绕数和一般二维 Berry 相位结构仍须另行处理。
-/

namespace BerryConnection

open Real Complex Set MeasureTheory intervalIntegral

variable {H : Type*} [NormedAddCommGroup H] [InnerProductSpace ℂ H]
  [NormedSpace ℝ H] [IsScalarTower ℝ ℂ H]

/-- **定义**：态曲线在参数区间 `[0,1]` 上的 Berry 相位积分。

**证明思路**：对实际 Hilbert Berry 联络在方向 `1` 上取区间积分。

**物理意义**：给出几何相位的可计算对象，而不是无约束复数字段。 -/
noncomputable def berryPhaseIntegral (u : ℝ → H) : ℂ :=
  ∫ t in 0..1, berryConnection u t 1

/-- **定理**：若规范相位在闭合参数区间两端相等，则 Berry 相位积分不变。

**证明思路**：规范律把相位态联络分解为原联络减去规范导数，再以微积分基本定理求导数积分。

**物理意义**：单值规范选择不改变闭合几何相位；不包含多值相位绕数。 -/
theorem BerryPhase_GaugeInvariance_model
    (u : ℝ → H) (θ : ℝ → ℝ)
    (hu : ∀ t, DifferentiableAt ℝ u t)
    (hθ : ∀ t, DifferentiableAt ℝ θ t)
    (hnorm : ∀ t, inner ℂ (u t) (u t) = 1)
    (hconn : IntervalIntegrable (fun t => berryConnection u t 1) volume 0 1)
    (hderiv : IntervalIntegrable (deriv (fun t => (θ t : ℂ))) volume 0 1)
    (hclosed : θ 1 = θ 0) :
    berryPhaseIntegral (fun t => phaseFactor θ t • u t) = berryPhaseIntegral u := by
  have hpoint (t : ℝ) :
      berryConnection (fun t' => phaseFactor θ t' • u t') t 1
        = berryConnection u t 1 - deriv (fun t' => (θ t' : ℂ)) t := by
    simpa only [fderiv_eq_smul_deriv, one_smul] using
      BerryConnection_GaugeTransformationLaw u θ t 1 (hθ t) (hu t) (hnorm t)
  unfold berryPhaseIntegral
  simp_rw [hpoint]
  rw [intervalIntegral.integral_sub hconn hderiv]
  have hθC : ∀ x ∈ Set.uIcc (0 : ℝ) 1, DifferentiableAt ℝ (fun t => (θ t : ℂ)) x := by
    intro x _
    exact Complex.ofRealCLM.differentiableAt.comp x (hθ x)
  rw [intervalIntegral.integral_deriv_eq_sub hθC hderiv]
  rw [hclosed]
  simp

end BerryConnection
