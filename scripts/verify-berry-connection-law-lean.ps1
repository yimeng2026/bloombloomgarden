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
  $proof = Join-Path $repoRoot 'research/formalization/BerryConnectionGaugeLaw.lean'
  $registeredPatch = Join-Path $repoRoot 'research/formalization/berry-connection-gauge-law.patch'
  $prepare = Join-Path $repoRoot 'scripts/prepare_berry_connection_law_patch.py'
  $original = Join-Path $SylvaRoot 'BerryConnection.lean'
  foreach ($required in @($lean, $proof, $registeredPatch, $prepare, $original, (Join-Path $SylvaRoot 'BlochTheorem.lean'))) {
    if (-not (Test-Path $required)) { throw "Required input is missing: $required" }
  }
  $null = New-Item -ItemType Directory -Force -Path $OutputDirectory
  $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath)

  $patched = Join-Path $OutputDirectory 'BerryConnectionLawPatched.lean'
  $generatedPatch = Join-Path $OutputDirectory 'berry-connection-gauge-law.patch'
  & python $prepare --original $original --proof $proof --patched-output $patched --patch-output $generatedPatch
  if ($LASTEXITCODE -ne 0) { throw "Gauge-law patch preparation failed: $LASTEXITCODE" }
  $patchMatches = (Get-FileHash -Algorithm SHA256 $generatedPatch).Hash -eq (Get-FileHash -Algorithm SHA256 $registeredPatch).Hash
  if (-not $patchMatches) { throw 'The registered gauge-law patch is not synchronized' }

  $applyRoot = Join-Path $OutputDirectory 'patch-application'
  $null = New-Item -ItemType Directory -Force -Path $applyRoot
  $applied = Join-Path $applyRoot 'BerryConnection.lean'
  Copy-Item -Force -Path $original -Destination $applied
  Push-Location $applyRoot
  try {
    & git apply --check $registeredPatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply --check failed for the gauge-law patch' }
    & git apply $registeredPatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply failed for the gauge-law patch' }
  } finally {
    Pop-Location
  }
  $applicationMatches = (Get-FileHash -Algorithm SHA256 $applied).Hash -eq (Get-FileHash -Algorithm SHA256 $patched).Hash
  if (-not $applicationMatches) { throw 'The applied gauge-law patch differs from the generated source' }

  Copy-Item -Force -Path (Join-Path $SylvaRoot 'BlochTheorem.lean') -Destination (Join-Path $OutputDirectory 'BlochTheorem.lean')
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
  $proofLog = Join-Path $OutputDirectory 'hilbert-law-build.log'
  $stages.proof = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnectionGaugeLaw.olean'), $proof) -LogPath $proofLog
  Assert-LeanSuccess $stages.proof $proofLog 'BerryConnectionGaugeLaw'
  $standaloneSource = Join-Path $OutputDirectory 'hilbert-law-axioms.lean'
  $standaloneLog = Join-Path $OutputDirectory 'hilbert-law-axioms.log'
  Set-Content -Path $standaloneSource -Encoding ASCII -Value @(
    'import BerryConnectionGaugeLaw',
    '',
    '#print axioms BerryConnection.BerryConnection_GaugeTransformationLaw_physical'
  )
  $stages.standaloneAudit = Invoke-NativeLean -Executable $lean -Arguments @($standaloneSource) -LogPath $standaloneLog
  Assert-LeanSuccess $stages.standaloneAudit $standaloneLog 'standalone gauge-law axiom audit'
  $standaloneText = [regex]::Replace((Get-Content -Raw -Path $standaloneLog).Trim(), '\s+', ' ')
  $standaloneExpected = "'BerryConnection.BerryConnection_GaugeTransformationLaw_physical' depends on axioms: [propext, Classical.choice, Quot.sound]"
  if (-not $standaloneText.Contains($standaloneExpected) -or $standaloneText.Contains('sorryAx')) {
    throw "Unexpected standalone gauge-law axioms: $standaloneText"
  }

  $patchedLog = Join-Path $OutputDirectory 'hilbert-law-patched-build.log'
  $stages.patched = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnection.olean'), $patched) -LogPath $patchedLog
  Assert-LeanSuccess $stages.patched $patchedLog 'gauge-law patched BerryConnection'
  $patchedSource = Join-Path $OutputDirectory 'hilbert-law-patched-axioms.lean'
  $patchedAxiomLog = Join-Path $OutputDirectory 'hilbert-law-patched-axioms.log'
  Set-Content -Path $patchedSource -Encoding ASCII -Value @(
    'import BerryConnection',
    '',
    '#print axioms BerryConnection.BerryConnection_GaugeTransformationLaw'
  )
  $stages.patchedAudit = Invoke-NativeLean -Executable $lean -Arguments @($patchedSource) -LogPath $patchedAxiomLog
  Assert-LeanSuccess $stages.patchedAudit $patchedAxiomLog 'patched gauge-law axiom audit'
  $patchedText = [regex]::Replace((Get-Content -Raw -Path $patchedAxiomLog).Trim(), '\s+', ' ')
  $patchedExpected = "'BerryConnection.BerryConnection_GaugeTransformationLaw' depends on axioms: [propext, Classical.choice, Quot.sound]"
  if (-not $patchedText.Contains($patchedExpected) -or $patchedText.Contains('sorryAx')) {
    throw "Unexpected patched gauge-law axioms: $patchedText"
  }

  $proofText = Get-Content -Raw -Path $proof
  $forbidden = [regex]::IsMatch($proofText, '(?m)^\s*(axiom|postulate|sorry)\b') -or $proofText.Contains('True := by trivial')
  if ($forbidden) { throw 'The physical gauge-law proof contains a forbidden placeholder or new axiom' }
  $report = [ordered]@{
    schemaVersion = 1
    status = 'success'
    scope = 'Physical Hilbert-space Berry gauge law and a narrow patch for the original vacuous axiom; not a full Bloch L2 mapping proof'
    source = [ordered]@{
      repository = 'TOE-SYLVA-pull'
      root = $SylvaRoot
      commit = (git -C (Split-Path -Parent $SylvaRoot) rev-parse HEAD).Trim()
      originalFile = 'BerryConnection.lean'
      originalSha256 = (Get-FileHash -Algorithm SHA256 $original).Hash.ToLowerInvariant()
      proofFile = 'research/formalization/BerryConnectionGaugeLaw.lean'
      proofSha256 = (Get-FileHash -Algorithm SHA256 $proof).Hash.ToLowerInvariant()
      patchFile = 'research/formalization/berry-connection-gauge-law.patch'
      patchSha256 = (Get-FileHash -Algorithm SHA256 $registeredPatch).Hash.ToLowerInvariant()
      leanVersion = '4.29.0 / 98dc76e3c0a9b856c9b98726b713fb04fab16740'
    }
    build = [ordered]@{
      stages = $stages
      standaloneOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryConnectionGaugeLaw.olean')).Hash.ToLowerInvariant()
      patchedOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryConnection.olean')).Hash.ToLowerInvariant()
      warningsPreserved = $true
    }
    axiomAudit = [ordered]@{ standalone = $standaloneText; patched = $patchedText }
    validation = [ordered]@{
      patchSynchronized = $patchMatches
      patchApplicationMatchesGenerated = $applicationMatches
      forbiddenPlaceholderOrNewAxiom = $forbidden
      externalSourceModified = $false
      oldNormalizedBlochStateUsed = $false
      fullBlochL2MappingProved = $false
      signConvention = 'A=I*inner(u,du), hence A_prime=A-dtheta'
    }
    boundaries = @(
      'The proof uses a generic InnerProductSpace and explicit normalization, not the unconstrained old NormalizedBlochState Props.',
      'The sign convention A=I*inner(u,du) implies A_prime=A-dtheta; relevant old A+dtheta comments are corrected by the patch.',
      'Other placeholders and warnings remain visible; no full-project or complete L2 Bloch mapping proof is claimed.',
      'The external TOE-SYLVA source tree is only read; all patched sources and build products stay in OutputDirectory.'
    )
  }
  Set-Content -Path $ReportPath -Encoding UTF8 -Value ($report | ConvertTo-Json -Depth 10)
  Write-Output ($report | ConvertTo-Json -Depth 10)
}

run_all_tests
