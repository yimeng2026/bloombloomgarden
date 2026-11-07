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
  $proof = Join-Path $repoRoot 'research/formalization/BerryConnectionGaugeIdentity.lean'
  $registeredPatch = Join-Path $repoRoot 'research/formalization/berry-connection-gauge-identity.patch'
  $prepare = Join-Path $repoRoot 'scripts/prepare_berry_connection_identity_patch.py'
  $original = Join-Path $SylvaRoot 'BerryConnection.lean'
  foreach ($required in @($lean, $proof, $registeredPatch, $prepare, $original, (Join-Path $SylvaRoot 'BlochTheorem.lean'))) {
    if (-not (Test-Path $required)) { throw "Required input is missing: $required" }
  }
  $null = New-Item -ItemType Directory -Force -Path $OutputDirectory
  $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath)

  $patched = Join-Path $OutputDirectory 'BerryConnectionIdentityPatched.lean'
  $generatedPatch = Join-Path $OutputDirectory 'berry-connection-gauge-identity.patch'
  & python $prepare --original $original --proof $proof --patched-output $patched --patch-output $generatedPatch
  if ($LASTEXITCODE -ne 0) { throw "Identity patch preparation failed: $LASTEXITCODE" }
  $patchMatches = (Get-FileHash -Algorithm SHA256 $generatedPatch).Hash -eq (Get-FileHash -Algorithm SHA256 $registeredPatch).Hash
  if (-not $patchMatches) { throw 'The registered identity patch is not synchronized' }

  $applyRoot = Join-Path $OutputDirectory 'patch-application'
  $null = New-Item -ItemType Directory -Force -Path $applyRoot
  $applied = Join-Path $applyRoot 'BerryConnection.lean'
  Copy-Item -Force -Path $original -Destination $applied
  Push-Location $applyRoot
  try {
    & git apply --check $registeredPatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply --check failed for the identity patch' }
    & git apply $registeredPatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply failed for the identity patch' }
  } finally {
    Pop-Location
  }
  $applicationMatches = (Get-FileHash -Algorithm SHA256 $applied).Hash -eq (Get-FileHash -Algorithm SHA256 $patched).Hash
  if (-not $applicationMatches) { throw 'The applied identity patch differs from the generated source' }

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
  $proofLog = Join-Path $OutputDirectory 'identity-standalone-build.log'
  $stages.proof = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnectionGaugeIdentity.olean'), $proof) -LogPath $proofLog
  Assert-LeanSuccess $stages.proof $proofLog 'BerryConnectionGaugeIdentity'

  $standaloneSource = Join-Path $OutputDirectory 'identity-standalone-axioms.lean'
  $standaloneLog = Join-Path $OutputDirectory 'identity-standalone-axioms.log'
  Set-Content -Path $standaloneSource -Encoding ASCII -Value @(
    'import BerryConnectionGaugeIdentity',
    '',
    '#print axioms BerryConnection.BerryConnection_GaugeTransformationIdentity_concrete'
  )
  $stages.standaloneAudit = Invoke-NativeLean -Executable $lean -Arguments @($standaloneSource) -LogPath $standaloneLog
  Assert-LeanSuccess $stages.standaloneAudit $standaloneLog 'standalone identity axiom audit'
  $standaloneText = [regex]::Replace((Get-Content -Raw -Path $standaloneLog).Trim(), '\s+', ' ')
  $standaloneExpected = "'BerryConnection.BerryConnection_GaugeTransformationIdentity_concrete' depends on axioms: [propext, Classical.choice, Quot.sound]"
  if (-not $standaloneText.Contains($standaloneExpected) -or $standaloneText.Contains('sorryAx')) {
    throw "Unexpected standalone identity axioms: $standaloneText"
  }

  # Compile the patched original only after the standalone audit. Importing both
  # environments simultaneously would duplicate the helper declarations.
  $patchedLog = Join-Path $OutputDirectory 'identity-patched-build.log'
  $stages.patched = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnection.olean'), $patched) -LogPath $patchedLog
  Assert-LeanSuccess $stages.patched $patchedLog 'patched BerryConnection'
  $patchedSource = Join-Path $OutputDirectory 'identity-patched-axioms.lean'
  $patchedAxiomLog = Join-Path $OutputDirectory 'identity-patched-axioms.log'
  Set-Content -Path $patchedSource -Encoding ASCII -Value @(
    'import BerryConnection',
    '',
    '#print axioms BerryConnection.BerryConnection_GaugeTransformationIdentity'
  )
  $stages.patchedAudit = Invoke-NativeLean -Executable $lean -Arguments @($patchedSource) -LogPath $patchedAxiomLog
  Assert-LeanSuccess $stages.patchedAudit $patchedAxiomLog 'patched identity axiom audit'
  $patchedText = [regex]::Replace((Get-Content -Raw -Path $patchedAxiomLog).Trim(), '\s+', ' ')
  $patchedExpected = "'BerryConnection.BerryConnection_GaugeTransformationIdentity' depends on axioms: [propext, Classical.choice, Quot.sound]"
  if (-not $patchedText.Contains($patchedExpected) -or $patchedText.Contains('sorryAx')) {
    throw "Unexpected patched identity axioms: $patchedText"
  }

  $proofText = Get-Content -Raw -Path $proof
  $forbidden = [regex]::IsMatch($proofText, '(?m)^\s*(axiom|postulate|sorry)\b') -or $proofText.Contains('True := by trivial')
  if ($forbidden) { throw 'The identity proof contains a forbidden placeholder or new axiom' }
  $report = [ordered]@{
    schemaVersion = 1
    status = 'success'
    scope = 'Concrete 2D real Berry-connection identity gauge transformation; not a full-project proof'
    source = [ordered]@{
      repository = 'TOE-SYLVA-pull'
      root = $SylvaRoot
      commit = (git -C (Split-Path -Parent $SylvaRoot) rev-parse HEAD).Trim()
      originalFile = 'BerryConnection.lean'
      originalSha256 = (Get-FileHash -Algorithm SHA256 $original).Hash.ToLowerInvariant()
      proofFile = 'research/formalization/BerryConnectionGaugeIdentity.lean'
      proofSha256 = (Get-FileHash -Algorithm SHA256 $proof).Hash.ToLowerInvariant()
      patchFile = 'research/formalization/berry-connection-gauge-identity.patch'
      patchSha256 = (Get-FileHash -Algorithm SHA256 $registeredPatch).Hash.ToLowerInvariant()
      leanVersion = '4.29.0 / 98dc76e3c0a9b856c9b98726b713fb04fab16740'
    }
    build = [ordered]@{
      stages = $stages
      standaloneOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryConnectionGaugeIdentity.olean')).Hash.ToLowerInvariant()
      patchedOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryConnection.olean')).Hash.ToLowerInvariant()
      warningsPreserved = $true
    }
    axiomAudit = [ordered]@{
      standalone = $standaloneText
      patched = $patchedText
      separateEnvironments = $true
    }
    validation = [ordered]@{
      patchSynchronized = $patchMatches
      patchApplicationMatchesGenerated = $applicationMatches
      forbiddenPlaceholderOrNewAxiom = $forbidden
      externalSourceModified = $false
      fullProjectBuilt = $false
      physicalSemanticProof = $false
    }
    boundaries = @(
      'The theorem is narrowed to real 2D connection components and proves the identity transformation only.',
      'The original BerryConnection_GaugeTransformationLaw axiom is not used or cleared.',
      'Other placeholders and warnings in BerryConnection.lean remain visible.',
      'Standalone and patched audits run in separate dependency environments to avoid duplicate helper declarations.',
      'The external TOE-SYLVA source tree is only read; all patched sources and build products stay in OutputDirectory.'
    )
  }
  Set-Content -Path $ReportPath -Encoding UTF8 -Value ($report | ConvertTo-Json -Depth 10)
  Write-Output ($report | ConvertTo-Json -Depth 10)
}

run_all_tests
