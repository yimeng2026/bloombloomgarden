/-
  TOE-SYLVA 研究级命题求解
  命题: BerryCurvature_GaugeInvariance (BerryCurvature.lean:129)
  难度: 局部扩展级 (~20h)
  内容: Berry 曲率的规范不变性

  证明路径:
  Berry 曲率 F = ∇ × A (三维) 或 F_{ij} = ∂_i A_j - ∂_j A_i (一般)
  在规范变换 A → A - ∇φ 下:
  F' = ∇ × (A - ∇φ) = ∇ × A - ∇ × ∇φ = F - 0 = F
  这是因为梯度的旋度为零: curl(grad φ) = 0

  这是 Berry 曲率作为物理可观测量（如霍尔电导）的基本性质。

  ============================================================
  sweep8 T2a 清偿记录（2026-09-05, sweep8执行员B1）
  ============================================================
  1. 修复潜在解析损坏：原文件全文使用未定义的 `ℝ³`/`ℝ²` 记号
     （mathlib 无此记号，文件从未通过 elaboration），现补 notation。
  2. 两条 Clairaut 型公理（二阶混合偏导交换）已用 mathlib 委托清偿：
       clairaut_schwarz_commute（三维）、clairaut_2d_commute（二维）
     委托链：ContDiffAt.isSymmSndFDerivAt（C² ⟹ 二阶导数对称，
     Mathlib/Analysis/Calculus/FDeriv/Symmetric.lean）
     + fderiv_clm_apply（CLM 求值的链式法则，FDeriv/CompCLM.lean）桥接。
     原公理陈述中 `(i j : ℕ)` 与 `Pi.single j 1` 类型不配
     （索引应为 Fin 3），已修正为 `(i j : Fin 3)`。
  3. curl_linear_subtraction（旋度线性性）已于 2026-11-08 清偿为 theorem：
     原公理缺少可微性前提，现已为 A、B 及主定理的联络 A 补齐。
  原两条 Clairaut 公理行存档于该历史报告；当前文件不再含自定义 axiom。
-/

import Mathlib

/-- sweep8：ℝ³/ℝ² 原文件未定义，按标准函数空间展开（与 EuclideanSpace 同构） -/
notation "ℝ³" => Fin 3 → ℝ
notation "ℝ²" => Fin 2 → ℝ

section

/- 参数空间: ℝ³ (动量空间) -/
variable (k : ℝ³)

/- Berry 联络 A: ℝ³ → ℝ³ -/
variable (A : ℝ³ → ℝ³)

/- 规范变换 φ: ℝ³ → ℝ -/
variable (φ : ℝ³ → ℝ)

/-
  三维旋度的定义
  curl A = (∂₂A₃ - ∂₃A₂, ∂₃A₁ - ∂₁A₃, ∂₁A₂ - ∂₂A₁)
  sweep8 修复：∂₁/∂₂/∂₃ 中 `∂` 是 mathlib 偏导记号的保留符号，不能作标识符，
  重命名为 D1/D2/D3；另将 curl 前移至 BerryCurvature 之前（修复前向引用）。
-/
noncomputable def curl (A : ℝ³ → ℝ³) (k : ℝ³) : ℝ³ :=
  let A₁ := fun k => A k 0
  let A₂ := fun k => A k 1
  let A₃ := fun k => A k 2
  let D1 := fun f => fderiv ℝ f k (Pi.single 0 1)
  let D2 := fun f => fderiv ℝ f k (Pi.single 1 1)
  let D3 := fun f => fderiv ℝ f k (Pi.single 2 1)
  ![D2 A₃ - D3 A₂, D3 A₁ - D1 A₃, D1 A₂ - D2 A₁]

/-
  Berry 曲率: F = ∇ × A (旋度)
  在二维情况下: F_{xy} = ∂_x A_y - ∂_y A_x
-/
noncomputable def BerryCurvature (A : ℝ³ → ℝ³) (k : ℝ³) : ℝ³ :=
  curl A k

/-
  梯度的定义
  ∇φ = (∂₁φ, ∂₂φ, ∂₃φ)
