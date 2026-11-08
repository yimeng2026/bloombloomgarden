import BlochL2State

/-!
# 具体归一化 Bloch L2 实例：Dirac 测度与常值态

## 模块目的

构造一个实际 `BlochL2State`，证明 L2 精炼结构可以实例化，并把该实例用于 Berry 规范律。
测度取 `Measure.dirac r0`，波函数取常值 `1`，使归一化可直接计算。

## 主要定义与定理

- `constantBlochL2State`：包含旧态、L2 向量、几乎处处一致性和归一化的具体实例。
- `constantBlochL2State_gauge_law`：该实例的 Berry 规范变换律。

## 证明策略

由 `memLp_const` 构造常值 L2 向量，以 `MemLp.coeFn_toLp` 证明几乎处处一致性；
用 `L2.inner_def` 展开内积并计算 Dirac 测度下的常值积分，得到归一化。
规范律直接复用 L2 精炼定理。

## 依赖关系

依赖 `BlochL2State` 及其一般规范律。旧 `normalization : Prop` 只保留为旧结构字段，
实际归一化由本文件的积分计算给出。Dirac 测度是验证用例，不是一般布里渊区测度模型。
-/

namespace BerryConnection

open Real Complex Set MeasureTheory intervalIntegral

variable {L : BlochTheorem.Lattice2D}
variable (r0 : BlochTheorem.Position2D)

/-- **定义**：Dirac 测度下的常值归一化 Bloch L2 态。

**证明思路**：旧态取常值波函数，L2 向量由 `memLp_const` 构造；一致性由
`MemLp.coeFn_toLp` 给出，归一化由 `L2.inner_def` 和实际积分计算给出。

**物理意义**：提供一个非空的 L2 精炼实例，用于检验映射、归一化和规范律。
它不是一般布里渊区物理测度，而是可精确计算的验证用例。 -/
noncomputable def constantBlochL2State : BlochL2State (L := L) (Measure.dirac r0) where
  legacy := {
    n := (0 : ℕ)
    wavefunction := fun _ _ => 1
    periodicity := True
    normalization := True
  }
  vector := fun _ => MemLp.toLp (fun _ => 1) (memLp_const 1)
  coherent := by
    intro k
    simpa using (MemLp.coeFn_toLp (f := fun _ : BlochTheorem.Position2D => (1 : ℂ))
      (μ := Measure.dirac r0) (p := 2) (memLp_const 1))
  normalization := by
    intro k
    rw [L2.inner_def]
    simp

/-- **定理**：Dirac 常值 L2 实例满足 Berry 规范变换律 `A′=A−dθ`。

**证明思路**：以命名参数 `μ := Measure.dirac r0` 把具体实例代入 L2 精炼规范律。

**物理意义**：确认实际构造的 Bloch L2 态可以进入已建立的相位规范理论，
而不仅是数据结构上的形式实例。 -/
theorem constantBlochL2State_gauge_law
    (θ : BlochTheorem.CrystalMomentum2D → ℝ)
    (k v : BlochTheorem.CrystalMomentum2D)
    (hθ : DifferentiableAt ℝ θ k)
    (hu : DifferentiableAt ℝ (constantBlochL2State (L := L) r0).vector k) :
    berryConnection (fun k' => phaseFactor θ k' • (constantBlochL2State (L := L) r0).vector k') k v
    = berryConnection (constantBlochL2State (L := L) r0).vector k v
      - fderiv ℝ (fun k' => (θ k' : ℂ)) k v := by
  exact BlochL2State_gauge_transformation_law (μ := Measure.dirac r0)
    (constantBlochL2State (L := L) r0) θ k v hθ hu

end BerryConnection
