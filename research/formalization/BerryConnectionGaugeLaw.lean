import Mathlib

/-!
# Berry 联络的一般规范变换律：Hilbert 内积推导

## 模块目的

在明确的复 Hilbert 空间中定义实际 Berry 联络 `I·inner(u, fderiv u)`，
证明相位旋转 `u↦exp(iθ)•u` 下的规范变换律 `A′=A−dθ`，替代原公理的空 `True`。

## 主要定义与定理

- `berryConnection`：由态曲线及其 Fréchet 导数定义的实际联络。
- `phaseFactor`：实相位对应的复 U(1) 相位因子。
- `BerryConnection_GaugeTransformationLaw_physical`：带归一化和可微性前提的物理规范律。

## 证明策略

由 `HasFDerivAt.cexp` 和 `fderiv_smul` 展开相位态导数，利用内积对第一变量的共轭线性、
第二变量的线性、归一化等式及 `I²=-1` 完成代数相消。

## 依赖关系

只依赖 pin 定 mathlib。旧 `NormalizedBlochState` 的归一化和内积性质仅为未约束 `Prop`，
不能直接使用；本模块以 `InnerProductSpace ℂ H` 和显式 `inner(u,u)=1` 补足最小证据。
-/

namespace BerryConnection

open Real Complex Set MeasureTheory intervalIntegral

variable {M : Type*} [NormedAddCommGroup M] [NormedSpace ℝ M]
variable {H : Type*} [NormedAddCommGroup H] [InnerProductSpace ℂ H]
  [NormedSpace ℝ H] [IsScalarTower ℝ ℂ H]

/-- **定义**：态曲线 `u` 在方向 `v` 上的实际 Berry 联络 `I·inner(u, ∂v u)`。

**证明思路**：定义直接包含态及其 Fréchet 导数，不把联络留作无约束字段。

**物理意义**：描述归一化量子态沿参数方向变化时的 Berry 几何联络。 -/
noncomputable def berryConnection (u : M → H) (k : M) (v : M) : ℂ :=
  Complex.I * inner ℂ (u k) (fderiv ℝ u k v)

/-- **定义**：实相位 `θ` 的 U(1) 因子 `exp(iθ)`。

**证明思路**：先将实相位 coercion 到复数，再乘虚数单位并取复指数。

**物理意义**：表示量子态的局部 Abel 相位旋转。 -/
noncomputable def phaseFactor (θ : M → ℝ) (k : M) : ℂ :=
  Complex.exp (Complex.I * (θ k : ℂ))

/-- **定理**：若 `θ`、`u` 在 `k` 点可微且 `inner(u(k),u(k))=1`，则
`u↦exp(iθ)•u` 使实际 Berry 联络变为 `A−dθ`。

**证明思路**：用 `HasFDerivAt.cexp` 得到相位导数，以 `fderiv_smul` 展开态导数；
再展开内积并代入归一化、相位模和 `I²=-1`。

**物理意义**：局部相位选择只给联络增加一个恰当形式，不改变其外微分。
本定理使用 `A=I·inner(u,du)` 的符号约定，因此右端为 `A−dθ`。 -/
theorem BerryConnection_GaugeTransformationLaw_physical
    (u : M → H) (θ : M → ℝ) (k v : M)
    (hθ : DifferentiableAt ℝ θ k) (hu : DifferentiableAt ℝ u k)
    (hnorm : inner ℂ (u k) (u k) = 1) :
    berryConnection (fun k' => phaseFactor θ k' • u k') k v
    = berryConnection u k v - fderiv ℝ (fun k' => (θ k' : ℂ)) k v := by
  have hθC : DifferentiableAt ℝ (fun k' => (θ k' : ℂ)) k :=
    Complex.ofRealCLM.differentiableAt.comp k hθ
  have hIθ : DifferentiableAt ℝ (fun k' => Complex.I * (θ k' : ℂ)) k := by
    exact (differentiableAt_const Complex.I).mul hθC
  have hIθ' : HasFDerivAt (fun k' => Complex.I * (θ k' : ℂ))
      (Complex.I • fderiv ℝ (fun k' => (θ k' : ℂ)) k) k := by
    convert hIθ.hasFDerivAt using 1
    exact (fderiv_const_mul hθC Complex.I).symm
  have hphase : HasFDerivAt (fun k' => phaseFactor θ k')
      (phaseFactor θ k • (Complex.I • fderiv ℝ (fun k' => (θ k' : ℂ)) k)) k := by
    exact hIθ'.cexp
  have huv : fderiv ℝ (fun k' => phaseFactor θ k' • u k') k v
      = phaseFactor θ k • fderiv ℝ u k v
        + (phaseFactor θ k * (Complex.I * (fderiv ℝ (fun k' => (θ k' : ℂ)) k v))) • u k := by
    have h := (hphase.smul hu.hasFDerivAt).fderiv
    simpa [ContinuousLinearMap.smulRight_apply, ContinuousLinearMap.smul_apply, smul_eq_mul]
      using congrArg (fun D => D v) h
  have hphase_norm : (starRingEnd ℂ) (phaseFactor θ k) * phaseFactor θ k = 1 := by
    simp only [phaseFactor, ← Complex.exp_conj, ← Complex.exp_add]
    simp
  have hnorm' : (‖u k‖ : ℂ) ^ 2 = 1 := by
    exact (inner_self_eq_norm_sq_to_K (u k)).symm.trans hnorm
  have hphase_norm' : phaseFactor θ k * (starRingEnd ℂ) (phaseFactor θ k) = 1 := by
    rw [mul_comm]
    exact hphase_norm
  unfold berryConnection
  rw [huv]
  simp [inner_add_right, inner_smul_left, inner_smul_right, hnorm', hphase_norm, pow_two, Complex.I_mul_I]
  ring_nf
  linear_combination (Complex.I * inner ℂ (u k) (fderiv ℝ u k v)) * hphase_norm'
    + (fderiv ℝ (fun k' => (θ k' : ℂ)) k v) * Complex.I_sq
    + (Complex.I ^ 2 * (fderiv ℝ (fun k' => (θ k' : ℂ)) k v)) * hphase_norm'

end BerryConnection
