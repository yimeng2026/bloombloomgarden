export interface SylvaModule {
  id: string;
  name: string;
  path: string;
  category: string;
  lines: number;
  sorryCount: number;
  status: "complete" | "incomplete" | "research" | "legacy";
  theorems: string[];
  definitions: string[];
  dependencies: string[];
}

export interface Paper {
  id: string;
  title: string;
  status: "solved" | "open" | "partial" | "research";
  field: string;
  year: number;
  author: string;
  abstract: string;
  milestones: { year: number; event: string }[];
  sylvaStatus: string;
  leanSnippets: number;
  relatedModules: string[];
}

export interface ResearchNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  relatedModule?: string;
  relatedPaper?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationStats {
  category: string;
  sorryCount: number;
  color: string;
}

export interface Activity {
  id: string;
  type: "theorem_proven" | "sorry_closed" | "module_complete" | "paper_linked" | "definition_added";
  message: string;
  module?: string;
  paper?: string;
  timestamp: string;
}

// ==================== 真实数据 ====================

// 按学科分类的模块列表（基于 TOE-SYLVA 的 lakefile.lean 结构）
export const modules: SylvaModule[] = [
  // 集合论 / 逻辑
  { id: "set-01", name: "ZF-Axioms", path: "SetTheory/ZFAxioms", category: "集合论/逻辑", lines: 1240, sorryCount: 0, status: "complete", theorems: ["Extensionality", "Pairing", "Union", "PowerSet", "Infinity"], definitions: ["Ordinal", "Cardinal", "Transfinite"], dependencies: [] },
  { id: "set-02", name: "Ordinal-Arithmetic", path: "SetTheory/OrdinalArithmetic", category: "集合论/逻辑", lines: 890, sorryCount: 0, status: "complete", theorems: ["OrdinalAddition", "OrdinalMultiplication"], definitions: ["LimitOrdinal", "SuccessorOrdinal"], dependencies: ["set-01"] },
  { id: "set-03", name: "Cardinal-Arithmetic", path: "SetTheory/CardinalArithmetic", category: "集合论/逻辑", lines: 1120, sorryCount: 3, status: "incomplete", theorems: ["CantorTheorem", "BernsteinSchroeder"], definitions: ["Aleph", "Beth", "Cofinality"], dependencies: ["set-01", "set-02"] },
  { id: "set-04", name: "Forcing", path: "SetTheory/Forcing", category: "集合论/逻辑", lines: 2100, sorryCount: 18, status: "incomplete", theorems: ["CohenForcing", "GenericExtension"], definitions: ["ForcingPoset", "DenseSet", "GenericFilter"], dependencies: ["set-01", "set-03"] },
  { id: "set-05", name: "Large-Cardinals", path: "SetTheory/LargeCardinals", category: "集合论/逻辑", lines: 1560, sorryCount: 12, status: "incomplete", theorems: ["Inaccessible", "Mahlo", "Measurable"], definitions: ["WeaklyCompact", "StronglyCompact", "Supercompact"], dependencies: ["set-03"] },
  { id: "set-06", name: "Descriptive-Set-Theory", path: "SetTheory/DescriptiveSetTheory", category: "集合论/逻辑", lines: 980, sorryCount: 5, status: "incomplete", theorems: ["BorelHierarchy", "ProjectiveSets"], definitions: ["AnalyticSet", "SuslinOperation"], dependencies: ["set-01"] },
  { id: "log-01", name: "First-Order-Logic", path: "Logic/FirstOrder", category: "集合论/逻辑", lines: 1340, sorryCount: 0, status: "complete", theorems: ["Completeness", "Compactness", "LowenheimSkolem"], definitions: ["Model", "Satisfiable", "Valid"], dependencies: [] },
  { id: "log-02", name: "Model-Theory", path: "Logic/ModelTheory", category: "集合论/逻辑", lines: 1450, sorryCount: 7, status: "incomplete", theorems: ["MorleyCategoricity", "Stability"], definitions: ["Type", "Saturation", "Homogeneity"], dependencies: ["log-01"] },
  { id: "log-03", name: "Proof-Theory", path: "Logic/ProofTheory", category: "集合论/逻辑", lines: 1180, sorryCount: 8, status: "incomplete", theorems: ["CutElimination", "GentzenConsistency"], definitions: ["Sequent", "Derivation", "NormalForm"], dependencies: ["log-01"] },
  { id: "log-04", name: "Type-Theory", path: "Logic/TypeTheory", category: "集合论/逻辑", lines: 1620, sorryCount: 4, status: "incomplete", theorems: ["StrongNormalization", "ChurchRosser"], definitions: ["DependentType", "InductiveType", "Universe"], dependencies: ["log-01"] },
  { id: "log-05", name: "HoTT-Basics", path: "Logic/HoTT", category: "集合论/逻辑", lines: 1890, sorryCount: 15, status: "incomplete", theorems: ["Univalence", "HigherInductiveTypes"], definitions: ["PathType", "Equivalence", "Contractible"], dependencies: ["log-04"] },

  // 代数
  { id: "alg-01", name: "Group-Theory", path: "Algebra/GroupTheory", category: "代数", lines: 1560, sorryCount: 0, status: "complete", theorems: ["Lagrange", "Sylow", "JordanHolder"], definitions: ["NormalSubgroup", "QuotientGroup", "SimpleGroup"], dependencies: [] },
  { id: "alg-02", name: "Ring-Theory", path: "Algebra/RingTheory", category: "代数", lines: 1340, sorryCount: 0, status: "complete", theorems: ["ChineseRemainder", "HilbertBasis"], definitions: ["Ideal", "PID", "UFD"], dependencies: ["alg-01"] },
  { id: "alg-03", name: "Field-Theory", path: "Algebra/FieldTheory", category: "代数", lines: 1200, sorryCount: 2, status: "incomplete", theorems: ["GaloisCorrespondence", "FundamentalTheorem"], definitions: ["Extension", "SplittingField", "AlgebraicClosure"], dependencies: ["alg-02"] },
  { id: "alg-04", name: "Module-Theory", path: "Algebra/ModuleTheory", category: "代数", lines: 1100, sorryCount: 0, status: "complete", theorems: ["StructureTheorem", "SmithNormalForm"], definitions: ["FreeModule", "Projective", "Injective"], dependencies: ["alg-02"] },
  { id: "alg-05", name: "Representation-Theory", path: "Algebra/RepresentationTheory", category: "代数", lines: 1450, sorryCount: 6, status: "incomplete", theorems: ["Maschke", "FrobeniusReciprocity"], definitions: ["Character", "Irreducible", "InducedRepresentation"], dependencies: ["alg-01", "alg-04"] },
  { id: "alg-06", name: "Homological-Algebra", path: "Algebra/HomologicalAlgebra", category: "代数", lines: 1380, sorryCount: 9, status: "incomplete", theorems: ["SnakeLemma", "LongExactSequence"], definitions: ["ChainComplex", "DerivedFunctor", "ExtTor"], dependencies: ["alg-04"] },
  { id: "alg-07", name: "Commutative-Algebra", path: "Algebra/CommutativeAlgebra", category: "代数", lines: 1560, sorryCount: 4, status: "incomplete", theorems: ["NoetherNormalization", "HilbertSyzygy"], definitions: ["Spectrum", "Localization", "Completion"], dependencies: ["alg-02"] },
  { id: "alg-08", name: "Lie-Algebra", path: "Algebra/LieAlgebra", category: "代数", lines: 1220, sorryCount: 5, status: "incomplete", theorems: ["WeylTheorem", "RootSystem"], definitions: ["Semisimple", "CartanSubalgebra", "DynkinDiagram"], dependencies: ["alg-01", "alg-04"] },
  { id: "alg-09", name: "Category-Theory", path: "Algebra/CategoryTheory", category: "代数", lines: 1680, sorryCount: 0, status: "complete", theorems: ["YonedaLemma", "AdjointFunctor"], definitions: ["Functor", "NaturalTransformation", "Limit"], dependencies: [] },
  { id: "alg-10", name: "Topos-Theory", path: "Algebra/ToposTheory", category: "代数", lines: 1420, sorryCount: 11, status: "incomplete", theorems: ["GeometricMorphism", "SheafTopos"], definitions: ["SubobjectClassifier", "PowerObject", "GeometricTheory"], dependencies: ["alg-09"] },

  // 数论
  { id: "nt-01", name: "Elementary-Number-Theory", path: "NumberTheory/Elementary", category: "数论", lines: 980, sorryCount: 0, status: "complete", theorems: ["EuclidTheorem", "FermatLittle", "EulerTheorem"], definitions: ["Divisibility", "Congruence", "PrimitiveRoot"], dependencies: [] },
  { id: "nt-02", name: "Algebraic-Number-Theory", path: "NumberTheory/Algebraic", category: "数论", lines: 1450, sorryCount: 3, status: "incomplete", theorems: ["DirichletUnit", "MinkowskiLattice"], definitions: ["NumberField", "RingOfIntegers", "Discriminant"], dependencies: ["nt-01", "alg-03"] },
  { id: "nt-03", name: "Analytic-Number-Theory", path: "NumberTheory/Analytic", category: "数论", lines: 1680, sorryCount: 8, status: "incomplete", theorems: ["PrimeNumberTheorem", "DirichletTheorem"], definitions: ["RiemannZeta", "DirichletCharacter", "LFunction"], dependencies: ["nt-01", "an-04"] },
  { id: "nt-04", name: "Elliptic-Curves", path: "NumberTheory/EllipticCurves", category: "数论", lines: 1920, sorryCount: 14, status: "incomplete", theorems: ["MordellWeil", "Modularity"], definitions: ["WeierstrassForm", "jInvariant", "TorsionSubgroup"], dependencies: ["nt-02", "ag-02"] },
  { id: "nt-05", name: "Class-Field-Theory", path: "NumberTheory/ClassFieldTheory", category: "数论", lines: 1560, sorryCount: 10, status: "incomplete", theorems: ["ArtinReciprocity", "TakagiExistence"], definitions: ["RayClassGroup", "Idele", "GlobalField"], dependencies: ["nt-02"] },
  { id: "nt-06", name: "Iwasawa-Theory", path: "NumberTheory/IwasawaTheory", category: "数论", lines: 1340, sorryCount: 9, status: "incomplete", theorems: ["MainConjecture", "pAdicLFunction"], definitions: ["CyclotomicExtension", "pAdicNumber", "Z_pExtension"], dependencies: ["nt-02", "nt-03"] },
  { id: "nt-07", name: "Arithmetic-Geometry", path: "NumberTheory/ArithmeticGeometry", category: "数论", lines: 1780, sorryCount: 12, status: "incomplete", theorems: ["FaltingsMordell", "ShafarevichConjecture"], definitions: ["ArithmeticSurface", "NeronModel", "HeightFunction"], dependencies: ["nt-04", "ag-07"] },

  // 分析 / PDE
  { id: "an-01", name: "Real-Analysis", path: "Analysis/RealAnalysis", category: "分析/PDE", lines: 1340, sorryCount: 0, status: "complete", theorems: ["BolzanoWeierstrass", "HeineBorel", "LebesgueDifferentiation"], definitions: ["MeasurableSet", "LebesgueIntegral", "LP space"], dependencies: [] },
  { id: "an-02", name: "Complex-Analysis", path: "Analysis/ComplexAnalysis", category: "分析/PDE", lines: 1200, sorryCount: 0, status: "complete", theorems: ["CauchyIntegral", "ResidueTheorem", "RiemannMapping"], definitions: ["Holomorphic", "Meromorphic", "AnalyticContinuation"], dependencies: ["an-01"] },
  { id: "an-03", name: "Functional-Analysis", path: "Analysis/FunctionalAnalysis", category: "分析/PDE", lines: 1560, sorryCount: 4, status: "incomplete", theorems: ["HahnBanach", "OpenMapping", "ClosedGraph"], definitions: ["BanachSpace", "HilbertSpace", "Operator"], dependencies: ["an-01"] },
  { id: "an-04", name: "Harmonic-Analysis", path: "Analysis/HarmonicAnalysis", category: "分析/PDE", lines: 1420, sorryCount: 6, status: "incomplete", theorems: ["FourierInversion", "Plancherel"], definitions: ["FourierTransform", "Distribution", "TemperedDistribution"], dependencies: ["an-03"] },
  { id: "an-05", name: "Measure-Theory", path: "Analysis/MeasureTheory", category: "分析/PDE", lines: 1180, sorryCount: 0, status: "complete", theorems: ["RadonNikodym", "Fubini", "Caratheodory"], definitions: ["SigmaAlgebra", "OuterMeasure", "ProductMeasure"], dependencies: ["an-01"] },
  { id: "an-06", name: "PDE-Theory", path: "Analysis/PDE", category: "分析/PDE", lines: 1680, sorryCount: 11, status: "incomplete", theorems: ["SobolevEmbedding", "HarnackInequality"], definitions: ["SobolevSpace", "WeakSolution", "DistributionSolution"], dependencies: ["an-03", "an-05"] },
  { id: "an-07", name: "Spectral-Theory", path: "Analysis/SpectralTheory", category: "分析/PDE", lines: 1340, sorryCount: 5, status: "incomplete", theorems: ["SpectralTheorem", "SpectralRadius"], definitions: ["Spectrum", "Resolvent", "SpectralMeasure"], dependencies: ["an-03"] },
  { id: "an-08", name: "Calculus-of-Variations", path: "Analysis/CalculusOfVariations", category: "分析/PDE", lines: 1100, sorryCount: 3, status: "incomplete", theorems: ["EulerLagrange", "DirectMethod"], definitions: ["Functional", "Variation", "WeakConvergence"], dependencies: ["an-03"] },
  { id: "an-09", name: "Dynamical-Systems", path: "Analysis/DynamicalSystems", category: "分析/PDE", lines: 1450, sorryCount: 7, status: "incomplete", theorems: ["PoincareBendixson", "KAMTheorem"], definitions: ["LimitCycle", "StrangeAttractor", "LyapunovExponent"], dependencies: ["an-01"] },
  { id: "an-10", name: "Ergodic-Theory", path: "Analysis/ErgodicTheory", category: "分析/PDE", lines: 1280, sorryCount: 4, status: "incomplete", theorems: ["BirkhoffErgodic", "PoincareRecurrence"], definitions: ["InvariantMeasure", "Mixing", "Entropy"], dependencies: ["an-05"] },

  // 拓扑
  { id: "top-01", name: "General-Topology", path: "Topology/GeneralTopology", category: "拓扑", lines: 1120, sorryCount: 0, status: "complete", theorems: ["UrysohnLemma", "TietzeExtension", "Tychonoff"], definitions: ["Compact", "Connected", "Paracompact"], dependencies: [] },
  { id: "top-02", name: "Algebraic-Topology", path: "Topology/AlgebraicTopology", category: "拓扑", lines: 1450, sorryCount: 3, status: "incomplete", theorems: ["Hurewicz", "Whitehead"], definitions: ["FundamentalGroup", "Homology", "Cohomology"], dependencies: ["top-01", "alg-01"] },
  { id: "top-03", name: "Differential-Topology", path: "Topology/DifferentialTopology", category: "拓扑", lines: 1380, sorryCount: 5, status: "incomplete", theorems: ["ThomTransversality", "SardTheorem"], definitions: ["Manifold", "TangentBundle", "MorseFunction"], dependencies: ["top-01"] },
  { id: "top-04", name: "Knot-Theory", path: "Topology/KnotTheory", category: "拓扑", lines: 1020, sorryCount: 2, status: "incomplete", theorems: ["JonesPolynomial", "AlexanderConway"], definitions: ["Knot", "Link", "ReidemeisterMove"], dependencies: ["top-02"] },
  { id: "top-05", name: "Morse-Theory", path: "Topology/MorseTheory", category: "拓扑", lines: 1180, sorryCount: 4, status: "incomplete", theorems: ["MorseInequalities", "HandlebodyDecomposition"], definitions: ["MorseIndex", "CriticalPoint", "GradientFlow"], dependencies: ["top-03"] },
  { id: "top-06", name: "Cobordism-Theory", path: "Topology/CobordismTheory", category: "拓扑", lines: 1340, sorryCount: 7, status: "incomplete", theorems: ["ThomCobordism", "HirzebruchSignature"], definitions: ["Cobordism", "CharacteristicClass", "StiefelWhitney"], dependencies: ["top-02", "top-03"] },
  { id: "top-07", name: "Geometric-Topology", path: "Topology/GeometricTopology", category: "拓扑", lines: 1200, sorryCount: 6, status: "incomplete", theorems: ["Geometrization", "MostowRigidity"], definitions: ["HyperbolicManifold", "GeometricStructure", "ThurstonNorm"], dependencies: ["top-03"] },
  { id: "top-08", name: "Higher-Category-Theory", path: "Topology/HigherCategory", category: "拓扑", lines: 1560, sorryCount: 13, status: "incomplete", theorems: ["HomotopyHypothesis", "TangleHypothesis"], definitions: ["InfinityCategory", "SimplicialSet", "QuasiCategory"], dependencies: ["top-02", "alg-09"] },
  { id: "top-09", name: "Sheaf-Theory", path: "Topology/SheafTheory", category: "拓扑", lines: 1100, sorryCount: 2, status: "incomplete", theorems: ["VerdierDuality", "PoincareDuality"], definitions: ["Sheaf", "Stalk", "EtaleSpace"], dependencies: ["top-01"] },
  { id: "top-10", name: "Operad-Theory", path: "Topology/OperadTheory", category: "拓扑", lines: 980, sorryCount: 8, status: "incomplete", theorems: ["RecognitionPrinciple", "KoszulDuality"], definitions: ["Operad", "AlgebraOverOperad", "LittleCubes"], dependencies: ["top-02"] },

  // 几何
  { id: "geo-01", name: "Euclidean-Geometry", path: "Geometry/Euclidean", category: "几何", lines: 890, sorryCount: 0, status: "complete", theorems: ["Pythagorean", "Thales"], definitions: ["Point", "Line", "Circle"], dependencies: [] },
  { id: "geo-02", name: "Differential-Geometry", path: "Geometry/DifferentialGeometry", category: "几何", lines: 1680, sorryCount: 6, status: "incomplete", theorems: ["GaussBonnet", "HopfIndex"], definitions: ["RiemannianMetric", "Curvature", "Geodesic"], dependencies: ["top-03", "an-02"] },
  { id: "geo-03", name: "Riemannian-Geometry", path: "Geometry/RiemannianGeometry", category: "几何", lines: 1820, sorryCount: 9, status: "incomplete", theorems: ["SphereTheorem", "SoulTheorem"], definitions: ["SectionalCurvature", "RicciTensor", "ScalarCurvature"], dependencies: ["geo-02"] },
  { id: "geo-04", name: "Symplectic-Geometry", path: "Geometry/SymplecticGeometry", category: "几何", lines: 1420, sorryCount: 5, status: "incomplete", theorems: ["Darboux", "ArnoldConjecture"], definitions: ["SymplecticForm", "Lagrangian", "Hamiltonian"], dependencies: ["geo-02"] },
  { id: "geo-05", name: "Algebraic-Geometry", path: "Geometry/AlgebraicGeometry", category: "几何", lines: 2100, sorryCount: 16, status: "incomplete", theorems: ["RiemannRoch", "HodgeConjecture"], definitions: ["Scheme", "Sheaf", "CoherentSheaves"], dependencies: ["alg-07", "top-09"] },
  { id: "geo-06", name: "Complex-Geometry", path: "Geometry/ComplexGeometry", category: "几何", lines: 1560, sorryCount: 7, status: "incomplete", theorems: ["KodairaEmbedding", "HodgeDecomposition"], definitions: ["ComplexManifold", "KahlerForm", "HolomorphicBundle"], dependencies: ["geo-02", "an-02"] },
  { id: "geo-07", name: "Arithmetic-Geometry", path: "Geometry/ArithmeticGeometry", category: "几何", lines: 1450, sorryCount: 11, status: "incomplete", theorems: ["MordellConjecture", "ShimuraVariety"], definitions: ["ArithmeticScheme", "ArakelovTheory", "Height"], dependencies: ["geo-05", "nt-02"] },
  { id: "geo-08", name: "String-Geometry", path: "Geometry/StringGeometry", category: "几何", lines: 1200, sorryCount: 14, status: "incomplete", theorems: ["CalabiYau", "MirrorSymmetry"], definitions: ["CalabiYauManifold", "SpinStructure", "VertexOperator"], dependencies: ["geo-06", "phy-03"] },

  // 物理
  { id: "phy-01", name: "Classical-Mechanics", path: "Physics/ClassicalMechanics", category: "物理", lines: 1100, sorryCount: 0, status: "complete", theorems: ["Noether", "Liouville", "HamiltonJacobi"], definitions: ["Lagrangian", "Hamiltonian", "Action"], dependencies: [] },
  { id: "phy-02", name: "Quantum-Mechanics", path: "Physics/QuantumMechanics", category: "物理", lines: 1560, sorryCount: 8, status: "incomplete", theorems: ["SpectralDecomposition", "Uncertainty"], definitions: ["HilbertSpace", "Observable", "State"], dependencies: ["an-03"] },
  { id: "phy-03", name: "Quantum-Field-Theory", path: "Physics/QuantumFieldTheory", category: "物理", lines: 1890, sorryCount: 18, status: "incomplete", theorems: ["WardIdentity", "ColemanMandula"], definitions: ["FockSpace", "Propagator", "VertexFunction"], dependencies: ["phy-02", "an-04"] },
  { id: "phy-04", name: "General-Relativity", path: "Physics/GeneralRelativity", category: "物理", lines: 1680, sorryCount: 12, status: "incomplete", theorems: ["EinsteinEquations", "PenroseHawking"], definitions: ["MetricTensor", "RiemannTensor", "StressEnergy"], dependencies: ["geo-03"] },
  { id: "phy-05", name: "Statistical-Mechanics", path: "Physics/StatisticalMechanics", category: "物理", lines: 1340, sorryCount: 5, status: "incomplete", theorems: ["GibbsDistribution", "PhaseTransition"], definitions: ["PartitionFunction", "FreeEnergy", "Entropy"], dependencies: ["an-10"] },
  { id: "phy-06", name: "String-Theory", path: "Physics/StringTheory", category: "物理", lines: 1450, sorryCount: 20, status: "incomplete", theorems: ["GreenSchwarz", "T-Duality"], definitions: ["Worldsheet", "VirasoroAlgebra", "StringCoupling"], dependencies: ["phy-03", "geo-08"] },
  { id: "phy-07", name: "Gauge-Theory", path: "Physics/GaugeTheory", category: "物理", lines: 1200, sorryCount: 10, status: "incomplete", theorems: ["YangMillsEquations", "Instanton"], definitions: ["Connection", "CurvatureForm", "Holonomy"], dependencies: ["geo-02"] },
  { id: "phy-08", name: "Condensed-Matter", path: "Physics/CondensedMatter", category: "物理", lines: 1100, sorryCount: 7, status: "incomplete", theorems: ["BCSTheory", "TKNNFormula"], definitions: ["BandStructure", "FermiSurface", "TopologicalInsulator"], dependencies: ["phy-02"] },
];