-/
noncomputable def gradient3D (φ : ℝ³ → ℝ) (k : ℝ³) : ℝ³ :=
  let D1 := fderiv ℝ φ k (Pi.single 0 1)
  let D2 := fderiv ℝ φ k (Pi.single 1 1)
  let D3 := fderiv ℝ φ k (Pi.single 2 1)
  ![D1, D2, D3]

/-
  规范变换: A' = A - ∇φ
  sweep8 修复：补 noncomputable（依赖 noncomputable 的 gradient3D）
-/
noncomputable def gaugeTransform3D (A : ℝ³ → ℝ³) (φ : ℝ³ → ℝ) : ℝ³ → ℝ³ :=
  fun k => A k - gradient3D φ k

/-
  sweep8 新增（两条 Clairaut 公理的公共委托核）：
  C² 函数的混合偏导数可交换 (Clairaut/Schwarz 定理)。
  委托链：
  - ContDiffAt.isSymmSndFDerivAt: C² ⟹ IsSymmSndFDerivAt（二阶导数对称）
  - fderiv_clm_apply: fderiv (fun y => c y (u y)) 的链式展开，
    取 u ≡ 常值方向 v，得 fderiv (fun y => fderiv φ y v) = (fderiv (fderiv φ)).flip v
-/
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

/-
  辅助定理 1（原公理 clairaut_schwarz_commute，sweep8 清偿）:
  C² 函数混合偏导数可交换 (Clairaut/Schwarz 定理)
  原公理陈述的 `(i j : ℕ) (hi : i < 3) (hj : j < 3)` 与 `Pi.single j 1`
  类型不配（Pi.single 的索引应为 Fin 3），已修正为 `(i j : Fin 3)`。
-/
theorem clairaut_schwarz_commute {φ : ℝ³ → ℝ} (hφ : ContDiff ℝ 2 φ) (k : ℝ³)
    (i j : Fin 3) :
    fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single j 1)) k (Pi.single i 1)
    = fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single i 1)) k (Pi.single j 1) :=
  mixed_partials_commute_of_contDiff2 hφ k (Pi.single j 1) (Pi.single i 1)

/-- **定理**：若向量场 `A`、`B` 在 `k` 点可微，则
`curl(A - B) = curl A - curl B`。

**证明思路**：由 `differentiableAt_pi` 将向量可微性严格转为各分量可微性，
再使用 `fderiv_sub` 和环代数逐分量证明。

**物理意义**：规范变换前后 Berry 曲率可以分解为原曲率与梯度曲率之差。
原公理缺少可微性前提，不能直接保留；本定理同时修正命题和证明。 -/
theorem curl_linear_subtraction (A B : ℝ³ → ℝ³) (k : ℝ³)
    (hA : DifferentiableAt ℝ A k) (hB : DifferentiableAt ℝ B k) :
    curl (fun k' => A k' - B k') k = curl A k - curl B k := by
  have hA' : ∀ i, DifferentiableAt ℝ (fun k' => A k' i) k := differentiableAt_pi.mp hA
  have hB' : ∀ i, DifferentiableAt ℝ (fun k' => B k' i) k := differentiableAt_pi.mp hB
  have hsub (i : Fin 3) : (fun k' => A k' i - B k' i)
      = (fun k' => A k' i) - (fun k' => B k' i) := rfl
  ext i
  fin_cases i <;> simp [curl, hsub, fderiv_sub (hA' _) (hB' _)] <;> ring

/-
  核心定理: 梯度的旋度为零
  curl(grad φ) = 0

  证明:
  curl(grad φ)_i = ε_{ijk} ∂_j (∂_k φ)
                 = ε_{ijk} ∂_j ∂_k φ
  由于 ∂_j ∂_k φ = ∂_k ∂_j φ (Clairaut 定理，光滑函数二阶导数可交换)
  而 ε_{ijk} = -ε_{ikj} (Levi-Civita 符号的反对称性)
  所以 ε_{ijk} ∂_j ∂_k φ = -ε_{ikj} ∂_j ∂_k φ = -ε_{ikj} ∂_k ∂_j φ
  令 m = k, n = j: ε_{imn} ∂_m ∂_n φ = -ε_{imn} ∂_m ∂_n φ
  所以 2 × curl(grad φ)_i = 0, 即 curl(grad φ)_i = 0
-/
theorem curl_of_gradient_zero
    (φ : ℝ³ → ℝ) (k : ℝ³)
    (hφ : ContDiff ℝ 2 φ) :
    curl (gradient3D φ) k = 0 := by
  /- 展开旋度的定义 -/
  simp [curl, gradient3D]
  constructor
  · -- 第一分量: ∂₂(∂₃φ) - ∂₃(∂₂φ) = 0
    /- 使用 Clairaut/Schwarz 定理（原公理，sweep8 已清偿） -/
    have h_comm : fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single 2 1)) k (Pi.single 1 1)
        = fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single 1 1)) k (Pi.single 2 1) :=
      clairaut_schwarz_commute hφ k 1 2
    linarith
  · constructor
    · -- 第二分量: ∂₃(∂₁φ) - ∂₁(∂₃φ) = 0
      have h_comm : fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single 0 1)) k (Pi.single 2 1)
          = fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single 2 1)) k (Pi.single 0 1) :=
        clairaut_schwarz_commute hφ k 2 0
      linarith
    · -- 第三分量: ∂₁(∂₂φ) - ∂₂(∂₁φ) = 0
      have h_comm : fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single 1 1)) k (Pi.single 0 1)
          = fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single 0 1)) k (Pi.single 1 1) :=
        clairaut_schwarz_commute hφ k 0 1
      linarith

