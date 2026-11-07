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
  $proof = Join-Path $repoRoot 'research/formalization/BerryCurvatureGaugeInvariance.lean'
  $registeredPatch = Join-Path $repoRoot 'research/formalization/berry-curvature-gauge-invariance.patch'
  $prepare = Join-Path $repoRoot 'scripts/prepare_berry_curvature_patch.py'
  $original = Join-Path $SylvaRoot 'BerryCurvature.lean'
  foreach ($required in @($lean, $proof, $registeredPatch, $prepare, $original, (Join-Path $SylvaRoot 'BlochTheorem.lean'), (Join-Path $SylvaRoot 'BerryConnection.lean'))) {
    if (-not (Test-Path $required)) { throw "Required input is missing: $required" }
  }
  $null = New-Item -ItemType Directory -Force -Path $OutputDirectory
  $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath)

  $patched = Join-Path $OutputDirectory 'BerryCurvaturePatched.lean'
  $generatedPatch = Join-Path $OutputDirectory 'berry-curvature-gauge-invariance.patch'
  & python $prepare --original $original --proof $proof --patched-output $patched --patch-output $generatedPatch
  if ($LASTEXITCODE -ne 0) { throw "Patch preparation failed: $LASTEXITCODE" }
  $patchMatches = (Get-FileHash -Algorithm SHA256 $generatedPatch).Hash -eq (Get-FileHash -Algorithm SHA256 $registeredPatch).Hash
  if (-not $patchMatches) { throw 'The registered patch is not synchronized with the proof source' }

  Copy-Item -Force -Path (Join-Path $SylvaRoot 'BlochTheorem.lean') -Destination (Join-Path $OutputDirectory 'BlochTheorem.lean')
  Copy-Item -Force -Path (Join-Path $SylvaRoot 'BerryConnection.lean') -Destination (Join-Path $OutputDirectory 'BerryConnection.lean')
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
  $connectionLog = Join-Path $OutputDirectory 'connection-build.log'
  $stages.connection = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryConnection.olean'), (Join-Path $OutputDirectory 'BerryConnection.lean')) -LogPath $connectionLog
  Assert-LeanSuccess $stages.connection $connectionLog 'BerryConnection'
  $proofLog = Join-Path $OutputDirectory 'gauge-build.log'
  $stages.proof = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryCurvatureGaugeInvariance.olean'), $proof) -LogPath $proofLog
  Assert-LeanSuccess $stages.proof $proofLog 'BerryCurvatureGaugeInvariance'
  $patchedLog = Join-Path $OutputDirectory 'patched-build.log'
  $stages.patched = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryCurvature.olean'), $patched) -LogPath $patchedLog
  Assert-LeanSuccess $stages.patched $patchedLog 'patched BerryCurvature'

  $expected = "'BerryCurvature.BerryCurvature_GaugeInvariance' depends on axioms: [propext, Classical.choice, Quot.sound]"
  $axiomResults = [ordered]@{}
  foreach ($audit in @(
    @{ Name = 'standalone'; Module = 'BerryCurvatureGaugeInvariance' },
    @{ Name = 'patched'; Module = 'BerryCurvature' }
  )) {
    $source = Join-Path $OutputDirectory "$($audit.Name)-axioms.lean"
    $log = Join-Path $OutputDirectory "$($audit.Name)-axioms.log"
    Set-Content -Path $source -Encoding ASCII -Value @(
      "import $($audit.Module)",
      '',
      '#print axioms BerryCurvature.BerryCurvature_GaugeInvariance'
    )
    $exit = Invoke-NativeLean -Executable $lean -Arguments @($source) -LogPath $log
    Assert-LeanSuccess $exit $log "$($audit.Name) axiom audit"
    $text = (Get-Content -Raw -Path $log).Trim()
    $matches = $text.Contains($expected) -and -not $text.Contains('sorryAx') -and -not $text.Contains('curl_linear_subtraction')
    if (-not $matches) { throw "Unexpected axiom dependencies in $($audit.Name): $text" }
    $axiomResults[$audit.Name] = [ordered]@{ exitCode = $exit; output = $text; log = $log }
  }

  $proofText = Get-Content -Raw -Path $proof
  $forbidden = [regex]::IsMatch($proofText, '(?m)^\s*(axiom|postulate|sorry)\b') -or $proofText.Contains('True := by trivial')
  if ($forbidden) { throw 'The new proof contains a forbidden placeholder or new axiom' }
  $report = [ordered]@{
    schemaVersion = 1
    status = 'success'
    scope = 'Concrete 2D real Berry-curvature gauge invariance and a narrow patch for the original placeholder; not a full-project or differential-forms proof'
    source = [ordered]@{
      repository = 'TOE-SYLVA-pull'
      root = $SylvaRoot
      commit = (git -C (Split-Path -Parent $SylvaRoot) rev-parse HEAD).Trim()
      originalFile = 'BerryCurvature.lean'
      originalSha256 = (Get-FileHash -Algorithm SHA256 $original).Hash.ToLowerInvariant()
      proofFile = 'research/formalization/BerryCurvatureGaugeInvariance.lean'
      proofSha256 = (Get-FileHash -Algorithm SHA256 $proof).Hash.ToLowerInvariant()
      patchFile = 'research/formalization/berry-curvature-gauge-invariance.patch'
      patchSha256 = (Get-FileHash -Algorithm SHA256 $registeredPatch).Hash.ToLowerInvariant()
      leanVersion = '4.29.0 / 98dc76e3c0a9b856c9b98726b713fb04fab16740'
    }
    build = [ordered]@{
      stages = $stages
      standaloneOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryCurvatureGaugeInvariance.olean')).Hash.ToLowerInvariant()
      patchedOutputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryCurvature.olean')).Hash.ToLowerInvariant()
      warningsPreserved = $true
    }
    axiomAudit = $axiomResults
    validation = [ordered]@{
      patchSynchronized = $patchMatches
      forbiddenPlaceholderOrNewAxiom = $forbidden
      externalSourceModified = $false
      fullProjectBuilt = $false
      physicalSemanticProof = $false
    }
    boundaries = @(
      'The theorem is narrowed to real 2D connection components with explicit C2 and differentiability assumptions.',
      'The original arbitrary complex structure and the 3D curl_linear_subtraction axiom are not cleared.',
      'Other True placeholders and existing warnings in BerryCurvature.lean remain visible.',
      'The external TOE-SYLVA source tree is only read; all patched sources and build products stay in OutputDirectory.'
    )
  }
  Set-Content -Path $ReportPath -Encoding UTF8 -Value ($report | ConvertTo-Json -Depth 10)
  Write-Output ($report | ConvertTo-Json -Depth 10)
}

run_all_tests
