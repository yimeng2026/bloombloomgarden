import Mathlib
import BlochTheorem
import BerryConnection

/-!
# Berry 联络的恒等规范变换：可计算定义与证明

## 模块目的

用与原结构一致的实值 `CrystalMomentum2D → Fin 2 → ℝ` 联络分量定义规范变换，
证明零相位恒等变换严格保持联络，替代原 `BerryConnection.lean` 中的 `True` 占位。

## 主要定义与定理

- `realDirectionX`、`realDirectionY`：动量空间的坐标方向。
- `gaugeTransformConnection2D`：`A′μ(k)=Aμ(k)+∂μθ(k)`。
- `BerryConnection_GaugeTransformationIdentity_concrete`：`θ=0` 时变换后的联络等于原联络。

## 证明策略

逐点、逐 `Fin 2` 分量展开定义，零函数的 Fréchet 导数由 mathlib 化简为零，
再以函数外延性和 `Fin.cases` 完成证明。无需借用原规范变换律公理。

## 依赖关系

使用原项目的 `BlochTheorem`、`BerryConnection` 类型和 pin 定 mathlib。
不调用原 `BerryConnection_GaugeTransformationIdentity` 或 `BerryConnection_GaugeTransformationLaw`。
-/

namespace BerryConnection

open Real Complex Set MeasureTheory intervalIntegral

/-- **定义**：恢复 `CrystalMomentum2D=ℝ×ℝ` 的局部范数结构。

**证明思路**：直接委托积空间的现有实例，不引入新假设。

**物理意义**：为动量空间中的导数提供距离和拓扑结构。 -/
noncomputable local instance : NormedAddCommGroup BlochTheorem.CrystalMomentum2D :=
  inferInstanceAs (NormedAddCommGroup (ℝ × ℝ))

/-- **定义**：恢复 `CrystalMomentum2D=ℝ×ℝ` 的实向量空间结构。

**证明思路**：直接委托积空间的现有 `NormedSpace` 实例。

**物理意义**：允许对联络和规范相位取 Fréchet 导数。 -/
noncomputable local instance : NormedSpace ℝ BlochTheorem.CrystalMomentum2D :=
  inferInstanceAs (NormedSpace ℝ (ℝ × ℝ))

/-- **定义**：实值动量空间的 x 单位方向。

**证明思路**：取积空间坐标 `(1,0)`。

**物理意义**：对应联络规范变换中的 `∂xθ`。 -/
noncomputable def realDirectionX : BlochTheorem.CrystalMomentum2D := (1, 0)

/-- **定义**：实值动量空间的 y 单位方向。

**证明思路**：取积空间坐标 `(0,1)`。

**物理意义**：对应联络规范变换中的 `∂yθ`。 -/
noncomputable def realDirectionY : BlochTheorem.CrystalMomentum2D := (0, 1)

/-- **定义**：实值二维联络的规范变换 `A′μ(k)=Aμ(k)+∂μθ(k)`。

**证明思路**：以 `Fin 2` 选择 x 或 y 方向的 Fréchet 导数并加到原分量上。

**物理意义**：表示 Abel 相位选择在局部实值联络分量上的加法作用。 -/
noncomputable def gaugeTransformConnection2D
    (L : BlochTheorem.Lattice2D)
    (connection : BlochTheorem.CrystalMomentum2D → Fin 2 → ℝ)
    (gauge : GaugeTransformation L) :
    BlochTheorem.CrystalMomentum2D → Fin 2 → ℝ :=
  fun k μ => connection k μ + if μ = 0 then
    fderiv ℝ gauge.theta k realDirectionX else fderiv ℝ gauge.theta k realDirectionY

/-- **定理**：零相位恒等规范变换保持实值联络的所有分量。

**证明思路**：先以函数外延性引入 `k`、`μ`，再对 `μ : Fin 2` 分情况，
利用零函数导数为零和加法零元化简。

**物理意义**：不做相位旋转不会改变 Berry 联络。这是规范变换群恒等元的基本边界条件。 -/
theorem BerryConnection_GaugeTransformationIdentity_concrete
    (L : BlochTheorem.Lattice2D)
    (connection : BlochTheorem.CrystalMomentum2D → Fin 2 → ℝ) :
    let idGauge : GaugeTransformation L := { theta := fun _ => 0, smoothness := True }
    gaugeTransformConnection2D L connection idGauge = connection := by
  intro idGauge
  funext k μ
  fin_cases μ <;> simp [gaugeTransformConnection2D, idGauge, realDirectionX, realDirectionY]

end BerryConnection