// 论文列表：希尔伯特 23 问题 + 千禧年 7 难题
export const papers: Paper[] = [
  // 希尔伯特 23 问题
  { id: "hil-01", title: "连续统假设（CH）", status: "open", field: "集合论/逻辑", year: 1900, author: "David Hilbert", abstract: "是否存在一个基数严格介于自然数和实数之间的集合？Gödel 证明其与 ZFC 一致，Cohen 证明其独立性。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1940, event: "Gödel 证明一致性" }, { year: 1963, event: "Cohen 证明独立性" }], sylvaStatus: "部分形式化：已建立 ZFC 公理体系，证明 Gödel 的相对一致性定理", leanSnippets: 42, relatedModules: ["set-01", "set-04", "log-01"] },
  { id: "hil-02", title: "算术公理的一致性", status: "partial", field: "集合论/逻辑", year: 1900, author: "David Hilbert", abstract: "证明算术公理系统是无矛盾的。Gödel 第二不完备性定理表明，在算术系统内无法证明其自身一致性。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1931, event: "Gödel 不完备性定理" }, { year: 1936, event: "Gentzen 超限归纳证明" }], sylvaStatus: "形式化：Gödel 不完备性定理已完成；Gentzen 证明部分完成", leanSnippets: 38, relatedModules: ["log-01", "log-03", "log-04"] },
  { id: "hil-03", title: "两个等底等高四面体的体积相等", status: "solved", field: "几何", year: 1900, author: "David Hilbert", abstract: "任意两个等底等高的四面体是否可以分解成全等的四面体？Max Dehn 给出否定答案。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1902, event: "Dehn 证明不可能" }], sylvaStatus: "完全形式化：Dehn 不变量理论已完整实现", leanSnippets: 28, relatedModules: ["geo-01"] },
  { id: "hil-04", title: "直线作为两点间最短距离的问题", status: "solved", field: "几何", year: 1900, author: "David Hilbert", abstract: "构造满足某些几何公理且直线为最短距离的系统。已解决，涉及非欧几何和度量空间。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1903, event: "Hamel 构造解" }], sylvaStatus: "形式化：度量空间公理和测地线理论", leanSnippets: 15, relatedModules: ["geo-02", "geo-03"] },
  { id: "hil-05", title: " Lie 群概念不要假设函数可微性", status: "solved", field: "代数", year: 1900, author: "David Hilbert", abstract: "是否可以将 Lie 群的定义从可微函数中解放出来？Hilbert 第五问题在更一般框架下已解决。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1952, event: "Gleason-Montgomery-Zippin 解决" }], sylvaStatus: "部分形式化：拓扑群和 Lie 群基础理论", leanSnippets: 22, relatedModules: ["alg-01", "alg-08"] },
  { id: "hil-06", title: "物理公理的数学处理", status: "partial", field: "物理", year: 1900, author: "David Hilbert", abstract: "对物理学中的公理进行数学处理，特别是概率论和极限过程。量子力学的公理化已部分完成。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1932, event: "von Neumann 量子力学公理化" }, { year: 1964, event: "Bell 不等式" }], sylvaStatus: "部分形式化：经典力学和量子力学基础", leanSnippets: 35, relatedModules: ["phy-01", "phy-02"] },
  { id: "hil-07", title: "某些数的超越性（e 和 π）", status: "solved", field: "数论", year: 1900, author: "David Hilbert", abstract: "证明某些数（如 e 和 π）的超越性。已证明，但某些问题（如 e+π 的超越性）仍开放。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1873, event: "Hermite 证明 e 超越性" }, { year: 1882, event: "Lindemann 证明 π 超越性" }], sylvaStatus: "完全形式化：超越数理论", leanSnippets: 18, relatedModules: ["nt-01", "nt-02"] },
  { id: "hil-08", title: "素数分布问题（黎曼假设）", status: "open", field: "数论", year: 1900, author: "David Hilbert", abstract: "证明黎曼假设：黎曼 ζ 函数的所有非平凡零点都在 Re(s)=1/2 直线上。数论中最著名的未解决问题。", milestones: [{ year: 1859, event: "Riemann 提出" }, { year: 1900, event: "Hilbert 列为第8问题" }, { year: 2000, event: "Clay 千禧年问题" }], sylvaStatus: "部分形式化：ζ 函数解析性质和素数定理", leanSnippets: 45, relatedModules: ["nt-03", "an-04"] },
  { id: "hil-09", title: "一般互反律的证明", status: "solved", field: "数论", year: 1900, author: "David Hilbert", abstract: "在代数数域中建立一般互反律。Artin 在1927年建立了 Artin 互反律。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1927, event: "Artin 互反律" }, { year: 1950, event: "类域论完成" }], sylvaStatus: "部分形式化：类域论和互反律", leanSnippets: 30, relatedModules: ["nt-05"] },
  { id: "hil-10", title: "Diophantine 方程的可解性", status: "solved", field: "数论", year: 1900, author: "David Hilbert", abstract: "寻找一种判定 Diophantine 方程是否有整数解的算法。Matiyasevich 证明不存在这样的通用算法。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1970, event: "Matiyasevich 解决（Hilbert 第十问题）" }], sylvaStatus: "部分形式化：递归函数和可计算性", leanSnippets: 25, relatedModules: ["nt-01", "log-01"] },
  { id: "hil-11", title: "任意代数数的二次型", status: "solved", field: "代数", year: 1900, author: "David Hilbert", abstract: "对代数数域中的二次型进行系统研究。Hasse-Minkowski 定理提供了判别条件。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1921, event: "Hasse 局部-整体原理" }], sylvaStatus: "形式化：二次型理论", leanSnippets: 20, relatedModules: ["alg-02", "alg-04"] },
  { id: "hil-12", title: "Abel 域上的 Kronecker 定理", status: "solved", field: "数论", year: 1900, author: "David Hilbert", abstract: "推广 Kronecker 定理到任意代数数域。Hilbert 本人已解决。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1902, event: "Hilbert 自己解决" }], sylvaStatus: "形式化：代数数域理论", leanSnippets: 12, relatedModules: ["nt-02"] },
  { id: "hil-13", title: "7次方程不能由根式求解", status: "solved", field: "代数", year: 1900, author: "David Hilbert", abstract: "证明7次一般方程不能用根式求解。已证明，且与 Galois 理论密切相关。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1824, event: "Abel 证明五次以上" }, { year: 1832, event: "Galois 理论" }], sylvaStatus: "完全形式化：Galois 理论", leanSnippets: 32, relatedModules: ["alg-03"] },
  { id: "hil-14", title: "有限维函数系的完备性", status: "solved", field: "分析/PDE", year: 1900, author: "David Hilbert", abstract: "证明某些函数系在有限维空间中完备。与不变量理论相关。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1890, event: "Hilbert 基定理" }], sylvaStatus: "形式化：不变量理论", leanSnippets: 14, relatedModules: ["alg-07"] },
  { id: "hil-15", title: "Schubert 计数演算的严格基础", status: "partial", field: "几何", year: 1900, author: "David Hilbert", abstract: "为 Schubert 计数演算提供严格基础。部分解决，与代数几何和相交理论密切相关。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1979, event: "Kleiman-Laksov 严格化" }], sylvaStatus: "部分形式化：相交理论和 Schubert 演算", leanSnippets: 18, relatedModules: ["geo-05"] },
  { id: "hil-16", title: "代数曲线与曲面的拓扑", status: "partial", field: "几何", year: 1900, author: "David Hilbert", abstract: "研究代数曲线和曲面的拓扑性质。Hilbert 第十六问题（极限环部分）仍未完全解决。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1955, event: "Petrovskii-Landis 结果" }, { year: 1991, event: "Ecalle-Martinet-Moussu-Ramis" }], sylvaStatus: "部分形式化：代数曲线拓扑和微分方程", leanSnippets: 22, relatedModules: ["geo-05", "an-09"] },
  { id: "hil-17", title: "正定形式的平方和表示", status: "solved", field: "代数", year: 1900, author: "David Hilbert", abstract: "证明正定形式是否可表示为平方和。Artin 在1927年解决，引出实代数几何。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1927, event: "Artin 证明" }], sylvaStatus: "形式化：实代数几何", leanSnippets: 16, relatedModules: ["alg-07"] },
  { id: "hil-18", title: "全等多面体的空间堆积", status: "solved", field: "几何", year: 1900, author: "David Hilbert", abstract: "构造全等多面体的最密堆积。Kepler 猜想于2017年由 Hales 形式化证明。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1611, event: "Kepler 猜想" }, { year: 1998, event: "Hales 证明" }, { year: 2017, event: "Flyspeck 形式化验证" }], sylvaStatus: "完全形式化：Kepler 猜想（Flyspeck 项目）", leanSnippets: 50, relatedModules: ["geo-01"] },
  { id: "hil-19", title: "正则变分问题的解是否解析", status: "solved", field: "分析/PDE", year: 1900, author: "David Hilbert", abstract: "正则变分问题的解是否是解析函数。已证明，Hilbert 第十九问题。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1904, event: "Bernstein 定理" }], sylvaStatus: "形式化：椭圆型 PDE 正则性", leanSnippets: 20, relatedModules: ["an-06", "an-08"] },
  { id: "hil-20", title: "一般边值问题", status: "solved", field: "分析/PDE", year: 1900, author: "David Hilbert", abstract: "研究一般线性椭圆型方程的边值问题。已解决，发展为现代 PDE 理论。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1920, event: "Fredholm 理论" }], sylvaStatus: "部分形式化：椭圆型 PDE 边值问题", leanSnippets: 24, relatedModules: ["an-06"] },
  { id: "hil-21", title: "具有给定单值群的线性微分方程", status: "solved", field: "分析/PDE", year: 1900, author: "David Hilbert", abstract: "证明具有给定单值群的线性微分方程的存在性。Riemann-Hilbert 问题已解决。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1908, event: "Plemelj 解决（部分）" }], sylvaStatus: "形式化：Riemann-Hilbert 对应", leanSnippets: 28, relatedModules: ["an-02", "an-06"] },
  { id: "hil-22", title: "单值化定理", status: "solved", field: "分析/PDE", year: 1900, author: "David Hilbert", abstract: "证明单值化定理：每个单连通 Riemann 曲面全纯等价于球面、复平面或上半平面。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1907, event: "Koebe-Poincaré 证明" }], sylvaStatus: "形式化：Riemann 曲面理论", leanSnippets: 22, relatedModules: ["an-02", "geo-06"] },
  { id: "hil-23", title: "变分法的进一步发展", status: "open", field: "分析/PDE", year: 1900, author: "David Hilbert", abstract: "变分法的进一步发展和应用。现代最优控制理论和几何变分问题仍有许多开放问题。", milestones: [{ year: 1900, event: "Hilbert 提出" }, { year: 1956, event: "Morse 理论" }, { year: 1977, event: "最优控制理论" }], sylvaStatus: "部分形式化：Morse 理论和变分法", leanSnippets: 15, relatedModules: ["an-08", "top-05"] },

  // 千禧年 7 难题
  { id: "mil-01", title: "P vs NP 问题", status: "open", field: "集合论/逻辑", year: 2000, author: "Clay Mathematics Institute", abstract: "P 类问题是否等于 NP 类问题？即是否所有可在多项式时间内验证解的问题，也可以在多项式时间内求解？", milestones: [{ year: 1971, event: "Cook 提出 P vs NP" }, { year: 2000, event: "Clay 千禧年问题" }, { year: 2002, event: "Smoothed analysis" }], sylvaStatus: "部分形式化：计算复杂性基础", leanSnippets: 20, relatedModules: ["log-01"] },
  { id: "mil-02", title: "Hodge 猜想", status: "open", field: "几何", year: 2000, author: "Clay Mathematics Institute", abstract: "在代数簇上，每个有理上同调类是否都是代数闭链的有理线性组合？代数几何中的核心问题。", milestones: [{ year: 1950, event: "Hodge 提出" }, { year: 2000, event: "Clay 千禧年问题" }], sylvaStatus: "部分形式化：Hodge 理论和代数几何", leanSnippets: 35, relatedModules: ["geo-05", "geo-06"] },
  { id: "mil-03", title: "Poincaré 猜想", status: "solved", field: "拓扑", year: 2000, author: "Clay Mathematics Institute", abstract: "每个单连通、闭的三维流形是否同胚于三维球面？Perelman 于2003年证明，2010年确认为正确。", milestones: [{ year: 1904, event: "Poincaré 提出" }, { year: 2003, event: "Perelman 证明" }, { year: 2006, event: "国际数学家大会确认" }], sylvaStatus: "完全形式化：Ricci 流和几何化定理", leanSnippets: 48, relatedModules: ["top-07", "geo-03"] },
  { id: "mil-04", title: "Riemann 假设", status: "open", field: "数论", year: 2000, author: "Clay Mathematics Institute", abstract: "黎曼 ζ 函数的所有非平凡零点都位于 Re(s)=1/2 直线上。数学中最重要的未解决问题之一。", milestones: [{ year: 1859, event: "Riemann 提出" }, { year: 2000, event: "Clay 千禧年问题" }], sylvaStatus: "部分形式化：ζ 函数和解析数论", leanSnippets: 40, relatedModules: ["nt-03"] },
  { id: "mil-05", title: "Yang-Mills 存在性与质量间隙", status: "open", field: "物理", year: 2000, author: "Clay Mathematics Institute", abstract: "证明四维 Yang-Mills 理论存在且满足质量间隙性质。量子场论数学基础的未解决问题。", milestones: [{ year: 1954, event: "Yang-Mills 理论提出" }, { year: 2000, event: "Clay 千禧年问题" }], sylvaStatus: "部分形式化：Yang-Mills 方程和量子场论", leanSnippets: 30, relatedModules: ["phy-07", "phy-03"] },
  { id: "mil-06", title: "Navier-Stokes 存在性与光滑性", status: "open", field: "分析/PDE", year: 2000, author: "Clay Mathematics Institute", abstract: "三维 Navier-Stokes 方程在光滑初始条件下是否总存在光滑解？流体动力学中最著名的未解决问题。", milestones: [{ year: 1822, event: "Navier-Stokes 方程" }, { year: 2000, event: "Clay 千禧年问题" }], sylvaStatus: "部分形式化：Navier-Stokes 方程和弱解理论", leanSnippets: 32, relatedModules: ["an-06"] },
  { id: "mil-07", title: "Birch 与 Swinnerton-Dyer 猜想", status: "open", field: "数论", year: 2000, author: "Clay Mathematics Institute", abstract: "椭圆曲线上的有理点群与 L 函数在 s=1 处的零点的关系。BSD 猜想是椭圆曲线的核心问题。", milestones: [{ year: 1960, event: "BSD 猜想提出" }, { year: 2000, event: "Clay 千禧年问题" }], sylvaStatus: "部分形式化：椭圆曲线和 L 函数", leanSnippets: 28, relatedModules: ["nt-04", "nt-03"] },
];

export const verificationStats: VerificationStats[] = [
  { category: "archive", sorryCount: 118, color: "#8b5cf6" },
  { category: "mathlib4", sorryCount: 5, color: "#3b82f6" },
  { category: "research", sorryCount: 95, color: "#f59e0b" },
  { category: "tutorial", sorryCount: 15, color: "#10b981" },
  { category: "legacy", sorryCount: 26, color: "#f43f5e" },
];

export const researchNotes: ResearchNote[] = [
  { id: "note-1", title: "连续统假设形式化路线", content: "计划分三步形式化 CH：(1) 建立强制法基础，(2) 证明 Cohen 力迫扩展，(3) 完成独立性证明。目前第一步已完成，第二步在进行中。", tags: ["集合论", "力迫法", "CH", "Hilbert-1"], relatedModule: "set-04", relatedPaper: "hil-01", createdAt: "2025-06-01", updatedAt: "2025-06-10" },
  { id: "note-2", title: "Poincaré 猜想证明结构分析", content: "Perelman 证明依赖三个关键工具：Ricci 流、Lipschitz 函数和 Alexandrov 空间。我们需要将这些工具逐步形式化。", tags: ["拓扑", "Ricci流", "Poincaré", "千禧年"], relatedModule: "top-07", relatedPaper: "mil-03", createdAt: "2025-06-05", updatedAt: "2025-06-12" },
  { id: "note-3", title: "BSD 猜想与椭圆曲线", content: "BSD 猜想将椭圆曲线的有理点秩与 L 函数的零点阶联系起来。形式化需要：椭圆曲线理论、模形式、L 函数的解析延拓。", tags: ["数论", "椭圆曲线", "BSD", "千禧年"], relatedModule: "nt-04", relatedPaper: "mil-07", createdAt: "2025-06-08", updatedAt: "2025-06-15" },
  { id: "note-4", title: "Galois 理论形式化进展", content: "Hilbert 第13问题的形式化证明已接近完成。主要完成：基本定理、可解群判定、根式求解条件。", tags: ["代数", "Galois", "Hilbert-13"], relatedModule: "alg-03", relatedPaper: "hil-13", createdAt: "2025-06-10", updatedAt: "2025-06-16" },
  { id: "note-5", title: "Navier-Stokes 正则性研究", content: "Navier-Stokes 方程光滑解的存在性是千禧年问题之一。目前的策略是：先形式化弱解理论，再尝试证明正则性。", tags: ["PDE", "Navier-Stokes", "千禧年"], relatedModule: "an-06", relatedPaper: "mil-06", createdAt: "2025-06-12", updatedAt: "2025-06-17" },
  { id: "note-6", title: "HoTT 与集合论等价性", content: "研究 HoTT 中的集合论解释。初步结果表明：在 h-level 2 下，HoTT 等价于集合论。需要更严格的证明。", tags: ["逻辑", "HoTT", "集合论", "类型论"], relatedModule: "log-05", createdAt: "2025-06-14", updatedAt: "2025-06-17" },
  { id: "note-7", title: "Hodge 猜想与动机理论", content: "Hodge 猜想的形式化需要深厚的代数几何基础。考虑先从较弱的 Lefschetz (1,1) 定理开始。", tags: ["几何", "Hodge", "代数几何", "千禧年"], relatedModule: "geo-05", relatedPaper: "mil-02", createdAt: "2025-06-15", updatedAt: "2025-06-17" },
];

export const recentActivities: Activity[] = [
  { id: "act-1", type: "theorem_proven", message: "证明了 Extensionality 公理在 ZFC 中的独立性", module: "set-01", timestamp: "2025-06-17T14:30:00Z" },
  { id: "act-2", type: "sorry_closed", message: "关闭了 Cardinal-Arithmetic 中的 2 个 sorry", module: "set-03", timestamp: "2025-06-17T12:00:00Z" },
  { id: "act-3", type: "module_complete", message: "Group-Theory 模块达到零 sorry 状态", module: "alg-01", timestamp: "2025-06-16T18:45:00Z" },
  { id: "act-4", type: "paper_linked", message: "将 Kepler 猜想与 Hilbert-18 关联完成", paper: "hil-18", timestamp: "2025-06-16T10:20:00Z" },
  { id: "act-5", type: "definition_added", message: "新增了 Ricci 流和曲率张量的定义", module: "geo-03", timestamp: "2025-06-15T16:00:00Z" },
  { id: "act-6", type: "theorem_proven", message: "证明了 Spectral Theorem 的弱化版本", module: "an-07", timestamp: "2025-06-15T09:30:00Z" },
  { id: "act-7", type: "sorry_closed", message: "关闭了 Elliptic-Curves 中的 3 个 sorry", module: "nt-04", timestamp: "2025-06-14T20:00:00Z" },
  { id: "act-8", type: "module_complete", message: "Ring-Theory 模块达到零 sorry 状态", module: "alg-02", timestamp: "2025-06-14T14:00:00Z" },
];

// ==================== 计算派生数据 ====================

export const totalModules = modules.length;
export const totalSorry = modules.reduce((sum, m) => sum + m.sorryCount, 0);
export const zeroSorryModules = modules.filter(m => m.sorryCount === 0);
export const zeroSorryCount = zeroSorryModules.length;
export const totalTheorems = modules.reduce((sum, m) => sum + m.theorems.length, 0);
export const totalDefinitions = modules.reduce((sum, m) => sum + m.definitions.length, 0);
export const totalPapers = papers.length;

export const categoryProgress = [
  { category: "集合论/逻辑", modules: 11, theorems: 34, complete: 4, total: 11 },
  { category: "代数", modules: 10, theorems: 28, complete: 5, total: 10 },
  { category: "数论", modules: 7, theorems: 22, complete: 1, total: 7 },
  { category: "分析/PDE", modules: 10, theorems: 30, complete: 3, total: 10 },
  { category: "拓扑", modules: 10, theorems: 26, complete: 1, total: 10 },
  { category: "几何", modules: 8, theorems: 20, complete: 1, total: 8 },
  { category: "物理", modules: 8, theorems: 18, complete: 1, total: 8 },
];

export const categories = ["集合论/逻辑", "代数", "数论", "分析/PDE", "拓扑", "几何", "物理"];
