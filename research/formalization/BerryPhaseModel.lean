import BerryPhaseGaugeInvariance

/-!
# Berry 相位的结构精炼与结构级规范不变性

## 模块目的

把旧 `BerryPhase` 的无约束 `definition : Prop` 精炼为实际相位积分等式。
保留旧联络和闭合路径记录，新增 Hilbert 态曲线，使记录相位与路径上的几何积分一致。

## 主要定义与定理

- `BerryPhaseModel`：含旧联络、闭合路径、态曲线、相位及实际积分等式。
- `BerryPhase_GaugeInvariance_refined_model`：规范相位积分等于结构记录的闭合相位。

## 证明策略

先用结构中的 `definition` 展开记录相位，再复用已证区间规范不变性。
路径闭合性给出端点规范相位相等，从而完成结构级包装。

## 依赖关系

依赖 `BerryPhaseGaugeInvariance` 的实际积分定义和区间定理。
旧联络字段仅作来源记录，不用于冒充实际 Hilbert 联络或归一化证据。
-/

namespace BerryConnection

open Real Complex Set MeasureTheory intervalIntegral

variable {L : BlochTheorem.Lattice2D}

/-- **定义**：带实际态曲线和相位积分等式的 Berry 相位模型。

**证明思路**：以 `definition` 约束 `phase` 等于态沿路径的区间积分。

**物理意义**：把旧闭合路径记录与实际 Hilbert 几何连接起来。 -/
structure BerryPhaseModel (L : BlochTheorem.Lattice2D) (H : Type*)
    [NormedAddCommGroup H] [InnerProductSpace ℂ H]
    [NormedSpace ℝ H] [IsScalarTower ℝ ℂ H] where
  /-- 旧联络记录；不用于替代实际 Hilbert 联络。 -/
  connection : BerryConnection L
  /-- 参数化闭合路径。 -/
  path : ℝ → BlochTheorem.CrystalMomentum2D
  /-- 路径两端相等。 -/
  closedPath : path 0 = path 1
  /-- 定义在动量空间中的实际 Hilbert 态曲线。 -/
  state : BlochTheorem.CrystalMomentum2D → H
  /-- 结构记录的 Berry 相位。 -/
  phase : ℂ
  /-- 记录相位等于态沿路径的实际区间积分。 -/
  definition : phase = berryPhaseIntegral (fun t => state (path t))

/-- **定理**：结构模型的规范相位积分等于其记录的闭合 Berry 相位。

**证明思路**：先用 `definition` 展开记录相位，再复用区间规范不变性和路径闭合性。

**物理意义**：单值规范选择不改变结构记录的闭合相位。 -/
theorem BerryPhase_GaugeInvariance_refined_model
    {H : Type*} [NormedAddCommGroup H] [InnerProductSpace ℂ H]
    [NormedSpace ℝ H] [IsScalarTower ℝ ℂ H]
    (γ : BerryPhaseModel L H) (θ : BlochTheorem.CrystalMomentum2D → ℝ)
    (hu : ∀ t, DifferentiableAt ℝ (fun t' => γ.state (γ.path t')) t)
    (hθ : ∀ t, DifferentiableAt ℝ (fun t' => θ (γ.path t')) t)
    (hnorm : ∀ t, inner ℂ (γ.state (γ.path t)) (γ.state (γ.path t)) = 1)
    (hconn : IntervalIntegrable (fun t => berryConnection (fun t' => γ.state (γ.path t')) t 1) volume 0 1)
    (hderiv : IntervalIntegrable (deriv (fun t => (θ (γ.path t) : ℂ))) volume 0 1) :
    berryPhaseIntegral (fun t => phaseFactor (fun x => θ (γ.path x)) t • γ.state (γ.path t)) = γ.phase := by
  rw [γ.definition]
  apply BerryPhase_GaugeInvariance_model
  · exact hu
  · exact hθ
  · exact hnorm
  · exact hconn
  · exact hderiv
  · dsimp
    rw [γ.closedPath]

end BerryConnection