/-
  核心定理: Berry 曲率在规范变换下不变
  F' = F
-/
/-- **定理**：若 `φ∈C²` 且向量联络 `A` 在 `k` 点可微，则三维 Berry 曲率在
`A ↦ A - ∇φ` 下不变。

**证明思路**：由 `C²` 推出梯度各分量可微，以 `curl_linear_subtraction` 分解旋度，
再用混合偏导交换证明 `curl(∇φ)=0`。

**物理意义**：三维 Abel 规范相位不改变 Berry 曲率；本定理不依赖自定义公理。 -/
theorem BerryCurvature_gauge_invariance
    (A : ℝ³ → ℝ³) (φ : ℝ³ → ℝ)
    (hφ : ContDiff ℝ 2 φ) (k : ℝ³)
    (hA : DifferentiableAt ℝ A k) :
    BerryCurvature (gaugeTransform3D A φ) k = BerryCurvature A k := by
  have hdφ : DifferentiableAt ℝ (fderiv ℝ φ) k :=
    ((hφ.fderiv_right (m := 1) le_rfl).contDiffAt (x := k)).differentiableAt one_ne_zero
  have hgrad : DifferentiableAt ℝ (gradient3D φ) k := by
    apply differentiableAt_pi.mpr
    intro i
    fin_cases i <;> simp [gradient3D] <;> exact hdφ.clm_apply (differentiableAt_const _)
  unfold BerryCurvature gaugeTransform3D
  have h_curl_diff : curl (fun k' => A k' - gradient3D φ k') k
      = curl A k - curl (gradient3D φ) k := by
    exact curl_linear_subtraction A (gradient3D φ) k hA hgrad
  rw [h_curl_diff, curl_of_gradient_zero φ k hφ]
  simp

/-
  辅助定理 3（原公理 clairaut_2d_commute，sweep8 清偿）: 二维 Clairaut 定理
  ∂_x ∂_y φ = ∂_y ∂_x φ
-/
theorem clairaut_2d_commute {φ : ℝ² → ℝ} (hφ : ContDiff ℝ 2 φ) (k : ℝ²) :
    fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single 1 1)) k (Pi.single 0 1)
    = fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single 0 1)) k (Pi.single 1 1) :=
  mixed_partials_commute_of_contDiff2 hφ k (Pi.single 1 1) (Pi.single 0 1)

/-
  推论: 二维情况下的 Berry 曲率规范不变性
  F_{xy} = ∂_x A_y - ∂_y A_x
  sweep8 修复：原陈述缺少 A₁、A₂ 的可微性假设（fderiv 减法拆分不成立），
  数学上不可证；补 hA₁/hA₂ 后诚实证明。
