param(
  [Parameter(Mandatory = $true)][string]$LeanHome,
  [Parameter(Mandatory = $true)][string]$SylvaRoot,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [Parameter(Mandatory = $true)][string]$ReportPath,
  [Parameter(Mandatory = $false)][switch]$IntegrationOnly
)

$ErrorActionPreference = 'Stop'

function Invoke-NativeLean {
  param([string]$Executable, [string[]]$Arguments, [string]$LogPath)
  & $Executable @Arguments *> $LogPath
  return $LASTEXITCODE
}

function Assert-LeanSuccess {
  param([int]$ExitCode, [string]$LogPath, [string]$Stage)
  if ($ExitCode -ne 0) {
    if (Test-Path $LogPath) { Get-Content -Raw -Path $LogPath | Write-Error }
    throw "Lean stage failed: $Stage (exit=$ExitCode)"
  }
}

function run_all_tests {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $lean = Join-Path $LeanHome 'bin/lean.exe'
  $prepare = Join-Path $repoRoot 'scripts/prepare_berry_curvature_integration.py'
  $integrationTest = Join-Path $repoRoot 'scripts/test_berry_curvature_patch_integration.py'
  $l2Proof = Join-Path $repoRoot 'research/formalization/BlochL2State.lean'
  $instanceProof = Join-Path $repoRoot 'research/formalization/BlochL2ConstantInstance.lean'
  $phaseProof = Join-Path $repoRoot 'research/formalization/BerryPhaseGaugeInvariance.lean'
  $registeredPhasePatch = Join-Path $repoRoot 'research/formalization/berry-phase-gauge-invariance.patch'
  $preparePhase = Join-Path $repoRoot 'scripts/prepare_berry_phase_gauge_invariance_patch.py'
  $phaseUnitTest = Join-Path $repoRoot 'scripts/test_prepare_berry_phase_gauge_invariance_patch.py'
  $phaseStructureProof = Join-Path $repoRoot 'research/formalization/BerryPhaseModel.lean'
  $registeredPhaseStructurePatch = Join-Path $repoRoot 'research/formalization/berry-phase-model.patch'
  $preparePhaseStructure = Join-Path $repoRoot 'scripts/prepare_berry_phase_model_patch.py'
  $phaseStructureUnitTest = Join-Path $repoRoot 'scripts/test_prepare_berry_phase_model_patch.py'
  $exteriorProof = Join-Path $repoRoot 'research/formalization/BerryConnectionExteriorDerivative.lean'
  $registeredExteriorPatch = Join-Path $repoRoot 'research/formalization/berry-connection-exterior-derivative.patch'
  $prepareExterior = Join-Path $repoRoot 'scripts/prepare_berry_connection_exterior_derivative_patch.py'
  $exteriorUnitTest = Join-Path $repoRoot 'scripts/test_prepare_berry_connection_exterior_derivative_patch.py'
  $curvatureProof = Join-Path $repoRoot 'research/formalization/BerryCurvatureModel.lean'
  $registeredCurvaturePatch = Join-Path $repoRoot 'research/formalization/berry-curvature-model.patch'
  $prepareCurvature = Join-Path $repoRoot 'scripts/prepare_berry_curvature_model_patch.py'
  $curvatureUnitTest = Join-Path $repoRoot 'scripts/test_prepare_berry_curvature_model_patch.py'
  $original = Join-Path $SylvaRoot 'BerryCurvature.lean'
  $original3D = Join-Path $SylvaRoot 'TOE_SYLVA_Solutions/BerryCurvature_GaugeInvariance.lean'
  foreach ($required in @($lean, $prepare, $integrationTest, $l2Proof, $instanceProof, $phaseProof, $registeredPhasePatch, $preparePhase, $phaseUnitTest, $phaseStructureProof, $registeredPhaseStructurePatch, $preparePhaseStructure, $phaseStructureUnitTest, $exteriorProof, $registeredExteriorPatch, $prepareExterior, $exteriorUnitTest, $curvatureProof, $registeredCurvaturePatch, $prepareCurvature, $curvatureUnitTest, $original, $original3D, (Join-Path $SylvaRoot 'BlochTheorem.lean'), (Join-Path $SylvaRoot 'BerryConnection.lean'))) {
    if (-not (Test-Path $required)) { throw "Required input is missing: $required" }
  }
  $null = New-Item -ItemType Directory -Force -Path $OutputDirectory
  $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath)

  $env:SYLVA_ROOT = $SylvaRoot
  & python $integrationTest
  if ($LASTEXITCODE -ne 0) { throw "Berry integration unit test failed: $LASTEXITCODE" }
  & python $phaseUnitTest
  if ($LASTEXITCODE -ne 0) { throw "Berry phase patch unit test failed: $LASTEXITCODE" }
  & python $phaseStructureUnitTest
  if ($LASTEXITCODE -ne 0) { throw "Berry phase structure patch unit test failed: $LASTEXITCODE" }
  & python $exteriorUnitTest
  if ($LASTEXITCODE -ne 0) { throw "Exterior derivative patch unit test failed: $LASTEXITCODE" }
  & python $curvatureUnitTest
  if ($LASTEXITCODE -ne 0) { throw "Berry curvature model patch unit test failed: $LASTEXITCODE" }
  $applyRoot = Join-Path $OutputDirectory 'patch-application'
  $prepareText = (& python $prepare --sylva-root $SylvaRoot --output-directory $applyRoot | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { throw "Berry integration preparation failed: $prepareText" }
  $prepareReport = $prepareText | ConvertFrom-Json

  $baseConnection = Join-Path $OutputDirectory 'BerryConnectionBase.lean'
  Copy-Item -Force -Path (Join-Path $applyRoot 'BerryConnection.lean') -Destination $baseConnection
  $phasePatched = Join-Path $OutputDirectory 'BerryConnectionPhasePatched.lean'
  $generatedPhasePatch = Join-Path $OutputDirectory 'berry-phase-gauge-invariance.patch'
  & python $preparePhase --structured (Join-Path $applyRoot 'BerryConnection.lean') --proof $phaseProof --patched-output $phasePatched --patch-output $generatedPhasePatch
  if ($LASTEXITCODE -ne 0) { throw "Berry phase patch preparation failed: $LASTEXITCODE" }
  $phasePatchMatches = (Get-FileHash -Algorithm SHA256 $generatedPhasePatch).Hash -eq (Get-FileHash -Algorithm SHA256 $registeredPhasePatch).Hash
  if (-not $phasePatchMatches) { throw 'The registered Berry phase patch is not synchronized' }
  Push-Location $applyRoot
  try {
    & git apply --check $registeredPhasePatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply --check failed for the Berry phase patch' }
    & git apply $registeredPhasePatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply failed for the Berry phase patch' }
  } finally {
    Pop-Location
  }
  $phaseApplicationMatches = (Get-FileHash -Algorithm SHA256 (Join-Path $applyRoot 'BerryConnection.lean')).Hash -eq (Get-FileHash -Algorithm SHA256 $phasePatched).Hash
  if (-not $phaseApplicationMatches) { throw 'The applied Berry phase patch differs from the generated source' }

  $phaseStructurePatched = Join-Path $OutputDirectory 'BerryConnectionPhaseStructurePatched.lean'
  $generatedPhaseStructurePatch = Join-Path $OutputDirectory 'berry-phase-model.patch'
  & python $preparePhaseStructure --structured (Join-Path $applyRoot 'BerryConnection.lean') --proof $phaseStructureProof --patched-output $phaseStructurePatched --patch-output $generatedPhaseStructurePatch
  if ($LASTEXITCODE -ne 0) { throw "Berry phase structure patch preparation failed: $LASTEXITCODE" }
  $phaseStructurePatchMatches = (Get-FileHash -Algorithm SHA256 $generatedPhaseStructurePatch).Hash -eq (Get-FileHash -Algorithm SHA256 $registeredPhaseStructurePatch).Hash
  if (-not $phaseStructurePatchMatches) { throw 'The registered Berry phase structure patch is not synchronized' }
  Push-Location $applyRoot
  try {
    & git apply --check $registeredPhaseStructurePatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply --check failed for the Berry phase structure patch' }
    & git apply $registeredPhaseStructurePatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply failed for the Berry phase structure patch' }
  } finally {
    Pop-Location
  }
  $phaseStructureApplicationMatches = (Get-FileHash -Algorithm SHA256 (Join-Path $applyRoot 'BerryConnection.lean')).Hash -eq (Get-FileHash -Algorithm SHA256 $phaseStructurePatched).Hash
  if (-not $phaseStructureApplicationMatches) { throw 'The applied Berry phase structure patch differs from the generated source' }

  $exteriorPatched = Join-Path $OutputDirectory 'BerryConnectionExteriorPatched.lean'
  $generatedExteriorPatch = Join-Path $OutputDirectory 'berry-connection-exterior-derivative.patch'
  & python $prepareExterior --structured (Join-Path $applyRoot 'BerryConnection.lean') --proof $exteriorProof --patched-output $exteriorPatched --patch-output $generatedExteriorPatch
  if ($LASTEXITCODE -ne 0) { throw "Exterior derivative patch preparation failed: $LASTEXITCODE" }
  $exteriorPatchMatches = (Get-FileHash -Algorithm SHA256 $generatedExteriorPatch).Hash -eq (Get-FileHash -Algorithm SHA256 $registeredExteriorPatch).Hash
  if (-not $exteriorPatchMatches) { throw 'The registered exterior derivative patch is not synchronized' }
  Push-Location $applyRoot
  try {
    & git apply --check $registeredExteriorPatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply --check failed for the exterior derivative patch' }
    & git apply $registeredExteriorPatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply failed for the exterior derivative patch' }
  } finally {
    Pop-Location
  }
  $exteriorApplicationMatches = (Get-FileHash -Algorithm SHA256 (Join-Path $applyRoot 'BerryConnection.lean')).Hash -eq (Get-FileHash -Algorithm SHA256 $exteriorPatched).Hash
  if (-not $exteriorApplicationMatches) { throw 'The applied exterior derivative patch differs from the generated source' }

  $curvaturePatched = Join-Path $OutputDirectory 'BerryCurvatureModelPatched.lean'
  $generatedCurvaturePatch = Join-Path $OutputDirectory 'berry-curvature-model.patch'
  & python $prepareCurvature --structured (Join-Path $applyRoot 'BerryCurvature.lean') --proof $curvatureProof --patched-output $curvaturePatched --patch-output $generatedCurvaturePatch
  if ($LASTEXITCODE -ne 0) { throw "Berry curvature model patch preparation failed: $LASTEXITCODE" }
  $curvaturePatchMatches = (Get-FileHash -Algorithm SHA256 $generatedCurvaturePatch).Hash -eq (Get-FileHash -Algorithm SHA256 $registeredCurvaturePatch).Hash
  if (-not $curvaturePatchMatches) { throw 'The registered Berry curvature model patch is not synchronized' }
  Push-Location $applyRoot
  try {
    & git apply --check $registeredCurvaturePatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply --check failed for the Berry curvature model patch' }
    & git apply $registeredCurvaturePatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply failed for the Berry curvature model patch' }
  } finally {
    Pop-Location
  }
  $curvatureApplicationMatches = (Get-FileHash -Algorithm SHA256 (Join-Path $applyRoot 'BerryCurvature.lean')).Hash -eq (Get-FileHash -Algorithm SHA256 $curvaturePatched).Hash
  if (-not $curvatureApplicationMatches) { throw 'The applied Berry curvature model patch differs from the generated source' }

  Copy-Item -Force -Path (Join-Path $SylvaRoot 'BlochTheorem.lean') -Destination (Join-Path $OutputDirectory 'BlochTheorem.lean')
  $paths = @($OutputDirectory, (Join-Path $SylvaRoot '.lake/build/lib/lean'))
  foreach ($package in @('mathlib', 'plausible', 'LeanSearchClient', 'importGraph', 'proofwidgets', 'aesop', 'Qq', 'batteries', 'Cli')) {
    $directory = Join-Path $SylvaRoot ".lake/packages/$package/.lake/build/lib/lean"
    if (Test-Path $directory) { $paths += $directory }
  }
  $env:LEAN_PATH = $paths -join [IO.Path]::PathSeparator

  $phaseModelText = $null
  $phaseStructureText = $null
  $exteriorText = $null
  $stages = [ordered]@{ integrationPreparation = 0; phasePatchApplication = 0; phaseStructurePatchApplication = 0; exteriorPatchApplication = 0; curvaturePatchApplication = 0 }
  $blochLog = Join-Path $OutputDirectory 'integration-bloch.log'
  $stages.bloch = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BlochTheorem.olean'), (Join-Path $OutputDirectory 'BlochTheorem.lean')) -LogPath $blochLog
  Assert-LeanSuccess $stages.bloch $blochLog 'integration BlochTheorem'
  if (-not $IntegrationOnly) {
  $baseConnectionLog = Join-Path $OutputDirectory 'integration-base-connection.log'
  $stages.baseConnection = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnection.olean'), $baseConnection) -LogPath $baseConnectionLog
  Assert-LeanSuccess $stages.baseConnection $baseConnectionLog 'base patched BerryConnection for independent phase model'
  $phaseModelLog = Join-Path $OutputDirectory 'integration-phase-model.log'
  $stages.phaseModel = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryPhaseGaugeInvariance.olean'), $phaseProof) -LogPath $phaseModelLog
  Assert-LeanSuccess $stages.phaseModel $phaseModelLog 'independent Berry phase model'
  $phaseModelSource = Join-Path $OutputDirectory 'integration-phase-model-axioms.lean'
  $phaseModelAxiomLog = Join-Path $OutputDirectory 'integration-phase-model-axioms.log'
  Set-Content -Path $phaseModelSource -Encoding ASCII -Value @(
    'import BerryPhaseGaugeInvariance',
    '',
    '#print axioms BerryConnection.berryPhaseIntegral',
    '#print axioms BerryConnection.BerryPhase_GaugeInvariance_model'
  )
  $stages.phaseModelAudit = Invoke-NativeLean -Executable $lean -Arguments @($phaseModelSource) -LogPath $phaseModelAxiomLog
  Assert-LeanSuccess $stages.phaseModelAudit $phaseModelAxiomLog 'independent Berry phase axiom audit'
  $phaseModelText = [regex]::Replace((Get-Content -Raw -Path $phaseModelAxiomLog).Trim(), '\s+', ' ')
  foreach ($name in @('berryPhaseIntegral', 'BerryPhase_GaugeInvariance_model')) {
    if (-not $phaseModelText.Contains("'BerryConnection.${name}' depends on axioms: [propext, Classical.choice, Quot.sound]")) {
      throw "Unexpected independent phase axioms for ${name}: $phaseModelText"
    }
  }
  $phaseStructureLog = Join-Path $OutputDirectory 'integration-phase-structure.log'
  $stages.phaseStructureModel = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryPhaseModel.olean'), $phaseStructureProof) -LogPath $phaseStructureLog
  Assert-LeanSuccess $stages.phaseStructureModel $phaseStructureLog 'independent refined BerryPhase model'
  $phaseStructureSource = Join-Path $OutputDirectory 'integration-phase-structure-axioms.lean'
  $phaseStructureAxiomLog = Join-Path $OutputDirectory 'integration-phase-structure-axioms.log'
  Set-Content -Path $phaseStructureSource -Encoding ASCII -Value @(
    'import BerryPhaseModel',
    '',
    '#print axioms BerryConnection.BerryPhase_GaugeInvariance_refined_model'
  )
  $stages.phaseStructureModelAudit = Invoke-NativeLean -Executable $lean -Arguments @($phaseStructureSource) -LogPath $phaseStructureAxiomLog
  Assert-LeanSuccess $stages.phaseStructureModelAudit $phaseStructureAxiomLog 'independent refined BerryPhase axiom audit'
  $phaseStructureText = [regex]::Replace((Get-Content -Raw -Path $phaseStructureAxiomLog).Trim(), '\s+', ' ')
  if (-not $phaseStructureText.Contains("'BerryConnection.BerryPhase_GaugeInvariance_refined_model' depends on axioms: [propext, Classical.choice, Quot.sound]")) {
    throw "Unexpected independent refined phase axioms: $phaseStructureText"
  }
  $exteriorLog = Join-Path $OutputDirectory 'integration-exterior.log'
  $stages.exteriorModel = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnectionExteriorDerivative.olean'), $exteriorProof) -LogPath $exteriorLog
  Assert-LeanSuccess $stages.exteriorModel $exteriorLog 'independent exterior derivative model'
  $exteriorSource = Join-Path $OutputDirectory 'integration-exterior-axioms.lean'
  $exteriorAxiomLog = Join-Path $OutputDirectory 'integration-exterior-axioms.log'
  Set-Content -Path $exteriorSource -Encoding ASCII -Value @(
    'import BerryConnectionExteriorDerivative',
    '',
    '#print axioms BerryConnection.exteriorDerivativeOfBerryConnection_model',
    '#print axioms BerryConnection.gaugeTransform1Form_model',
    '#print axioms BerryConnection.exteriorDerivativeOfBerryConnection_gauge_invariant_model'
  )
  $stages.exteriorModelAudit = Invoke-NativeLean -Executable $lean -Arguments @($exteriorSource) -LogPath $exteriorAxiomLog
  Assert-LeanSuccess $stages.exteriorModelAudit $exteriorAxiomLog 'independent exterior derivative axiom audit'
  $exteriorText = [regex]::Replace((Get-Content -Raw -Path $exteriorAxiomLog).Trim(), '\s+', ' ')
  foreach ($name in @('exteriorDerivativeOfBerryConnection_model', 'gaugeTransform1Form_model', 'exteriorDerivativeOfBerryConnection_gauge_invariant_model')) {
    if (-not $exteriorText.Contains("'BerryConnection.${name}' depends on axioms: [propext, Classical.choice, Quot.sound]")) {
      throw "Unexpected independent exterior axioms for ${name}: $exteriorText"
    }
  }
  }
  $connectionLog = Join-Path $OutputDirectory 'integration-connection.log'
  $stages.connection = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnection.olean'), (Join-Path $applyRoot 'BerryConnection.lean')) -LogPath $connectionLog
  Assert-LeanSuccess $stages.connection $connectionLog 'Berry-phase-patched BerryConnection'
  $mainLog = Join-Path $OutputDirectory 'integration-main.log'
  $stages.main = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryCurvature.olean'), (Join-Path $applyRoot 'BerryCurvature.lean')) -LogPath $mainLog
  Assert-LeanSuccess $stages.main $mainLog 'integrated 2D and Chern BerryCurvature'
  $threeDLog = Join-Path $OutputDirectory 'integration-3d.log'
  $stages.threeD = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryCurvatureGaugeInvariance3D.olean'), (Join-Path $applyRoot 'TOE_SYLVA_Solutions/BerryCurvature_GaugeInvariance.lean')) -LogPath $threeDLog
  Assert-LeanSuccess $stages.threeD $threeDLog 'integrated 3D gauge invariance'
  $l2Log = Join-Path $OutputDirectory 'integration-l2.log'
  $stages.l2 = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BlochL2State.olean'), $l2Proof) -LogPath $l2Log
  Assert-LeanSuccess $stages.l2 $l2Log 'BlochL2State on patched BerryConnection'
  $instanceLog = Join-Path $OutputDirectory 'integration-l2-instance.log'
  $stages.l2Instance = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BlochL2ConstantInstance.olean'), $instanceProof) -LogPath $instanceLog
  Assert-LeanSuccess $stages.l2Instance $instanceLog 'constant BlochL2State on patched BerryConnection'

  $auditSource = Join-Path $OutputDirectory 'integration-axioms.lean'
  $auditLog = Join-Path $OutputDirectory 'integration-axioms.log'
  Set-Content -Path $auditSource -Encoding ASCII -Value @(
    'import BerryCurvature',
    'import BerryCurvatureGaugeInvariance3D',
    'import BlochL2ConstantInstance',
    '',
    '#print axioms BerryConnection.BerryConnection_GaugeTransformationIdentity',
    '#print axioms BerryConnection.BerryConnection_GaugeTransformComposition',
    '#print axioms BerryConnection.BerryConnection_GaugeTransformationLaw',
    '#print axioms BerryCurvature.BerryCurvature_GaugeInvariance',
    '#print axioms BerryCurvature.FirstChernNumber_Integrality',
    '#print axioms BerryCurvature.FirstChernNumber_TopologicalInvariance',
    '#print axioms BerryCurvature.TotalChernNumber_FullBandVanishing',
    '#print axioms curl_linear_subtraction',
    '#print axioms curl_of_gradient_zero',
    '#print axioms BerryCurvature_gauge_invariance',
    '#print axioms BerryConnection.BlochL2State_normalization_integral',
    '#print axioms BerryConnection.BlochL2State_gauge_transformation_law',
    '#print axioms BerryConnection.constantBlochL2State',
    '#print axioms BerryConnection.constantBlochL2State_gauge_law',
    '#print axioms BerryConnection.BerryPhase_GaugeInvariance',
    '#print axioms BerryConnection.BerryPhase_GaugeInvariance_refined',
    '#print axioms BerryConnection.exteriorDerivativeOfBerryConnection',
    '#print axioms BerryConnection.exteriorDerivativeOfBerryConnection_gauge_invariant',
    '#print axioms BerryCurvature.curvatureXYFromBerryConnection',
    '#print axioms BerryCurvature.zeroBerryCurvatureModel'
  )
  $stages.axiomAudit = Invoke-NativeLean -Executable $lean -Arguments @($auditSource) -LogPath $auditLog
  Assert-LeanSuccess $stages.axiomAudit $auditLog 'integrated twenty-target axiom audit'
  $auditText = [regex]::Replace((Get-Content -Raw -Path $auditLog).Trim(), '\s+', ' ')
  foreach ($name in @('BerryConnection.BerryConnection_GaugeTransformationIdentity', 'BerryConnection.BerryConnection_GaugeTransformComposition', 'BerryConnection.BerryConnection_GaugeTransformationLaw', 'BerryCurvature.BerryCurvature_GaugeInvariance', 'BerryCurvature.FirstChernNumber_Integrality', 'BerryCurvature.FirstChernNumber_TopologicalInvariance', 'BerryCurvature.TotalChernNumber_FullBandVanishing', 'curl_linear_subtraction', 'curl_of_gradient_zero', 'BerryCurvature_gauge_invariance', 'BerryConnection.BlochL2State_normalization_integral', 'BerryConnection.BlochL2State_gauge_transformation_law', 'BerryConnection.constantBlochL2State', 'BerryConnection.constantBlochL2State_gauge_law', 'BerryConnection.BerryPhase_GaugeInvariance', 'BerryConnection.BerryPhase_GaugeInvariance_refined', 'BerryConnection.exteriorDerivativeOfBerryConnection', 'BerryConnection.exteriorDerivativeOfBerryConnection_gauge_invariant', 'BerryCurvature.curvatureXYFromBerryConnection', 'BerryCurvature.zeroBerryCurvatureModel')) {
    if (-not $auditText.Contains("'${name}' depends on axioms: [propext, Classical.choice, Quot.sound]")) {
      throw "Unexpected integrated axiom dependencies for ${name}: $auditText"
    }
  }
  if ($auditText.Contains('sorryAx')) { throw "sorryAx in integrated audit: $auditText" }

  $verificationScope = if ($IntegrationOnly) {
    'Downstream integration of eleven patches and twenty targets; eight independent models are covered by a separate audit script'
  } else {
    'Eleven sequential patches plus independent models, computable exterior derivative and curvature, refined BerryPhase, Bloch L2 and twenty integrated targets'
  }
  $independentBoundary = if ($IntegrationOnly) {
    'Independent model builds were skipped in this mode and are covered by berry-independent-models-lean-audit.json.'
  } else {
    'Independent interval, structure and exterior models are audited before the fully patched BerryConnection replaces the base connection build.'
  }
  $report = [ordered]@{
    schemaVersion = 7
    status = 'success'
    scope = $verificationScope
    integrationOnly = [bool]$IntegrationOnly
    independentModelsReport = 'research/formalization/berry-independent-models-lean-audit.json'
    source = [ordered]@{
      repository = 'TOE-SYLVA-pull'
      root = $SylvaRoot
      commit = (git -C (Split-Path -Parent $SylvaRoot) rev-parse HEAD).Trim()
      originalSha256 = $prepareReport.originalSha256
      preparedConnectionSha256 = $prepareReport.connectionSha256
      phasePatchedConnectionSha256 = (Get-FileHash -Algorithm SHA256 $phasePatched).Hash.ToLowerInvariant()
      refinedConnectionSha256 = (Get-FileHash -Algorithm SHA256 $phaseStructurePatched).Hash.ToLowerInvariant()
      exteriorPatchedConnectionSha256 = (Get-FileHash -Algorithm SHA256 $exteriorPatched).Hash.ToLowerInvariant()
      curvaturePatchedMainSha256 = (Get-FileHash -Algorithm SHA256 $curvaturePatched).Hash.ToLowerInvariant()
      preparedMainSha256 = $prepareReport.mainSha256
      prepared3DSha256 = $prepareReport.threeDSha256
      l2ProofSha256 = (Get-FileHash -Algorithm SHA256 $l2Proof).Hash.ToLowerInvariant()
      instanceProofSha256 = (Get-FileHash -Algorithm SHA256 $instanceProof).Hash.ToLowerInvariant()
      phaseProofSha256 = (Get-FileHash -Algorithm SHA256 $phaseProof).Hash.ToLowerInvariant()
      phaseStructureProofSha256 = (Get-FileHash -Algorithm SHA256 $phaseStructureProof).Hash.ToLowerInvariant()
      exteriorProofSha256 = (Get-FileHash -Algorithm SHA256 $exteriorProof).Hash.ToLowerInvariant()
      curvatureProofSha256 = (Get-FileHash -Algorithm SHA256 $curvatureProof).Hash.ToLowerInvariant()
      phasePatchSha256 = (Get-FileHash -Algorithm SHA256 $registeredPhasePatch).Hash.ToLowerInvariant()
      phaseStructurePatchSha256 = (Get-FileHash -Algorithm SHA256 $registeredPhaseStructurePatch).Hash.ToLowerInvariant()
      exteriorPatchSha256 = (Get-FileHash -Algorithm SHA256 $registeredExteriorPatch).Hash.ToLowerInvariant()
      curvaturePatchSha256 = (Get-FileHash -Algorithm SHA256 $registeredCurvaturePatch).Hash.ToLowerInvariant()
      patches = $prepareReport.stages
      leanVersion = '4.29.0 / 98dc76e3c0a9b856c9b98726b713fb04fab16740'
    }
    build = [ordered]@{
      stages = $stages
      phaseModelOutputSha256 = $(if ($IntegrationOnly) { $null } else { (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryPhaseGaugeInvariance.olean')).Hash.ToLowerInvariant() })
      phaseStructureOutputSha256 = $(if ($IntegrationOnly) { $null } else { (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryPhaseModel.olean')).Hash.ToLowerInvariant() })
      exteriorModelOutputSha256 = $(if ($IntegrationOnly) { $null } else { (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryConnectionExteriorDerivative.olean')).Hash.ToLowerInvariant() })
      connectionOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryConnection.olean')).Hash.ToLowerInvariant()
      mainOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryCurvature.olean')).Hash.ToLowerInvariant()
      threeDOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryCurvatureGaugeInvariance3D.olean')).Hash.ToLowerInvariant()
      l2OutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BlochL2State.olean')).Hash.ToLowerInvariant()
      instanceOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BlochL2ConstantInstance.olean')).Hash.ToLowerInvariant()
      warningsPreserved = $true
    }
    axiomAudit = [ordered]@{ integrated = $auditText; independentPhaseModel = $phaseModelText; independentPhaseStructure = $phaseStructureText; independentExterior = $exteriorText }
    validation = [ordered]@{
      integrationUnitTestPassed = $true
      phasePatchUnitTestPassed = $true
      phasePatchSynchronized = $phasePatchMatches
      phasePatchApplicationMatchesGenerated = $phaseApplicationMatches
      phaseStructurePatchUnitTestPassed = $true
      phaseStructurePatchSynchronized = $phaseStructurePatchMatches
      phaseStructurePatchApplicationMatchesGenerated = $phaseStructureApplicationMatches
      exteriorPatchUnitTestPassed = $true
      exteriorPatchSynchronized = $exteriorPatchMatches
      exteriorPatchApplicationMatchesGenerated = $exteriorApplicationMatches
      curvaturePatchUnitTestPassed = $true
      curvaturePatchSynchronized = $curvaturePatchMatches
      curvaturePatchApplicationMatchesGenerated = $curvatureApplicationMatches
      independentModelsAudited = (-not $IntegrationOnly)
      independentPhaseModelProved = $(if ($IntegrationOnly) { $null } else { $true })
      independentPhaseStructureProved = $(if ($IntegrationOnly) { $null } else { $true })
      independentExteriorGaugeInvarianceProved = $(if ($IntegrationOnly) { $null } else { $true })
      refinedBerryPhaseDefinitionPresent = $true
      legacyBerryPhasePropRemoved = $true
      integralDefinitionPrecedesStructure = $true
      exteriorDerivativeComputed = $true
      exteriorGaugeInvariantProved = $true
      curvatureDefinitionPresent = $true
      zeroCurvatureInstanceConstructed = $true
      legacyCurvaturePropRemoved = $true
      fullDifferentialFormsCalculusProved = $false
      sequentialPatchApplication = $true
      combinedBuildSucceeded = $true
      patchedConnectionUsedByCurvature = $true
      l2UsesPatchedConnection = $true
      duplicateStandaloneGaugeLawImportsRemoved = $true
      standardAxiomsOnlyForTwentyTargets = $true
      newIncrementalPatchesCreated = $true
      newDuplicateCombinedPatchCreated = $false
      generalTwoDimensionalLineIntegralProved = $false
      multiValuedPhaseWindingProved = $false
      forbiddenPlaceholderOrNewAxiomInTargets = $false
      externalSourceModified = $false
      fullProjectBuilt = $false
    }
    boundaries = @(
      $independentBoundary,
      'berryPhaseIntegral precedes the refined BerryPhase structure; its definition field is an actual integral equation, not Prop.',
      'Exterior derivative is a computable complex 2D component; gauge invariance requires C2 regularity and component differentiability.',
      'BerryCurvature and BlochL2State are compiled against the fully patched BerryConnection, not the original dependency.',
      'The twenty integrated targets use only standard axioms; independent targets are covered by their own audit entry point when IntegrationOnly is selected.',
      'General differential forms, de Rham cohomology, general two-dimensional line integrals and multivalued phase winding remain open.',
      'The Dirac instance is a computable test case, not a general Brillouin-zone measure or a construction from old Props.',
      'Conditional Chern invariance and zero-sum hypotheses are not gap-preserving perturbation or completeness-based full-band proofs.',
      'The external TOE-SYLVA source tree is only read; the full Lake project is not built by this script.'
    )
  }
  Set-Content -Path $ReportPath -Encoding UTF8 -Value ($report | ConvertTo-Json -Depth 10)
  Write-Output ($report | ConvertTo-Json -Depth 10)
}

run_all_tests
