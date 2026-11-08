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
  $identityProof = Join-Path $repoRoot 'research/formalization/BerryConnectionGaugeIdentity.lean'
  $lawProof = Join-Path $repoRoot 'research/formalization/BerryConnectionGaugeLaw.lean'
  $l2Proof = Join-Path $repoRoot 'research/formalization/BlochL2State.lean'
  $proof = Join-Path $repoRoot 'research/formalization/FirstChernNumberModel.lean'
  $registeredPatch = Join-Path $repoRoot 'research/formalization/first-chern-number.patch'
  $prepare = Join-Path $repoRoot 'scripts/prepare_first_chern_number_patch.py'
  $original = Join-Path $SylvaRoot 'BerryCurvature.lean'
  foreach ($required in @($lean, $identityProof, $lawProof, $l2Proof, $proof, $registeredPatch, $prepare, $original, (Join-Path $SylvaRoot 'BlochTheorem.lean'), (Join-Path $SylvaRoot 'BerryConnection.lean'))) {
    if (-not (Test-Path $required)) { throw "Required input is missing: $required" }
  }
  $null = New-Item -ItemType Directory -Force -Path $OutputDirectory
  $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath)

  $patched = Join-Path $OutputDirectory 'BerryCurvatureChernPatched.lean'
  $generatedPatch = Join-Path $OutputDirectory 'first-chern-number.patch'
  & python $prepare --original $original --proof $proof --patched-output $patched --patch-output $generatedPatch
  if ($LASTEXITCODE -ne 0) { throw "Chern patch preparation failed: $LASTEXITCODE" }
  $patchMatches = (Get-FileHash -Algorithm SHA256 $generatedPatch).Hash -eq (Get-FileHash -Algorithm SHA256 $registeredPatch).Hash
  if (-not $patchMatches) { throw 'The registered Chern patch is not synchronized' }

  $applyRoot = Join-Path $OutputDirectory 'patch-application'
  $null = New-Item -ItemType Directory -Force -Path $applyRoot
  $applied = Join-Path $applyRoot 'BerryCurvature.lean'
  Copy-Item -Force -Path $original -Destination $applied
  Push-Location $applyRoot
  try {
    & git apply --check $registeredPatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply --check failed for the Chern patch' }
    & git apply $registeredPatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply failed for the Chern patch' }
  } finally {
    Pop-Location
  }
  $applicationMatches = (Get-FileHash -Algorithm SHA256 $applied).Hash -eq (Get-FileHash -Algorithm SHA256 $patched).Hash
  if (-not $applicationMatches) { throw 'The applied Chern patch differs from the generated source' }

  Copy-Item -Force -Path (Join-Path $SylvaRoot 'BlochTheorem.lean') -Destination (Join-Path $OutputDirectory 'BlochTheorem.lean')
  Copy-Item -Force -Path (Join-Path $SylvaRoot 'BerryConnection.lean') -Destination (Join-Path $OutputDirectory 'BerryConnection.lean')
  Copy-Item -Force -Path $original -Destination (Join-Path $OutputDirectory 'BerryCurvatureOriginal.lean')
  $paths = @($OutputDirectory, (Join-Path $SylvaRoot '.lake/build/lib/lean'))
  foreach ($package in @('mathlib', 'plausible', 'LeanSearchClient', 'importGraph', 'proofwidgets', 'aesop', 'Qq', 'batteries', 'Cli')) {
    $directory = Join-Path $SylvaRoot ".lake/packages/$package/.lake/build/lib/lean"
    if (Test-Path $directory) { $paths += $directory }
  }
  $env:LEAN_PATH = $paths -join [IO.Path]::PathSeparator

  $stages = [ordered]@{}
  $blochLog = Join-Path $OutputDirectory 'bloch-build.log'
  $stages.bloch = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BlochTheorem.olean'), (Join-Path $OutputDirectory 'BlochTheorem.lean')) -LogPath $blochLog
  Assert-LeanSuccess $stages.bloch $blochLog 'BlochTheorem'
  $connectionLog = Join-Path $OutputDirectory 'connection-original-build.log'
  $stages.connection = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnection.olean'), (Join-Path $OutputDirectory 'BerryConnection.lean')) -LogPath $connectionLog
  Assert-LeanSuccess $stages.connection $connectionLog 'original BerryConnection'
  $identityLog = Join-Path $OutputDirectory 'identity-build.log'
  $stages.identity = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnectionGaugeIdentity.olean'), $identityProof) -LogPath $identityLog
  Assert-LeanSuccess $stages.identity $identityLog 'BerryConnectionGaugeIdentity'
  $lawLog = Join-Path $OutputDirectory 'law-build.log'
  $stages.law = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnectionGaugeLaw.olean'), $lawProof) -LogPath $lawLog
  Assert-LeanSuccess $stages.law $lawLog 'BerryConnectionGaugeLaw'
  $l2Log = Join-Path $OutputDirectory 'bloch-l2-build.log'
  $stages.l2 = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BlochL2State.olean'), $l2Proof) -LogPath $l2Log
  Assert-LeanSuccess $stages.l2 $l2Log 'BlochL2State'
  $originalCurvatureLog = Join-Path $OutputDirectory 'original-curvature-build.log'
  $stages.originalCurvature = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryCurvature.olean'), (Join-Path $OutputDirectory 'BerryCurvatureOriginal.lean')) -LogPath $originalCurvatureLog
  Assert-LeanSuccess $stages.originalCurvature $originalCurvatureLog 'original BerryCurvature'
  $modelLog = Join-Path $OutputDirectory 'chern-model-build.log'
  $stages.model = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'FirstChernNumberModel.olean'), $proof) -LogPath $modelLog
  Assert-LeanSuccess $stages.model $modelLog 'FirstChernNumberModel'

  $standaloneSource = Join-Path $OutputDirectory 'chern-model-axioms.lean'
  $standaloneLog = Join-Path $OutputDirectory 'chern-model-axioms.log'
  Set-Content -Path $standaloneSource -Encoding ASCII -Value @(
    'import FirstChernNumberModel',
    '',
    '#print axioms BerryCurvature.FirstChernNumber_Integrality_model',
    '#print axioms BerryCurvature.zeroFirstChernNumberModel'
  )
  $stages.standaloneAudit = Invoke-NativeLean -Executable $lean -Arguments @($standaloneSource) -LogPath $standaloneLog
  Assert-LeanSuccess $stages.standaloneAudit $standaloneLog 'Chern model axiom audit'
  $standaloneText = [regex]::Replace((Get-Content -Raw -Path $standaloneLog).Trim(), '\s+', ' ')
  foreach ($name in @('FirstChernNumber_Integrality_model', 'zeroFirstChernNumberModel')) {
    if (-not $standaloneText.Contains("'BerryCurvature.${name}' depends on axioms: [propext, Classical.choice, Quot.sound]")) {
      throw "Unexpected model axiom dependencies for ${name}: $standaloneText"
    }
  }
  if ($standaloneText.Contains('sorryAx')) { throw "sorryAx in model audit: $standaloneText" }

  $patchedLog = Join-Path $OutputDirectory 'chern-patched-build.log'
  $stages.patched = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryCurvature.olean'), $patched) -LogPath $patchedLog
  Assert-LeanSuccess $stages.patched $patchedLog 'Chern-patched BerryCurvature'
  $patchedSource = Join-Path $OutputDirectory 'chern-patched-axioms.lean'
  $patchedAxiomLog = Join-Path $OutputDirectory 'chern-patched-axioms.log'
  Set-Content -Path $patchedSource -Encoding ASCII -Value @(
    'import BerryCurvature',
    '',
    '#print axioms BerryCurvature.FirstChernNumber_Integrality'
  )
  $stages.patchedAudit = Invoke-NativeLean -Executable $lean -Arguments @($patchedSource) -LogPath $patchedAxiomLog
  Assert-LeanSuccess $stages.patchedAudit $patchedAxiomLog 'patched Chern axiom audit'
  $patchedText = [regex]::Replace((Get-Content -Raw -Path $patchedAxiomLog).Trim(), '\s+', ' ')
  $patchedExpected = "'BerryCurvature.FirstChernNumber_Integrality' depends on axioms: [propext, Classical.choice, Quot.sound]"
  if (-not $patchedText.Contains($patchedExpected) -or $patchedText.Contains('sorryAx')) {
    throw "Unexpected patched Chern axioms: $patchedText"
  }

  $proofText = Get-Content -Raw -Path $proof
  $forbidden = [regex]::IsMatch($proofText, '(?m)^\s*(axiom|postulate|sorry)\b') -or $proofText.Contains('True := by trivial')
  if ($forbidden) { throw 'The Chern model contains a forbidden placeholder or new axiom' }
  $report = [ordered]@{
    schemaVersion = 1
    status = 'success'
    scope = 'Integral-to-integer First Chern model, zero-curvature instance and a narrow structural patch; not a general topological integrality proof'
    source = [ordered]@{
      repository = 'TOE-SYLVA-pull'
      root = $SylvaRoot
      commit = (git -C (Split-Path -Parent $SylvaRoot) rev-parse HEAD).Trim()
      originalFile = 'BerryCurvature.lean'
      originalSha256 = (Get-FileHash -Algorithm SHA256 $original).Hash.ToLowerInvariant()
      proofFile = 'research/formalization/FirstChernNumberModel.lean'
      proofSha256 = (Get-FileHash -Algorithm SHA256 $proof).Hash.ToLowerInvariant()
      patchFile = 'research/formalization/first-chern-number.patch'
      patchSha256 = (Get-FileHash -Algorithm SHA256 $registeredPatch).Hash.ToLowerInvariant()
      leanVersion = '4.29.0 / 98dc76e3c0a9b856c9b98726b713fb04fab16740'
    }
    build = [ordered]@{
      stages = $stages
      modelOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'FirstChernNumberModel.olean')).Hash.ToLowerInvariant()
      patchedOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryCurvature.olean')).Hash.ToLowerInvariant()
      warningsPreserved = $true
    }
    axiomAudit = [ordered]@{ model = $standaloneText; patched = $patchedText }
    validation = [ordered]@{
      patchSynchronized = $patchMatches
      patchApplicationMatchesGenerated = $applicationMatches
      integralToIntegerDefinitionPresent = $true
      zeroCurvatureInstanceConstructed = $true
      generalTopologicalIntegralityProved = $false
      forbiddenPlaceholderOrNewAxiom = $forbidden
      externalSourceModified = $false
      fullProjectBuilt = $false
    }
    boundaries = @(
      'The model makes the measure and integral-to-integer equation explicit; it does not derive general Chern integrality from arbitrary curvature data.',
      'The zero-curvature instance is a computable example, not a proof of the general topological theorem.',
      'curvatureIntegral is declared before FirstChernNumber to avoid forward references.',
      'Other placeholders and general topological invariance remain open; the external TOE-SYLVA source tree is only read.'
    )
  }
  Set-Content -Path $ReportPath -Encoding UTF8 -Value ($report | ConvertTo-Json -Depth 10)
  Write-Output ($report | ConvertTo-Json -Depth 10)
}

run_all_tests