-/
theorem BerryCurvature2D_gauge_invariance
    (A₁ A₂ : ℝ² → ℝ) (φ : ℝ² → ℝ)
    (hφ : ContDiff ℝ 2 φ) (k : ℝ²)
    (hA₁ : DifferentiableAt ℝ A₁ k) (hA₂ : DifferentiableAt ℝ A₂ k) :
    let F_xy := fun k' => fderiv ℝ A₂ k' (Pi.single 0 1) - fderiv ℝ A₁ k' (Pi.single 1 1)
    let A₁' := fun k' => A₁ k' - fderiv ℝ φ k' (Pi.single 0 1)
    let A₂' := fun k' => A₂ k' - fderiv ℝ φ k' (Pi.single 1 1)
    let F_xy' := fun k' => fderiv ℝ A₂' k' (Pi.single 0 1) - fderiv ℝ A₁' k' (Pi.single 1 1)
    F_xy' k = F_xy k := by
  /- F'_xy = ∂_x A'_y - ∂_y A'_x
           = ∂_x (A_y - ∂_y φ) - ∂_y (A_x - ∂_x φ)
           = ∂_x A_y - ∂_x ∂_y φ - ∂_y A_x + ∂_y ∂_x φ
           = ∂_x A_y - ∂_y A_x  (因为 ∂_x ∂_y φ = ∂_y ∂_x φ)
           = F_xy -/
  have hdφ : DifferentiableAt ℝ (fderiv ℝ φ) k :=
    ((hφ.fderiv_right (m := 1) le_rfl).contDiffAt (x := k)).differentiableAt one_ne_zero
  have hφd₁ : DifferentiableAt ℝ (fun k' => fderiv ℝ φ k' (Pi.single 1 1)) k :=
    hdφ.clm_apply (differentiableAt_const _)
  have hφd₀ : DifferentiableAt ℝ (fun k' => fderiv ℝ φ k' (Pi.single 0 1)) k :=
    hdφ.clm_apply (differentiableAt_const _)
  /- 使用 Clairaut 定理（原公理，sweep8 已清偿） -/
  have h_comm : fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single 1 1)) k (Pi.single 0 1)
      = fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single 0 1)) k (Pi.single 1 1) :=
    clairaut_2d_commute hφ k
  have e1 : fderiv ℝ (fun k' => A₂ k' - fderiv ℝ φ k' (Pi.single 1 1)) k (Pi.single 0 1)
      = fderiv ℝ A₂ k (Pi.single 0 1)
        - fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single 1 1)) k (Pi.single 0 1) := by
    rw [show (fun k' => A₂ k' - fderiv ℝ φ k' (Pi.single 1 1))
        = A₂ - fun k' => fderiv ℝ φ k' (Pi.single 1 1) from rfl]
    rw [fderiv_sub hA₂ hφd₁]
    rfl
  have e2 : fderiv ℝ (fun k' => A₁ k' - fderiv ℝ φ k' (Pi.single 0 1)) k (Pi.single 1 1)
      = fderiv ℝ A₁ k (Pi.single 1 1)
        - fderiv ℝ (fun k' => fderiv ℝ φ k' (Pi.single 0 1)) k (Pi.single 1 1) := by
    rw [show (fun k' => A₁ k' - fderiv ℝ φ k' (Pi.single 0 1))
        = A₁ - fun k' => fderiv ℝ φ k' (Pi.single 0 1) from rfl]
    rw [fderiv_sub hA₁ hφd₀]
    rfl
  show fderiv ℝ (fun k' => A₂ k' - fderiv ℝ φ k' (Pi.single 1 1)) k (Pi.single 0 1)
      - fderiv ℝ (fun k' => A₁ k' - fderiv ℝ φ k' (Pi.single 0 1)) k (Pi.single 1 1)
      = fderiv ℝ A₂ k (Pi.single 0 1) - fderiv ℝ A₁ k (Pi.single 1 1)
  rw [e1, e2, h_comm]
  ring

end
