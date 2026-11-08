import BerryCurvature

/-!
# Berry 曲率的实际定义与零曲率实例

## 模块目的

把旧 `BerryCurvature.definition : Prop` 精炼为曲率字段与联络方向导数反对称差的等式，
并构造零联络、零曲率实例验证该定义可以实际使用。

## 主要定义与定理

- `curvatureXYFromBerryConnection_model`：由旧联络复值分量计算曲率。
- `BerryCurvatureModel`：带实际曲率定义等式的结构。
- `zeroBerryConnectionRecord`、`zeroBerryCurvatureModel`：可计算零输入和零实例。

## 证明策略

曲率直接由两个联络分量的 Fréchet 导数定义。零实例先展开这些定义，
再由零函数导数化简证明字段等式；不把旧 Prop 当作证明。

## 依赖关系

依赖修补后的 `BerryCurvature`、联络类型和共享坐标方向。
本模块只处理二维分量定义，不宣称完整外微分、陈类或规范微扰已经形式化。
-/

namespace BerryCurvature

open Real Complex Set MeasureTheory intervalIntegral

variable {L : BlochTheorem.Lattice2D}

/-- **定义**：由旧 Berry 联络的复值分量计算实际曲率。

**证明思路**：对索引 1 的分量沿 x、索引 0 的分量沿 y 取 Fréchet 导数并相减。

**物理意义**：给出二维 Berry 曲率的实际计算对象。 -/
noncomputable def curvatureXYFromBerryConnection_model
    (A : BerryConnection.BerryConnection L) (k : BlochTheorem.CrystalMomentum2D) : ℂ :=
  fderiv ℝ (fun k' => A.connection k' 1) k BerryConnection.realDirectionX
    - fderiv ℝ (fun k' => A.connection k' 0) k BerryConnection.realDirectionY

/-- **定义**：带实际曲率定义等式的 Berry 曲率模型。

**证明思路**：以 `definition` 约束曲率字段等于联络分量的方向导数反对称差。

**物理意义**：消除曲率函数与联络导数之间无约束的 Prop。 -/
structure BerryCurvatureModel (L : BlochTheorem.Lattice2D) where
  /-- 能带指标。 -/
  n : BlochTheorem.BandIndex
  /-- 产生曲率的旧 Berry 联络。 -/
  berryConnection : BerryConnection.BerryConnection L
  /-- 曲率的复值二维分量。 -/
  curvatureXY : BlochTheorem.CrystalMomentum2D → ℂ
  /-- 曲率字段等于联络分量的实际方向导数反对称差。 -/
  definition : curvatureXY = fun k => curvatureXYFromBerryConnection_model berryConnection k

/-- **定义**：用于零曲率实例的零联络记录。

**证明思路**：波函数和联络分量显式置零，旧 Prop 仅保留为记录字段。

**物理意义**：提供可计算的零联络输入。 -/
noncomputable def zeroBerryConnectionRecord : BerryConnection.BerryConnection L where
  n := (0 : ℕ)
  state := {
    n := (0 : ℕ)
    wavefunction := fun _ _ => 0
    periodicity := True
    normalization := True
  }
  connection := fun _ _ => 0
  definition := True

/-- **定义**：零联络产生的零曲率模型实例。

**证明思路**：展开实际曲率和零联络，以零函数导数证明定义等式。

**物理意义**：验证精炼结构可以实际实例化。 -/
noncomputable def zeroBerryCurvatureModel : BerryCurvatureModel (L := L) where
  n := (0 : ℕ)
  berryConnection := zeroBerryConnectionRecord (L := L)
  curvatureXY := fun _ => 0
  definition := by
    funext k
    simp [curvatureXYFromBerryConnection_model, zeroBerryConnectionRecord]

end BerryCurvature
