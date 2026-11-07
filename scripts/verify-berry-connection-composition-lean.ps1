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
  $compositionProof = Join-Path $repoRoot 'research/formalization/BerryConnectionGaugeComposition.lean'
  $identityPatch = Join-Path $repoRoot 'research/formalization/berry-connection-gauge-identity.patch'
  $compositionPatch = Join-Path $repoRoot 'research/formalization/berry-connection-gauge-composition.patch'
  $prepareIdentity = Join-Path $repoRoot 'scripts/prepare_berry_connection_identity_patch.py'
  $prepareComposition = Join-Path $repoRoot 'scripts/prepare_berry_connection_composition_patch.py'
  $original = Join-Path $SylvaRoot 'BerryConnection.lean'
  foreach ($required in @($lean, $identityProof, $compositionProof, $identityPatch, $compositionPatch, $prepareIdentity, $prepareComposition, $original, (Join-Path $SylvaRoot 'BlochTheorem.lean'))) {
    if (-not (Test-Path $required)) { throw "Required input is missing: $required" }
  }
  $null = New-Item -ItemType Directory -Force -Path $OutputDirectory
  $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath)

  $identityPatched = Join-Path $OutputDirectory 'BerryConnectionIdentityPatched.lean'
  $generatedIdentityPatch = Join-Path $OutputDirectory 'berry-connection-gauge-identity.patch'
  & python $prepareIdentity --original $original --proof $identityProof --patched-output $identityPatched --patch-output $generatedIdentityPatch
  if ($LASTEXITCODE -ne 0) { throw "Identity patch preparation failed: $LASTEXITCODE" }
  $identityMatches = (Get-FileHash -Algorithm SHA256 $generatedIdentityPatch).Hash -eq (Get-FileHash -Algorithm SHA256 $identityPatch).Hash
  if (-not $identityMatches) { throw 'The identity patch is not synchronized' }

  $compositionPatched = Join-Path $OutputDirectory 'BerryConnectionCompositionPatched.lean'
  $generatedCompositionPatch = Join-Path $OutputDirectory 'berry-connection-gauge-composition.patch'
  & python $prepareComposition --original $identityPatched --proof $compositionProof --patched-output $compositionPatched --patch-output $generatedCompositionPatch
  if ($LASTEXITCODE -ne 0) { throw "Composition patch preparation failed: $LASTEXITCODE" }
  $compositionMatches = (Get-FileHash -Algorithm SHA256 $generatedCompositionPatch).Hash -eq (Get-FileHash -Algorithm SHA256 $compositionPatch).Hash
  if (-not $compositionMatches) { throw 'The composition patch is not synchronized' }

  $applyRoot = Join-Path $OutputDirectory 'patch-application'
  $null = New-Item -ItemType Directory -Force -Path $applyRoot
  $applied = Join-Path $applyRoot 'BerryConnection.lean'
  Copy-Item -Force -Path $original -Destination $applied
  Push-Location $applyRoot
  try {
    & git apply --check $identityPatch
    if ($LASTEXITCODE -ne 0) { throw 'Identity git apply --check failed' }
    & git apply $identityPatch
    if ($LASTEXITCODE -ne 0) { throw 'Identity git apply failed' }
    & git apply --check $compositionPatch
    if ($LASTEXITCODE -ne 0) { throw 'Composition git apply --check failed' }
    & git apply $compositionPatch
    if ($LASTEXITCODE -ne 0) { throw 'Composition git apply failed' }
  } finally {
    Pop-Location
  }
  $applicationMatches = (Get-FileHash -Algorithm SHA256 $applied).Hash -eq (Get-FileHash -Algorithm SHA256 $compositionPatched).Hash
  if (-not $applicationMatches) { throw 'Sequential patch application differs from the generated source' }

  Copy-Item -Force -Path (Join-Path $SylvaRoot 'BlochTheorem.lean') -Destination (Join-Path $OutputDirectory 'BlochTheorem.lean')
  Copy-Item -Force -Path $original -Destination (Join-Path $OutputDirectory 'BerryConnection.lean')
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
  $stages.originalConnection = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnection.olean'), (Join-Path $OutputDirectory 'BerryConnection.lean')) -LogPath $connectionLog
  Assert-LeanSuccess $stages.originalConnection $connectionLog 'original BerryConnection'
  $identityLog = Join-Path $OutputDirectory 'identity-standalone-build.log'
  $stages.identity = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnectionGaugeIdentity.olean'), $identityProof) -LogPath $identityLog
  Assert-LeanSuccess $stages.identity $identityLog 'BerryConnectionGaugeIdentity'
  $compositionLog = Join-Path $OutputDirectory 'composition-standalone-build.log'
  $stages.composition = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnectionGaugeComposition.olean'), $compositionProof) -LogPath $compositionLog
  Assert-LeanSuccess $stages.composition $compositionLog 'BerryConnectionGaugeComposition'

  $standaloneSource = Join-Path $OutputDirectory 'composition-standalone-axioms.lean'
  $standaloneLog = Join-Path $OutputDirectory 'composition-standalone-axioms.log'
  Set-Content -Path $standaloneSource -Encoding ASCII -Value @(
    'import BerryConnectionGaugeComposition',
    '',
    '#print axioms BerryConnection.BerryConnection_GaugeTransformComposition_concrete',
    '#print axioms BerryConnection.BerryConnection_GaugeTransformationIdentity_concrete'
  )
  $stages.standaloneAudit = Invoke-NativeLean -Executable $lean -Arguments @($standaloneSource) -LogPath $standaloneLog
  Assert-LeanSuccess $stages.standaloneAudit $standaloneLog 'standalone composition axiom audit'
  $standaloneText = [regex]::Replace((Get-Content -Raw -Path $standaloneLog).Trim(), '\s+', ' ')
  foreach ($name in @('BerryConnection_GaugeTransformComposition_concrete', 'BerryConnection_GaugeTransformationIdentity_concrete')) {
    if (-not $standaloneText.Contains("'BerryConnection.$name' depends on axioms: [propext, Classical.choice, Quot.sound]")) {
      throw "Unexpected standalone axiom dependency for ${name}: $standaloneText"
    }
  }
  if ($standaloneText.Contains('sorryAx')) { throw "sorryAx in standalone audit: $standaloneText" }

  $patchedLog = Join-Path $OutputDirectory 'composition-patched-build.log'
  $stages.patched = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnection.olean'), $compositionPatched) -LogPath $patchedLog
  Assert-LeanSuccess $stages.patched $patchedLog 'composition-patched BerryConnection'
  $patchedSource = Join-Path $OutputDirectory 'composition-patched-axioms.lean'
  $patchedAxiomLog = Join-Path $OutputDirectory 'composition-patched-axioms.log'
  Set-Content -Path $patchedSource -Encoding ASCII -Value @(
    'import BerryConnection',
    '',
    '#print axioms BerryConnection.BerryConnection_GaugeTransformationIdentity',
    '#print axioms BerryConnection.BerryConnection_GaugeTransformComposition'
  )
  $stages.patchedAudit = Invoke-NativeLean -Executable $lean -Arguments @($patchedSource) -LogPath $patchedAxiomLog
  Assert-LeanSuccess $stages.patchedAudit $patchedAxiomLog 'patched composition axiom audit'
  $patchedText = [regex]::Replace((Get-Content -Raw -Path $patchedAxiomLog).Trim(), '\s+', ' ')
  foreach ($name in @('BerryConnection_GaugeTransformationIdentity', 'BerryConnection_GaugeTransformComposition')) {
    if (-not $patchedText.Contains("'BerryConnection.$name' depends on axioms: [propext, Classical.choice, Quot.sound]")) {
      throw "Unexpected patched axiom dependency for ${name}: $patchedText"
    }
  }
  if ($patchedText.Contains('sorryAx')) { throw "sorryAx in patched audit: $patchedText" }

  $proofText = (Get-Content -Raw -Path $identityProof) + (Get-Content -Raw -Path $compositionProof)
  $forbidden = [regex]::IsMatch($proofText, '(?m)^\s*(axiom|postulate|sorry)\b') -or $proofText.Contains('True := by trivial')
  if ($forbidden) { throw 'A forbidden placeholder or new axiom remains in the proofs' }
  $report = [ordered]@{
    schemaVersion = 1
    status = 'success'
    scope = 'Concrete 2D real Berry-connection identity and composition proofs with sequential patches; not a full-project proof'
    source = [ordered]@{
      repository = 'TOE-SYLVA-pull'
      root = $SylvaRoot
      commit = (git -C (Split-Path -Parent $SylvaRoot) rev-parse HEAD).Trim()
      originalFile = 'BerryConnection.lean'
      originalSha256 = (Get-FileHash -Algorithm SHA256 $original).Hash.ToLowerInvariant()
      identityProofSha256 = (Get-FileHash -Algorithm SHA256 $identityProof).Hash.ToLowerInvariant()
      compositionProofSha256 = (Get-FileHash -Algorithm SHA256 $compositionProof).Hash.ToLowerInvariant()
      identityPatchSha256 = (Get-FileHash -Algorithm SHA256 $identityPatch).Hash.ToLowerInvariant()
      compositionPatchSha256 = (Get-FileHash -Algorithm SHA256 $compositionPatch).Hash.ToLowerInvariant()
      leanVersion = '4.29.0 / 98dc76e3c0a9b856c9b98726b713fb04fab16740'
    }
    build = [ordered]@{
      stages = $stages
      identityOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryConnectionGaugeIdentity.olean')).Hash.ToLowerInvariant()
      compositionOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryConnectionGaugeComposition.olean')).Hash.ToLowerInvariant()
      patchedOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryConnection.olean')).Hash.ToLowerInvariant()
      warningsPreserved = $true
    }
    axiomAudit = [ordered]@{ standalone = $standaloneText; patched = $patchedText }
    validation = [ordered]@{
      identityPatchSynchronized = $identityMatches
      compositionPatchSynchronized = $compositionMatches
      sequentialApplicationMatches = $applicationMatches
      forbiddenPlaceholderOrNewAxiom = $forbidden
      externalSourceModified = $false
      fullProjectBuilt = $false
      physicalSemanticProof = $false
    }
    boundaries = @(
      'Both theorems are narrowed to real 2D connection components.',
      'Composition requires DifferentiableAt for both phases; no general gauge-law axiom is used or cleared.',
      'The composition patch must be applied after the identity patch, which supplies gaugeTransformConnection2D and shared instances.',
      'Standalone and patched audits run in separate dependency environments to avoid duplicate helper declarations.',
      'Other placeholders and warnings remain visible; the external TOE-SYLVA source tree is not modified.'
    )
  }
  Set-Content -Path $ReportPath -Encoding UTF8 -Value ($report | ConvertTo-Json -Depth 10)
  Write-Output ($report | ConvertTo-Json -Depth 10)
}

run_all_tests
