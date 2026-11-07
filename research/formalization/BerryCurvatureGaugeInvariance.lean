import Mathlib
import BlochTheorem
import BerryConnection

/-!
# Berry 曲率的二维规范不变性：真实微积分证明

## 模块目的

以实值二维联络分量定义 `curvatureXYFromConnection`，证明在加法规范变换
`Aμ ↦ Aμ + ∂μθ` 下 Berry 曲率不变，替代原 `BerryCurvature.lean` 中结论为 `True` 的占位。

## 主要定义与定理

- `directionX`、`directionY`：晶体动量空间的两个坐标方向。
- `curvatureXYFromConnection`：`∂xAy − ∂yAx` 的 Fréchet 导数定义。
- `mixed_partials_commute_of_contDiff2`：二阶连续可微函数的混合偏导交换。
- `BerryCurvature_GaugeInvariance`：具有明确 `C²` 和可微性前提的规范不变性。

## 证明策略

先用 `fderiv_add` 拆分规范变换后的联络，再以 mathlib 的二阶导数对称定理
`ContDiffAt.isSymmSndFDerivAt` 和 `fderiv_clm_apply` 证明混合偏导相消。

## 依赖关系

依赖原项目的 `BlochTheorem` 与 `BerryConnection` 类型，以及 pin 定 mathlib。
不导入原 `BerryCurvature.lean`，不使用其 `True` 占位，也不调用三维 `curl_linear_subtraction` 公理。
-/

namespace BerryCurvature

open Real Complex Set MeasureTheory intervalIntegral

/-- **定义**：`CrystalMomentum2D` 在定义上等于 `ℝ×ℝ`，局部恢复其范数结构。

**证明思路**：由定义相等直接委托积空间的现有实例，不新建数学假设。

**物理意义**：允许在晶体动量空间使用距离、极限和导数。 -/
noncomputable local instance : NormedAddCommGroup BlochTheorem.CrystalMomentum2D :=
  inferInstanceAs (NormedAddCommGroup (ℝ × ℝ))

/-- **定义**：恢复 `CrystalMomentum2D` 的实向量空间结构。

**证明思路**：同样委托 `ℝ×ℝ` 的现有 `NormedSpace` 实例。

**物理意义**：使 Fréchet 导数可以作用于联络和规范相位。 -/
noncomputable local instance : NormedSpace ℝ BlochTheorem.CrystalMomentum2D :=
  inferInstanceAs (NormedSpace ℝ (ℝ × ℝ))

/-- **定义**：二维晶体动量空间的 x 单位方向 `(1, 0)`。

**证明思路**：直接使用积空间的坐标表示。

**物理意义**：指定 Berry 曲率公式中的 `∂x`。 -/
noncomputable def directionX : BlochTheorem.CrystalMomentum2D := (1, 0)

/-- **定义**：二维晶体动量空间的 y 单位方向 `(0, 1)`。

**证明思路**：直接使用积空间的坐标表示。

**物理意义**：指定 Berry 曲率公式中的 `∂y`。 -/
noncomputable def directionY : BlochTheorem.CrystalMomentum2D := (0, 1)

/-- **定义**：实值 Berry 曲率分量 `∂xAy − ∂yAx`。

**证明思路**：分别对 `Ay` 沿 x、`Ax` 沿 y 取 Fréchet 导数并相减。

**物理意义**：表示 Abel Berry 联络在二维动量空间中的唯一独立曲率分量。 -/
noncomputable def curvatureXYFromConnection
    (connectionX connectionY : BlochTheorem.CrystalMomentum2D → ℝ)
    (k : BlochTheorem.CrystalMomentum2D) : ℝ :=
  fderiv ℝ connectionY k directionX - fderiv ℝ connectionX k directionY

/-- **定理**：二阶连续可微实函数的混合偏导数可交换。

**证明思路**：由 `ContDiffAt.isSymmSndFDerivAt` 得到二阶导数对称性，再用
`fderiv_clm_apply` 把固定方向求值改写为二阶连续线性映射的 `flip`。

