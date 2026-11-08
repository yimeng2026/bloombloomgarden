import BerryConnection

/-!
# Berry 一形式的外微分及其规范不变性

## 模块目的

以实际 Fréchet 导数定义二维复值 Berry 一形式的外微分分量，
并在 `C²` 复值规范相位下证明 `d(A+dθ)=dA`。不构造高阶微分形式或 de Rham 上同调。

## 主要定义与定理

- `exteriorDerivativeOfBerryConnection_model`：复值外微分分量 `∂xAy−∂yAx`。
- `gaugeTransform1Form_model`：一形式分量的规范变换 `A↦A+dθ`。
- `exteriorDerivativeOfBerryConnection_gauge_invariant_model`：外微分的规范不变性。

## 证明策略

先以 `fderiv_add` 展开两个联络分量，再对 `C²` 相位使用二阶导数对称性。
规范项的混合偏导相消，保留原外微分分量。

## 依赖关系

依赖修补后的 `BerryConnection`、共享坐标方向和 Mathlib 的 Fréchet 导数。
原结构的复值分量用于计算；无约束 `correspondenceX/Y : Prop` 仅作为保留记录字段。
-/

namespace BerryConnection

open Real Complex Set MeasureTheory intervalIntegral

variable {L : BlochTheorem.Lattice2D}

/-- **定义**：Berry 一形式在二维动量空间中的复值外微分分量。

**证明思路**：对 `componentY` 沿 x、`componentX` 沿 y 取 Fréchet 导数并相减。

**物理意义**：给出 `dA` 的唯一独立二维分量，不构造高阶微分形式。 -/
noncomputable def exteriorDerivativeOfBerryConnection_model
    (L : BlochTheorem.Lattice2D) (A : BerryConnection1Form L)
    (k : BlochTheorem.CrystalMomentum2D) : ℂ :=
  fderiv ℝ A.componentY k realDirectionX - fderiv ℝ A.componentX k realDirectionY

/-- **定义**：复值规范相位对 Berry 一形式分量的加法作用。

**证明思路**：分别给两个分量加入相位的 x、y 方向导数，保留原记录字段。

**物理意义**：表示局部 Abel 规范变换 `A ↦ A+dθ`。 -/
noncomputable def gaugeTransform1Form_model
    (L : BlochTheorem.Lattice2D) (A : BerryConnection1Form L)
    (θ : BlochTheorem.CrystalMomentum2D → ℂ) : BerryConnection1Form L where
  berryConnection := A.berryConnection
  componentX := fun k => A.componentX k + fderiv ℝ θ k realDirectionX
  componentY := fun k => A.componentY k + fderiv ℝ θ k realDirectionY
  correspondenceX := A.correspondenceX
  correspondenceY := A.correspondenceY

private theorem mixed_partials_commute_of_contDiff2_complex {E : Type*} [NormedAddCommGroup E]
    [NormedSpace ℝ E] {φ : E → ℂ} (hφ : ContDiff ℝ 2 φ) (k : E) (v w : E) :
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

/-- **定理**：`C²` 复值规范相位不改变 Berry 一形式的外微分分量。

**证明思路**：分别以 `fderiv_add` 展开分量，再以混合偏导对称相消规范项。

**物理意义**：证明二维复值 `d(A+dθ)=dA`，不宣称完整微分形式理论。 -/
theorem exteriorDerivativeOfBerryConnection_gauge_invariant_model
    (L : BlochTheorem.Lattice2D) (A : BerryConnection1Form L)
    (θ : BlochTheorem.CrystalMomentum2D → ℂ)
    (hgauge : ContDiff ℝ 2 θ) (k : BlochTheorem.CrystalMomentum2D)
    (hX : DifferentiableAt ℝ A.componentX k)
    (hY : DifferentiableAt ℝ A.componentY k) :
    exteriorDerivativeOfBerryConnection_model L (gaugeTransform1Form_model L A θ) k
      = exteriorDerivativeOfBerryConnection_model L A k := by
  have hdθ : DifferentiableAt ℝ (fderiv ℝ θ) k :=
    ((hgauge.fderiv_right (m := 1) le_rfl).contDiffAt (x := k)).differentiableAt one_ne_zero
  have hθx : DifferentiableAt ℝ (fun k' => fderiv ℝ θ k' realDirectionX) k :=
    hdθ.clm_apply (differentiableAt_const _)
  have hθy : DifferentiableAt ℝ (fun k' => fderiv ℝ θ k' realDirectionY) k :=
    hdθ.clm_apply (differentiableAt_const _)
  have hcomm : fderiv ℝ (fun k' => fderiv ℝ θ k' realDirectionY) k realDirectionX
      = fderiv ℝ (fun k' => fderiv ℝ θ k' realDirectionX) k realDirectionY :=
    mixed_partials_commute_of_contDiff2_complex hgauge k realDirectionY realDirectionX
  have hderivX : fderiv ℝ
      (fun k' => A.componentX k' + fderiv ℝ θ k' realDirectionX) k realDirectionY
      = fderiv ℝ A.componentX k realDirectionY
        + fderiv ℝ (fun k' => fderiv ℝ θ k' realDirectionX) k realDirectionY := by
    rw [show (fun k' => A.componentX k' + fderiv ℝ θ k' realDirectionX)
        = A.componentX + fun k' => fderiv ℝ θ k' realDirectionX from rfl]
    rw [fderiv_add hX hθx]
    rfl
  have hderivY : fderiv ℝ
      (fun k' => A.componentY k' + fderiv ℝ θ k' realDirectionY) k realDirectionX
      = fderiv ℝ A.componentY k realDirectionX
        + fderiv ℝ (fun k' => fderiv ℝ θ k' realDirectionY) k realDirectionX := by
    rw [show (fun k' => A.componentY k' + fderiv ℝ θ k' realDirectionY)
        = A.componentY + fun k' => fderiv ℝ θ k' realDirectionY from rfl]
    rw [fderiv_add hY hθy]
    rfl
  change (fderiv ℝ (fun k' => A.componentY k' + fderiv ℝ θ k' realDirectionY) k realDirectionX)
    - (fderiv ℝ (fun k' => A.componentX k' + fderiv ℝ θ k' realDirectionX) k realDirectionY)
    = fderiv ℝ A.componentY k realDirectionX - fderiv ℝ A.componentX k realDirectionY
  rw [hderivY, hderivX, hcomm]
  ring

end BerryConnection
