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
  $proof = Join-Path $repoRoot 'research/formalization/BlochL2State.lean'
  $blochSource = Join-Path $SylvaRoot 'BlochTheorem.lean'
  $connectionSource = Join-Path $SylvaRoot 'BerryConnection.lean'
  foreach ($required in @($lean, $identityProof, $lawProof, $proof, $blochSource, $connectionSource)) {
    if (-not (Test-Path $required)) { throw "Required input is missing: $required" }
  }
  $null = New-Item -ItemType Directory -Force -Path $OutputDirectory
  $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath)
  Copy-Item -Force -Path $blochSource -Destination (Join-Path $OutputDirectory 'BlochTheorem.lean')
  Copy-Item -Force -Path $connectionSource -Destination (Join-Path $OutputDirectory 'BerryConnection.lean')

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
  $proofLog = Join-Path $OutputDirectory 'bloch-l2-build.log'
  $stages.proof = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BlochL2State.olean'), $proof) -LogPath $proofLog
  Assert-LeanSuccess $stages.proof $proofLog 'BlochL2State'

  $auditSource = Join-Path $OutputDirectory 'bloch-l2-axioms.lean'
  $auditLog = Join-Path $OutputDirectory 'bloch-l2-axioms.log'
  Set-Content -Path $auditSource -Encoding ASCII -Value @(
    'import BlochL2State',
    '',
    '#print axioms BerryConnection.BlochL2State_normalization_integral',
    '#print axioms BerryConnection.BlochL2State_gauge_transformation_law'
  )
  $stages.audit = Invoke-NativeLean -Executable $lean -Arguments @($auditSource) -LogPath $auditLog
  Assert-LeanSuccess $stages.audit $auditLog 'BlochL2State axiom audit'
  $auditText = [regex]::Replace((Get-Content -Raw -Path $auditLog).Trim(), '\s+', ' ')
  foreach ($name in @('BlochL2State_normalization_integral', 'BlochL2State_gauge_transformation_law')) {
    if (-not $auditText.Contains("'BerryConnection.${name}' depends on axioms: [propext, Classical.choice, Quot.sound]")) {
      throw "Unexpected axiom dependencies for ${name}: $auditText"
    }
  }
  if ($auditText.Contains('sorryAx')) { throw "sorryAx in BlochL2State audit: $auditText" }

  $proofText = Get-Content -Raw -Path $proof
  $forbidden = [regex]::IsMatch($proofText, '(?m)^\s*(axiom|postulate|sorry)\b') -or $proofText.Contains('True := by trivial')
  if ($forbidden) { throw 'BlochL2State contains a forbidden placeholder or new axiom' }
  foreach ($required in @('coherent :', 'normalization :', 'normalization_integral', 'Subtype.ext', 'smul_assoc')) {
    if (-not $proofText.Contains($required)) { throw "Missing L2 refinement ingredient: $required" }
  }
  $report = [ordered]@{
    schemaVersion = 1
    status = 'success'
    scope = 'L2 refinement with old-state coherence and normalization, plus the Hilbert gauge law; no normalization from old Props'
    source = [ordered]@{
      repository = 'TOE-SYLVA-pull'
      root = $SylvaRoot
      commit = (git -C (Split-Path -Parent $SylvaRoot) rev-parse HEAD).Trim()
      oldStateType = 'BerryConnection.NormalizedBlochState'
      proofFile = 'research/formalization/BlochL2State.lean'
      proofSha256 = (Get-FileHash -Algorithm SHA256 $proof).Hash.ToLowerInvariant()
      leanVersion = '4.29.0 / 98dc76e3c0a9b856c9b98726b713fb04fab16740'
    }
    build = [ordered]@{
      stages = $stages
      outputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BlochL2State.olean')).Hash.ToLowerInvariant()
      warningsPreserved = $true
    }
    axiomAudit = [ordered]@{ exitCode = $stages.audit; output = $auditText; log = $auditLog }
    validation = [ordered]@{
      coherentFieldPresent = $true
      normalizationIntegralProved = $true
      oldPropUsedAsProof = $false
      fullOldStateNormalizationFromProp = $false
      forbiddenPlaceholderOrNewAxiom = $forbidden
      externalSourceModified = $false
      fullProjectBuilt = $false
    }
    boundaries = @(
      'BlochL2State requires an actual L2 vector, ae coherence and pointwise normalization as explicit evidence.',
      'The result does not construct these objects from the old unconstrained NormalizedBlochState Props.',
      'The scalar tower is proved through Subtype.ext and the underlying AEEqFun smul_assoc.',
      'Other placeholders and the full Bloch L2 construction from old sources remain open.',
      'The external TOE-SYLVA source tree is only read; all build products stay in OutputDirectory.'
    )
  }
  Set-Content -Path $ReportPath -Encoding UTF8 -Value ($report | ConvertTo-Json -Depth 10)
  Write-Output ($report | ConvertTo-Json -Depth 10)
}

run_all_tests
