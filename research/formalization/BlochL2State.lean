import BerryConnectionGaugeLaw
import BerryConnectionGaugeIdentity
import BerryConnection

/-!
# Bloch 态的 L2 精炼、归一化与规范变换律

## 模块目的

以 `α →₂[μ] ℂ` 为实际 Hilbert 空间，建立旧 `NormalizedBlochState` 到 L2 向量的精炼映射，
并给出积分形式的归一化及 L2 态上的 Berry 规范变换律。

## 主要定义与定理

- `BlochL2State`：保存旧态、L2 向量、几乎处处一致性和逐点归一化等式。
- `BlochL2State_normalization_integral`：把归一化写成 L2 内积积分。
- `BlochL2State_gauge_transformation_law`：把已证 Hilbert 规范律应用于该 L2 向量。

## 证明策略

归一化直接利用 L2 内积的积分定义；规范律复用物理 Hilbert 定理。
`IsScalarTower ℝ ℂ (α→₂[μ]ℂ)` 通过 `Subtype.ext` 委托底层 `AEEqFun` 的标量结合律。

## 依赖关系

依赖 `BerryConnectionGaugeLaw`、`BerryConnectionGaugeIdentity` 和旧 `BerryConnection` 类型。
旧 `NormalizedBlochState` 的 `Prop` 不被当成证明；向量、一致性和归一化仍是显式输入。
-/

namespace BerryConnection

open Real Complex Set MeasureTheory intervalIntegral

/-- **定义**：为 `Position2D=ℝ×ℝ` 提供可测空间实例。

**证明思路**：由定义相等直接委托积实空间的 Borel 可测结构。

**物理意义**：允许对 Bloch 波函数使用测度、积分和 L2 空间。 -/
instance : MeasurableSpace BlochTheorem.Position2D :=
  inferInstanceAs (MeasurableSpace (ℝ × ℝ))

variable {L : BlochTheorem.Lattice2D}
variable (μ : Measure BlochTheorem.Position2D)

/-- **定义**：旧 Bloch 态的 L2 精炼。

**证明思路**：要求同时提供实际 L2 向量、与旧波函数几乎处处一致的证据，
以及每个动量点的归一化等式；旧 `Prop` 本身不产生这些证据。

**物理意义**：把旧的叙述性 Bloch 态连接到可计算的 L2 Hilbert 几何。 -/
structure BlochL2State where
  /-- 来源旧态，仅作来源和映射对象记录。 -/
  legacy : NormalizedBlochState L
  /-- 实际 L2 Hilbert 向量。 -/
  vector : BlochTheorem.CrystalMomentum2D → (BlochTheorem.Position2D →₂[μ] ℂ)
  /-- 向量代表与旧波函数在测度 `μ` 下几乎处处一致。 -/
  coherent : ∀ k, (vector k : BlochTheorem.Position2D → ℂ) =ᵐ[μ] legacy.wavefunction k
  /-- 每个动量点的实际内积归一化等式。 -/
  normalization : ∀ k, inner ℂ (vector k) (vector k) = 1

/-- **定理**：L2 精炼态的归一化可以写成内积积分 `∫ inner(u,u) ∂μ = 1`。

**证明思路**：L2 内积在定义上就是该积分，直接 `change` 到结构中的归一化字段。

**物理意义**：给出与物理 L² 范数一致的归一化证据，而不是旧的未约束 `Prop`。 -/
theorem BlochL2State_normalization_integral
    (s : BlochL2State (L := L) μ) (k : BlochTheorem.CrystalMomentum2D) :
    ∫ a, inner ℂ (s.vector k a) (s.vector k a) ∂μ = 1 := by
  change inner ℂ (s.vector k) (s.vector k) = 1
  exact s.normalization k

/-- **定理**：L2 精炼态满足 Berry 规范变换律 `A′=A−dθ`。

**证明思路**：先由 `Subtype.ext` 和底层 `AEEqFun` 的 `smul_assoc` 建立标量塔，
再把 `BlochL2State.normalization` 代入一般 Hilbert 规范律。

**物理意义**：使 Bloch 波函数的局部相位选择在实际 L2 几何中只改变联络一个恰当形式。 -/
theorem BlochL2State_gauge_transformation_law
    (s : BlochL2State (L := L) μ) (θ : BlochTheorem.CrystalMomentum2D → ℝ)
    (k v : BlochTheorem.CrystalMomentum2D)
    (hθ : DifferentiableAt ℝ θ k) (hu : DifferentiableAt ℝ s.vector k) :
    berryConnection (fun k' => phaseFactor θ k' • s.vector k') k v
    = berryConnection s.vector k v - fderiv ℝ (fun k' => (θ k' : ℂ)) k v := by
  letI : IsScalarTower ℝ ℂ (BlochTheorem.Position2D →₂[μ] ℂ) :=
    ⟨fun x y z => by
      apply Subtype.ext
      exact smul_assoc x y z.1⟩
  exact BerryConnection_GaugeTransformationLaw_physical s.vector θ k v hθ hu (s.normalization k)

end BerryConnection
