param(
  [Parameter(Mandatory = $true)][string]$LeanHome,
  [Parameter(Mandatory = $true)][string]$SylvaRoot,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [Parameter(Mandatory = $true)][string]$ReportPath
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

function Assert-StandardAxioms {
  param([string]$Text, [string]$Namespace, [string[]]$Names)
  foreach ($name in $Names) {
    if (-not $Text.Contains("'${Namespace}.${name}' depends on axioms: [propext, Classical.choice, Quot.sound]")) {
      throw "Unexpected axiom dependencies for ${Namespace}.${name}: $Text"
    }
  }
  if ($Text.Contains('sorryAx')) { throw "sorryAx in independent model audit: $Text" }
}

function run_all_tests {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $lean = Join-Path $LeanHome 'bin/lean.exe'
  $prepare = Join-Path $repoRoot 'scripts/prepare_berry_curvature_integration.py'
  $integrationTest = Join-Path $repoRoot 'scripts/test_berry_curvature_patch_integration.py'
  $phaseProof = Join-Path $repoRoot 'research/formalization/BerryPhaseGaugeInvariance.lean'
  $phasePatch = Join-Path $repoRoot 'research/formalization/berry-phase-gauge-invariance.patch'
  $preparePhase = Join-Path $repoRoot 'scripts/prepare_berry_phase_gauge_invariance_patch.py'
  $phaseTest = Join-Path $repoRoot 'scripts/test_prepare_berry_phase_gauge_invariance_patch.py'
  $structureProof = Join-Path $repoRoot 'research/formalization/BerryPhaseModel.lean'
  $structurePatch = Join-Path $repoRoot 'research/formalization/berry-phase-model.patch'
  $prepareStructure = Join-Path $repoRoot 'scripts/prepare_berry_phase_model_patch.py'
  $structureTest = Join-Path $repoRoot 'scripts/test_prepare_berry_phase_model_patch.py'
  $exteriorProof = Join-Path $repoRoot 'research/formalization/BerryConnectionExteriorDerivative.lean'
  $exteriorPatch = Join-Path $repoRoot 'research/formalization/berry-connection-exterior-derivative.patch'
  $prepareExterior = Join-Path $repoRoot 'scripts/prepare_berry_connection_exterior_derivative_patch.py'
  $exteriorTest = Join-Path $repoRoot 'scripts/test_prepare_berry_connection_exterior_derivative_patch.py'
  $curvatureProof = Join-Path $repoRoot 'research/formalization/BerryCurvatureModel.lean'
  $curvaturePatch = Join-Path $repoRoot 'research/formalization/berry-curvature-model.patch'
  $prepareCurvature = Join-Path $repoRoot 'scripts/prepare_berry_curvature_model_patch.py'
  $curvatureTest = Join-Path $repoRoot 'scripts/test_prepare_berry_curvature_model_patch.py'
  foreach ($required in @($lean, $prepare, $integrationTest, $phaseProof, $phasePatch, $preparePhase, $phaseTest, $structureProof, $structurePatch, $prepareStructure, $structureTest, $exteriorProof, $exteriorPatch, $prepareExterior, $exteriorTest, $curvatureProof, $curvaturePatch, $prepareCurvature, $curvatureTest, (Join-Path $SylvaRoot 'BlochTheorem.lean'), (Join-Path $SylvaRoot 'BerryConnection.lean'), (Join-Path $SylvaRoot 'BerryCurvature.lean'), (Join-Path $SylvaRoot 'TOE_SYLVA_Solutions/BerryCurvature_GaugeInvariance.lean'))) {
    if (-not (Test-Path $required)) { throw "Required input is missing: $required" }
  }
  $null = New-Item -ItemType Directory -Force -Path $OutputDirectory
  $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath)

  $env:SYLVA_ROOT = $SylvaRoot
  & python $integrationTest
  if ($LASTEXITCODE -ne 0) { throw "Berry integration unit test failed: $LASTEXITCODE" }
  & python $phaseTest
  if ($LASTEXITCODE -ne 0) { throw "Berry phase patch unit test failed: $LASTEXITCODE" }
  & python $structureTest
  if ($LASTEXITCODE -ne 0) { throw "Berry phase structure patch unit test failed: $LASTEXITCODE" }
  & python $exteriorTest
  if ($LASTEXITCODE -ne 0) { throw "Exterior derivative patch unit test failed: $LASTEXITCODE" }
  & python $curvatureTest
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
  $phaseMatches = (Get-FileHash -Algorithm SHA256 $generatedPhasePatch).Hash -eq (Get-FileHash -Algorithm SHA256 $phasePatch).Hash
  if (-not $phaseMatches) { throw 'The registered Berry phase patch is not synchronized' }

  $structurePatched = Join-Path $OutputDirectory 'BerryConnectionPhaseStructurePatched.lean'
  $generatedStructurePatch = Join-Path $OutputDirectory 'berry-phase-model.patch'
  & python $prepareStructure --structured $phasePatched --proof $structureProof --patched-output $structurePatched --patch-output $generatedStructurePatch
  if ($LASTEXITCODE -ne 0) { throw "Berry phase structure patch preparation failed: $LASTEXITCODE" }
  $structureMatches = (Get-FileHash -Algorithm SHA256 $generatedStructurePatch).Hash -eq (Get-FileHash -Algorithm SHA256 $structurePatch).Hash
  if (-not $structureMatches) { throw 'The registered Berry phase structure patch is not synchronized' }

  $exteriorPatched = Join-Path $OutputDirectory 'BerryConnectionExteriorPatched.lean'
  $generatedExteriorPatch = Join-Path $OutputDirectory 'berry-connection-exterior-derivative.patch'
  & python $prepareExterior --structured $structurePatched --proof $exteriorProof --patched-output $exteriorPatched --patch-output $generatedExteriorPatch
  if ($LASTEXITCODE -ne 0) { throw "Exterior derivative patch preparation failed: $LASTEXITCODE" }
  $exteriorMatches = (Get-FileHash -Algorithm SHA256 $generatedExteriorPatch).Hash -eq (Get-FileHash -Algorithm SHA256 $exteriorPatch).Hash
  if (-not $exteriorMatches) { throw 'The registered exterior derivative patch is not synchronized' }

  $curvaturePatched = Join-Path $OutputDirectory 'BerryCurvatureModelPatched.lean'
  $generatedCurvaturePatch = Join-Path $OutputDirectory 'berry-curvature-model.patch'
  & python $prepareCurvature --structured (Join-Path $applyRoot 'BerryCurvature.lean') --proof $curvatureProof --patched-output $curvaturePatched --patch-output $generatedCurvaturePatch
  if ($LASTEXITCODE -ne 0) { throw "Berry curvature model patch preparation failed: $LASTEXITCODE" }
  $curvatureMatches = (Get-FileHash -Algorithm SHA256 $generatedCurvaturePatch).Hash -eq (Get-FileHash -Algorithm SHA256 $curvaturePatch).Hash
  if (-not $curvatureMatches) { throw 'The registered Berry curvature model patch is not synchronized' }

  Copy-Item -Force -Path (Join-Path $SylvaRoot 'BlochTheorem.lean') -Destination (Join-Path $OutputDirectory 'BlochTheorem.lean')
  $paths = @($OutputDirectory, (Join-Path $SylvaRoot '.lake/build/lib/lean'))
  foreach ($package in @('mathlib', 'plausible', 'LeanSearchClient', 'importGraph', 'proofwidgets', 'aesop', 'Qq', 'batteries', 'Cli')) {
    $directory = Join-Path $SylvaRoot ".lake/packages/$package/.lake/build/lib/lean"
    if (Test-Path $directory) { $paths += $directory }
  }
  $env:LEAN_PATH = $paths -join [IO.Path]::PathSeparator

  $stages = [ordered]@{ integrationPreparation = 0; phasePatchSynchronized = 0; phaseStructurePatchSynchronized = 0; exteriorPatchSynchronized = 0; curvaturePatchSynchronized = 0 }
  $blochLog = Join-Path $OutputDirectory 'independent-bloch.log'
  $stages.bloch = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BlochTheorem.olean'), (Join-Path $OutputDirectory 'BlochTheorem.lean')) -LogPath $blochLog
  Assert-LeanSuccess $stages.bloch $blochLog 'independent BlochTheorem'
  $baseLog = Join-Path $OutputDirectory 'independent-base-connection.log'
  $stages.baseConnection = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnection.olean'), $baseConnection) -LogPath $baseLog
  Assert-LeanSuccess $stages.baseConnection $baseLog 'base patched BerryConnection'

  $phaseLog = Join-Path $OutputDirectory 'independent-phase.log'
  $stages.phaseModel = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryPhaseGaugeInvariance.olean'), $phaseProof) -LogPath $phaseLog
  Assert-LeanSuccess $stages.phaseModel $phaseLog 'independent Berry phase model'
  $phaseSource = Join-Path $OutputDirectory 'independent-phase-axioms.lean'
  $phaseAxiomLog = Join-Path $OutputDirectory 'independent-phase-axioms.log'
  Set-Content -Path $phaseSource -Encoding ASCII -Value @(
    'import BerryPhaseGaugeInvariance', '',
    '#print axioms BerryConnection.berryPhaseIntegral',
    '#print axioms BerryConnection.BerryPhase_GaugeInvariance_model'
  )
  $stages.phaseModelAudit = Invoke-NativeLean -Executable $lean -Arguments @($phaseSource) -LogPath $phaseAxiomLog
  Assert-LeanSuccess $stages.phaseModelAudit $phaseAxiomLog 'independent Berry phase axiom audit'
  $phaseText = [regex]::Replace((Get-Content -Raw -Path $phaseAxiomLog).Trim(), '\s+', ' ')
  Assert-StandardAxioms $phaseText 'BerryConnection' @('berryPhaseIntegral', 'BerryPhase_GaugeInvariance_model')

  $structureLog = Join-Path $OutputDirectory 'independent-structure.log'
  $stages.phaseStructureModel = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryPhaseModel.olean'), $structureProof) -LogPath $structureLog
  Assert-LeanSuccess $stages.phaseStructureModel $structureLog 'independent refined BerryPhase model'
  $structureSource = Join-Path $OutputDirectory 'independent-structure-axioms.lean'
  $structureAxiomLog = Join-Path $OutputDirectory 'independent-structure-axioms.log'
  Set-Content -Path $structureSource -Encoding ASCII -Value @(
    'import BerryPhaseModel', '',
    '#print axioms BerryConnection.BerryPhase_GaugeInvariance_refined_model'
  )
  $stages.phaseStructureModelAudit = Invoke-NativeLean -Executable $lean -Arguments @($structureSource) -LogPath $structureAxiomLog
  Assert-LeanSuccess $stages.phaseStructureModelAudit $structureAxiomLog 'independent refined BerryPhase axiom audit'
  $structureText = [regex]::Replace((Get-Content -Raw -Path $structureAxiomLog).Trim(), '\s+', ' ')
  Assert-StandardAxioms $structureText 'BerryConnection' @('BerryPhase_GaugeInvariance_refined_model')

  $exteriorLog = Join-Path $OutputDirectory 'independent-exterior.log'
  $stages.exteriorModel = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnectionExteriorDerivative.olean'), $exteriorProof) -LogPath $exteriorLog
  Assert-LeanSuccess $stages.exteriorModel $exteriorLog 'independent exterior derivative model'
  $exteriorSource = Join-Path $OutputDirectory 'independent-exterior-axioms.lean'
  $exteriorAxiomLog = Join-Path $OutputDirectory 'independent-exterior-axioms.log'
  Set-Content -Path $exteriorSource -Encoding ASCII -Value @(
    'import BerryConnectionExteriorDerivative', '',
    '#print axioms BerryConnection.exteriorDerivativeOfBerryConnection_model',
    '#print axioms BerryConnection.gaugeTransform1Form_model',
    '#print axioms BerryConnection.exteriorDerivativeOfBerryConnection_gauge_invariant_model'
  )
  $stages.exteriorModelAudit = Invoke-NativeLean -Executable $lean -Arguments @($exteriorSource) -LogPath $exteriorAxiomLog
  Assert-LeanSuccess $stages.exteriorModelAudit $exteriorAxiomLog 'independent exterior derivative axiom audit'
  $exteriorText = [regex]::Replace((Get-Content -Raw -Path $exteriorAxiomLog).Trim(), '\s+', ' ')
  Assert-StandardAxioms $exteriorText 'BerryConnection' @('exteriorDerivativeOfBerryConnection_model', 'gaugeTransform1Form_model', 'exteriorDerivativeOfBerryConnection_gauge_invariant_model')

  $mainLog = Join-Path $OutputDirectory 'independent-main.log'
  $stages.main = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryCurvature.olean'), (Join-Path $applyRoot 'BerryCurvature.lean')) -LogPath $mainLog
  Assert-LeanSuccess $stages.main $mainLog 'base patched BerryCurvature for independent curvature model'
  $curvatureLog = Join-Path $OutputDirectory 'independent-curvature.log'
  $stages.curvatureModel = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryCurvatureModel.olean'), $curvatureProof) -LogPath $curvatureLog
  Assert-LeanSuccess $stages.curvatureModel $curvatureLog 'independent BerryCurvature model and zero instance'
  $curvatureSource = Join-Path $OutputDirectory 'independent-curvature-axioms.lean'
  $curvatureAxiomLog = Join-Path $OutputDirectory 'independent-curvature-axioms.log'
  Set-Content -Path $curvatureSource -Encoding ASCII -Value @(
    'import BerryCurvatureModel', '',
    '#print axioms BerryCurvature.curvatureXYFromBerryConnection_model',
    '#print axioms BerryCurvature.zeroBerryCurvatureModel'
  )
  $stages.curvatureModelAudit = Invoke-NativeLean -Executable $lean -Arguments @($curvatureSource) -LogPath $curvatureAxiomLog
  Assert-LeanSuccess $stages.curvatureModelAudit $curvatureAxiomLog 'independent BerryCurvature axiom audit'
  $curvatureText = [regex]::Replace((Get-Content -Raw -Path $curvatureAxiomLog).Trim(), '\s+', ' ')
  Assert-StandardAxioms $curvatureText 'BerryCurvature' @('curvatureXYFromBerryConnection_model', 'zeroBerryCurvatureModel')

  $report = [ordered]@{
    schemaVersion = 2
    status = 'success'
    scope = 'Eight independent interval, refined-phase, exterior-derivative and BerryCurvature targets; downstream integration is verified separately'
    source = [ordered]@{
      repository = 'TOE-SYLVA-pull'
      root = $SylvaRoot
      commit = (git -C (Split-Path -Parent $SylvaRoot) rev-parse HEAD).Trim()
      baseConnectionSha256 = (Get-FileHash -Algorithm SHA256 $baseConnection).Hash.ToLowerInvariant()
      phaseProofSha256 = (Get-FileHash -Algorithm SHA256 $phaseProof).Hash.ToLowerInvariant()
      phaseStructureProofSha256 = (Get-FileHash -Algorithm SHA256 $structureProof).Hash.ToLowerInvariant()
      exteriorProofSha256 = (Get-FileHash -Algorithm SHA256 $exteriorProof).Hash.ToLowerInvariant()
      curvatureProofSha256 = (Get-FileHash -Algorithm SHA256 $curvatureProof).Hash.ToLowerInvariant()
      phasePatchSha256 = (Get-FileHash -Algorithm SHA256 $phasePatch).Hash.ToLowerInvariant()
      phaseStructurePatchSha256 = (Get-FileHash -Algorithm SHA256 $structurePatch).Hash.ToLowerInvariant()
      exteriorPatchSha256 = (Get-FileHash -Algorithm SHA256 $exteriorPatch).Hash.ToLowerInvariant()
      curvaturePatchSha256 = (Get-FileHash -Algorithm SHA256 $curvaturePatch).Hash.ToLowerInvariant()
      curvaturePatchedSha256 = (Get-FileHash -Algorithm SHA256 $curvaturePatched).Hash.ToLowerInvariant()
      preparedMainSha256 = $prepareReport.mainSha256
      prepared3DSha256 = $prepareReport.threeDSha256
      leanVersion = '4.29.0 / 98dc76e3c0a9b856c9b98726b713fb04fab16740'
    }
    build = [ordered]@{
      stages = $stages
      mainOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryCurvature.olean')).Hash.ToLowerInvariant()
      phaseModelOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryPhaseGaugeInvariance.olean')).Hash.ToLowerInvariant()
      phaseStructureOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryPhaseModel.olean')).Hash.ToLowerInvariant()
      exteriorModelOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryConnectionExteriorDerivative.olean')).Hash.ToLowerInvariant()
      curvatureModelOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryCurvatureModel.olean')).Hash.ToLowerInvariant()
      warningsPreserved = $true
    }
    axiomAudit = [ordered]@{ phase = $phaseText; phaseStructure = $structureText; exterior = $exteriorText; curvature = $curvatureText }
    validation = [ordered]@{
      fivePatchGeneratorTestsPassed = $true
      phasePatchSynchronized = $phaseMatches
      phaseStructurePatchSynchronized = $structureMatches
      exteriorPatchSynchronized = $exteriorMatches
      curvaturePatchSynchronized = $curvatureMatches
      independentPhaseModelProved = $true
      independentPhaseStructureProved = $true
      independentExteriorGaugeInvarianceProved = $true
      independentCurvatureDefinitionPresent = $true
      independentZeroCurvatureInstanceConstructed = $true
      standardAxiomsOnlyForEightTargets = $true
      externalSourceModified = $false
      downstreamIntegrationRun = $false
    }
    boundaries = @(
      'This script audits independent models only; the patched-connection downstream integration has a separate entry point.',
      'Splitting verification avoids repeated compilation and does not weaken any target or allow new axioms.',
      'General differential forms, multivalued phase winding and the full Lake project remain outside this claim.'
    )
  }
  Set-Content -Path $ReportPath -Encoding UTF8 -Value ($report | ConvertTo-Json -Depth 10)
  Write-Output ($report | ConvertTo-Json -Depth 10)
}

run_all_tests
