import FirstChernNumberModel

/-!
# 连续整数值陈数模型在区间两端的不变性

## 模块目的

证明一个有明确前提的受限结论：若一族陈数模型的整数值随实参数连续变化，
则该整数值在 `t=0` 与 `t=1` 相同。这里的连续性作为前提给出，不从能隙条件推导。

## 主要定义与定理

- `FirstChernNumber_TopologicalInvariance_model`：连续整数值模型族的两端不变性。

## 证明策略

利用整数的离散拓扑，将连续映射转换为局部常数映射；再由闭区间的预连通性，
得到任意两个区间点的函数值相等，并特化到两个端点。

## 依赖关系

依赖 `FirstChernNumberModel` 提供的整数值字段和 Mathlib 的局部常数、预连通理论。
本定理不证明一般陈数整数性、曲率连续性或能隙保持下的完整微扰理论。
-/

namespace BerryCurvature

open Real Complex Set MeasureTheory intervalIntegral

variable {L : BlochTheorem.Lattice2D}

/-- **定理**：连续整数值陈数模型族在区间两端具有相同的整数值。

**证明思路**：由整数的离散拓扑把连续性转为局部常数性，再使用闭区间的预连通性。

**物理意义**：建立从连续整数值到两端不变性的逻辑环节；连续性仍需由具体物理模型证明。 -/
theorem FirstChernNumber_TopologicalInvariance_model
    (C : ℝ → FirstChernNumberModel (L := L))
    (hval : Continuous (fun t : ℝ => (C t).value)) :
    (C 0).value = (C 1).value := by
  have hloc : IsLocallyConstant (fun t : ℝ => (C t).value) :=
    (IsLocallyConstant.iff_continuous _).2 hval
  exact hloc.apply_eq_of_isPreconnected (s := Set.Icc (0 : ℝ) 1) isPreconnected_Icc
    (by norm_num) (by norm_num)

end BerryCurvature
