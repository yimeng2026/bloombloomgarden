import BerryConnectionGaugeIdentity

/-!
# Berry 联络规范变换的复合：导数加法与共享实例

## 模块目的

证明依次施加 `θ₁`、`θ₂` 的实值联络规范变换，等于一次施加 `θ₁+θ₂`。
本模块替换原 `BerryConnection.lean` 中复合命题的 `True` 占位。

## 主要定义与定理

- 复用 `gaugeTransformConnection2D` 和共享范数／向量空间实例。
- `BerryConnection_GaugeTransformComposition_concrete`：两次变换与相位求和的一致性。

## 证明策略

由 `fderiv_add` 得到 `∂(θ₁+θ₂)=∂θ₁+∂θ₂`，再对等式取 x、y 坐标方向的标量值，
逐分量完成代数相消。两个相位的可微性是显式前提。

## 依赖关系

依赖 `BerryConnectionGaugeIdentity` 及其导出的共享类型类实例。
不调用原复合占位或一般规范变换律公理。顺序补丁必须先应用恒等补丁。
-/

namespace BerryConnection

open Real Complex Set MeasureTheory intervalIntegral

/-- **定理**：若 `θ₁`、`θ₂` 在 `k` 点可微，则依次施加两个规范变换，
等于一次施加 `θ₁+θ₂`。

**证明思路**：用 `fderiv_add` 展开相位和的导数，再分别取 `(1,0)`、`(0,1)` 的标量值，
使用函数外延性和环代数完成证明。共享实例保证定义中的 `fderiv` 与假设中的 `fderiv` 相同。

**物理意义**：局部 Abel 相位旋转按加法复合，联络规范变换保持这一群结构。 -/
theorem BerryConnection_GaugeTransformComposition_concrete
    (L : BlochTheorem.Lattice2D)
    (connection : BlochTheorem.CrystalMomentum2D → Fin 2 → ℝ)
    (gauge1 gauge2 : GaugeTransformation L) (k : BlochTheorem.CrystalMomentum2D)
    (hθ1 : DifferentiableAt ℝ gauge1.theta k)
    (hθ2 : DifferentiableAt ℝ gauge2.theta k) :
    gaugeTransformConnection2D L (gaugeTransformConnection2D L connection gauge1) gauge2 k
    = gaugeTransformConnection2D L connection
      { theta := fun k' => gauge1.theta k' + gauge2.theta k', smoothness := True } k := by
  have hsum : (fun k' => gauge1.theta k' + gauge2.theta k') = gauge1.theta + gauge2.theta := rfl
  have hadd : fderiv ℝ (fun k' => gauge1.theta k' + gauge2.theta k') k
      = fderiv ℝ gauge1.theta k + fderiv ℝ gauge2.theta k := by
    rw [hsum, fderiv_add hθ1 hθ2]
  have haddX : (fderiv ℝ (fun k' => gauge1.theta k' + gauge2.theta k') k) (1, 0)
      = (fderiv ℝ gauge1.theta k) (1, 0) + (fderiv ℝ gauge2.theta k) (1, 0) := by
    simpa using congrArg (fun D => D (1, 0)) hadd
  have haddY : (fderiv ℝ (fun k' => gauge1.theta k' + gauge2.theta k') k) (0, 1)
      = (fderiv ℝ gauge1.theta k) (0, 1) + (fderiv ℝ gauge2.theta k) (0, 1) := by
    simpa using congrArg (fun D => D (0, 1)) hadd
  funext μ
  fin_cases μ
  · simp [gaugeTransformConnection2D, realDirectionX]
    rw [haddX]
    ring
  · simp [gaugeTransformConnection2D, realDirectionY]
    rw [haddY]
    ring

end BerryConnection
