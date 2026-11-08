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

function run_all_tests {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $lean = Join-Path $LeanHome 'bin/lean.exe'
  $prepare = Join-Path $repoRoot 'scripts/prepare_berry_curvature_integration.py'
  $integrationTest = Join-Path $repoRoot 'scripts/test_berry_curvature_patch_integration.py'
  $l2Proof = Join-Path $repoRoot 'research/formalization/BlochL2State.lean'
  $instanceProof = Join-Path $repoRoot 'research/formalization/BlochL2ConstantInstance.lean'
  $original = Join-Path $SylvaRoot 'BerryCurvature.lean'
  $original3D = Join-Path $SylvaRoot 'TOE_SYLVA_Solutions/BerryCurvature_GaugeInvariance.lean'
  foreach ($required in @($lean, $prepare, $integrationTest, $l2Proof, $instanceProof, $original, $original3D, (Join-Path $SylvaRoot 'BlochTheorem.lean'), (Join-Path $SylvaRoot 'BerryConnection.lean'))) {
    if (-not (Test-Path $required)) { throw "Required input is missing: $required" }
  }
  $null = New-Item -ItemType Directory -Force -Path $OutputDirectory
  $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath)

  $env:SYLVA_ROOT = $SylvaRoot
  & python $integrationTest
  if ($LASTEXITCODE -ne 0) { throw "Berry integration unit test failed: $LASTEXITCODE" }
  $applyRoot = Join-Path $OutputDirectory 'patch-application'
  $prepareText = (& python $prepare --sylva-root $SylvaRoot --output-directory $applyRoot | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { throw "Berry integration preparation failed: $prepareText" }
  $prepareReport = $prepareText | ConvertFrom-Json

  Copy-Item -Force -Path (Join-Path $SylvaRoot 'BlochTheorem.lean') -Destination (Join-Path $OutputDirectory 'BlochTheorem.lean')
  $paths = @($OutputDirectory, (Join-Path $SylvaRoot '.lake/build/lib/lean'))
  foreach ($package in @('mathlib', 'plausible', 'LeanSearchClient', 'importGraph', 'proofwidgets', 'aesop', 'Qq', 'batteries', 'Cli')) {
    $directory = Join-Path $SylvaRoot ".lake/packages/$package/.lake/build/lib/lean"
    if (Test-Path $directory) { $paths += $directory }
  }
  $env:LEAN_PATH = $paths -join [IO.Path]::PathSeparator

  $stages = [ordered]@{ integrationPreparation = 0 }
  $blochLog = Join-Path $OutputDirectory 'integration-bloch.log'
  $stages.bloch = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BlochTheorem.olean'), (Join-Path $OutputDirectory 'BlochTheorem.lean')) -LogPath $blochLog
  Assert-LeanSuccess $stages.bloch $blochLog 'integration BlochTheorem'
  $connectionLog = Join-Path $OutputDirectory 'integration-connection.log'
  $stages.connection = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnection.olean'), (Join-Path $applyRoot 'BerryConnection.lean')) -LogPath $connectionLog
  Assert-LeanSuccess $stages.connection $connectionLog 'patched BerryConnection'
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
    '#print axioms BerryConnection.constantBlochL2State_gauge_law'
  )
  $stages.axiomAudit = Invoke-NativeLean -Executable $lean -Arguments @($auditSource) -LogPath $auditLog
  Assert-LeanSuccess $stages.axiomAudit $auditLog 'integrated fourteen-target axiom audit'
  $auditText = [regex]::Replace((Get-Content -Raw -Path $auditLog).Trim(), '\s+', ' ')
  foreach ($name in @('BerryConnection.BerryConnection_GaugeTransformationIdentity', 'BerryConnection.BerryConnection_GaugeTransformComposition', 'BerryConnection.BerryConnection_GaugeTransformationLaw', 'BerryCurvature.BerryCurvature_GaugeInvariance', 'BerryCurvature.FirstChernNumber_Integrality', 'BerryCurvature.FirstChernNumber_TopologicalInvariance', 'BerryCurvature.TotalChernNumber_FullBandVanishing', 'curl_linear_subtraction', 'curl_of_gradient_zero', 'BerryCurvature_gauge_invariance', 'BerryConnection.BlochL2State_normalization_integral', 'BerryConnection.BlochL2State_gauge_transformation_law', 'BerryConnection.constantBlochL2State', 'BerryConnection.constantBlochL2State_gauge_law')) {
    if (-not $auditText.Contains("'${name}' depends on axioms: [propext, Classical.choice, Quot.sound]")) {
      throw "Unexpected integrated axiom dependencies for ${name}: $auditText"
    }
  }
  if ($auditText.Contains('sorryAx')) { throw "sorryAx in integrated audit: $auditText" }

  $report = [ordered]@{
    schemaVersion = 3
    status = 'success'
    scope = 'Sequential seven-patch integration plus Bloch L2 normalization, gauge law and constant instance on the patched connection; no new physics claim'
    source = [ordered]@{
      repository = 'TOE-SYLVA-pull'
      root = $SylvaRoot
      commit = (git -C (Split-Path -Parent $SylvaRoot) rev-parse HEAD).Trim()
      originalSha256 = $prepareReport.originalSha256
      preparedConnectionSha256 = $prepareReport.connectionSha256
      preparedMainSha256 = $prepareReport.mainSha256
      prepared3DSha256 = $prepareReport.threeDSha256
      l2ProofSha256 = (Get-FileHash -Algorithm SHA256 $l2Proof).Hash.ToLowerInvariant()
      instanceProofSha256 = (Get-FileHash -Algorithm SHA256 $instanceProof).Hash.ToLowerInvariant()
      patches = $prepareReport.stages
      leanVersion = '4.29.0 / 98dc76e3c0a9b856c9b98726b713fb04fab16740'
    }
    build = [ordered]@{
      stages = $stages
      connectionOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryConnection.olean')).Hash.ToLowerInvariant()
      mainOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryCurvature.olean')).Hash.ToLowerInvariant()
      threeDOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryCurvatureGaugeInvariance3D.olean')).Hash.ToLowerInvariant()
      l2OutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BlochL2State.olean')).Hash.ToLowerInvariant()
      instanceOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BlochL2ConstantInstance.olean')).Hash.ToLowerInvariant()
      warningsPreserved = $true
    }
    axiomAudit = $auditText
    validation = [ordered]@{
      integrationUnitTestPassed = $true
      sequentialPatchApplication = $true
      combinedBuildSucceeded = $true
      patchedConnectionUsedByCurvature = $true
      l2UsesPatchedConnection = $true
      duplicateStandaloneGaugeLawImportsRemoved = $true
      standardAxiomsOnlyForFourteenTargets = $true
      newCombinedPatchCreated = $false
      forbiddenPlaceholderOrNewAxiomInTargets = $false
      externalSourceModified = $false
      fullProjectBuilt = $false
    }
    boundaries = @(
      'This verifies integration of existing patches and L2 modules; it does not add another duplicate combined patch.',
      'BerryCurvature and BlochL2State are compiled against the patched BerryConnection, not the original dependency.',
      'The fourteen audited targets use only the standard axioms; unrelated placeholders in the original files remain outside this claim.',
      'The Dirac instance is a computable test case, not a general Brillouin-zone measure or a construction from old Props.',
      'Conditional Chern invariance and zero-sum hypotheses are not gap-preserving perturbation or completeness-based full-band proofs.',
      'The external TOE-SYLVA source tree is only read; the full Lake project is not built by this script.'
    )
  }
  Set-Content -Path $ReportPath -Encoding UTF8 -Value ($report | ConvertTo-Json -Depth 10)
  Write-Output ($report | ConvertTo-Json -Depth 10)
}

run_all_tests