**物理意义**：这是 `d²θ=0`，也是规范相位不改变 Berry 曲率的微积分核心。 -/
private theorem mixed_partials_commute_of_contDiff2 {E : Type*} [NormedAddCommGroup E]
    [NormedSpace ℝ E] {φ : E → ℝ} (hφ : ContDiff ℝ 2 φ) (k : E) (v w : E) :
    fderiv ℝ (fun k' => fderiv ℝ φ k' v) k w
    = fderiv ℝ (fun k' => fderiv ℝ φ k' w) k v := by
  have hsymm : IsSymmSndFDerivAt ℝ φ k :=
    ContDiffAt.isSymmSndFDerivAt hφ.contDiffAt
      (le_of_eq minSmoothness_of_isRCLikeNormedField)
  have hd : DifferentiableAt ℝ (fderiv ℝ φ) k :=
    ((hφ.fderiv_right (m := 1) le_rfl).contDiffAt (x := k)).differentiableAt one_ne_zero
  have h1 : fderiv ℝ (fun k' => fderiv ℝ φ k' v) k
      = (fderiv ℝ (fderiv ℝ φ) k).flip v := by
    have h := fderiv_clm_apply (c := fderiv ℝ φ) (u := fun _ : E => v) hd
      (differentiableAt_const v)
    simpa using h
  have h2 : fderiv ℝ (fun k' => fderiv ℝ φ k' w) k
      = (fderiv ℝ (fderiv ℝ φ) k).flip w := by
    have h := fderiv_clm_apply (c := fderiv ℝ φ) (u := fun _ : E => w) hd
      (differentiableAt_const w)
    simpa using h
  rw [h1, h2, ContinuousLinearMap.flip_apply, ContinuousLinearMap.flip_apply]
  exact hsymm.eq w v

/-- **定理**：若 `θ∈C²`，且两个实联络分量在 `k` 点可微，则
`Aμ ↦ Aμ + ∂μθ` 不改变 `∂xAy − ∂yAx`。

**证明思路**：分别以 `fderiv_add` 展开两个联络分量，再调用混合偏导交换定理，
最后用环代数完成相消。可微性假设是减法／加法求导规则成立所必需，不能省略。

**物理意义**： Berry 曲率在局部 Abel 规范变换下不变。这是二维实值分量命题，
不断言原任意复值结构、外微分形式或三维旋度已经获得同样的形式化。 -/
theorem BerryCurvature_GaugeInvariance
    (L : BlochTheorem.Lattice2D)
    (connectionX connectionY : BlochTheorem.CrystalMomentum2D → ℝ)
    (gauge : BerryConnection.GaugeTransformation L)
    (hgauge : ContDiff ℝ 2 gauge.theta)
    (k : BlochTheorem.CrystalMomentum2D)
    (hX : DifferentiableAt ℝ connectionX k)
    (hY : DifferentiableAt ℝ connectionY k) :
    curvatureXYFromConnection
      (fun k' => connectionX k' + fderiv ℝ gauge.theta k' directionX)
      (fun k' => connectionY k' + fderiv ℝ gauge.theta k' directionY) k
    = curvatureXYFromConnection connectionX connectionY k := by
  have hdθ : DifferentiableAt ℝ (fderiv ℝ gauge.theta) k :=
    ((hgauge.fderiv_right (m := 1) le_rfl).contDiffAt (x := k)).differentiableAt one_ne_zero
  have hθx : DifferentiableAt ℝ (fun k' => fderiv ℝ gauge.theta k' directionX) k :=
    hdθ.clm_apply (differentiableAt_const _)
  have hθy : DifferentiableAt ℝ (fun k' => fderiv ℝ gauge.theta k' directionY) k :=
    hdθ.clm_apply (differentiableAt_const _)
  have hcomm : fderiv ℝ (fun k' => fderiv ℝ gauge.theta k' directionY) k directionX
      = fderiv ℝ (fun k' => fderiv ℝ gauge.theta k' directionX) k directionY :=
    mixed_partials_commute_of_contDiff2 hgauge k directionY directionX
  have hderivX : fderiv ℝ
      (fun k' => connectionX k' + fderiv ℝ gauge.theta k' directionX) k directionY
      = fderiv ℝ connectionX k directionY
        + fderiv ℝ (fun k' => fderiv ℝ gauge.theta k' directionX) k directionY := by
    rw [show (fun k' => connectionX k' + fderiv ℝ gauge.theta k' directionX)
        = connectionX + fun k' => fderiv ℝ gauge.theta k' directionX from rfl]
    rw [fderiv_add hX hθx]
    rfl
  have hderivY : fderiv ℝ
      (fun k' => connectionY k' + fderiv ℝ gauge.theta k' directionY) k directionX
      = fderiv ℝ connectionY k directionX
        + fderiv ℝ (fun k' => fderiv ℝ gauge.theta k' directionY) k directionX := by
    rw [show (fun k' => connectionY k' + fderiv ℝ gauge.theta k' directionY)
        = connectionY + fun k' => fderiv ℝ gauge.theta k' directionY from rfl]
    rw [fderiv_add hY hθy]
    rfl
  unfold curvatureXYFromConnection
  rw [hderivY, hderivX, hcomm]
  ring

end BerryCurvature
