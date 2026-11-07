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
  $proof = Join-Path $repoRoot 'research/formalization/BerryCurvatureGaugeInvariance3D.lean'
  $registeredPatch = Join-Path $repoRoot 'research/formalization/berry-curvature-gauge-invariance-3d.patch'
  $prepare = Join-Path $repoRoot 'scripts/prepare_berry_curvature_3d_patch.py'
  $original = Join-Path $SylvaRoot 'TOE_SYLVA_Solutions/BerryCurvature_GaugeInvariance.lean'
  foreach ($required in @($lean, $proof, $registeredPatch, $prepare, $original)) {
    if (-not (Test-Path $required)) { throw "Required input is missing: $required" }
  }
  $null = New-Item -ItemType Directory -Force -Path $OutputDirectory
  $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath)

  $generatedPatch = Join-Path $OutputDirectory 'berry-curvature-gauge-invariance-3d.patch'
  & python $prepare --original $original --proof $proof --patch-output $generatedPatch
  if ($LASTEXITCODE -ne 0) { throw "Patch generation failed: $LASTEXITCODE" }
  $patchMatches = (Get-FileHash -Algorithm SHA256 $generatedPatch).Hash -eq (Get-FileHash -Algorithm SHA256 $registeredPatch).Hash
  if (-not $patchMatches) { throw 'The registered 3D patch is not synchronized with the proof' }

  $applyRoot = Join-Path $OutputDirectory 'patch-application'
  $applyDirectory = Join-Path $applyRoot 'TOE_SYLVA_Solutions'
  $null = New-Item -ItemType Directory -Force -Path $applyDirectory
  $applied = Join-Path $applyDirectory 'BerryCurvature_GaugeInvariance.lean'
  Copy-Item -Force -Path $original -Destination $applied
  Push-Location $applyRoot
  try {
    & git apply --check $registeredPatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply --check failed for the 3D patch' }
    & git apply $registeredPatch
    if ($LASTEXITCODE -ne 0) { throw 'git apply failed for the 3D patch' }
  } finally {
    Pop-Location
  }
  $applicationMatches = (Get-FileHash -Algorithm SHA256 $applied).Hash -eq (Get-FileHash -Algorithm SHA256 $proof).Hash
  if (-not $applicationMatches) { throw 'The applied 3D patch differs from the compiled proof' }

  $paths = @($OutputDirectory, (Join-Path $SylvaRoot '.lake/build/lib/lean'))
  foreach ($package in @('mathlib', 'plausible', 'LeanSearchClient', 'importGraph', 'proofwidgets', 'aesop', 'Qq', 'batteries', 'Cli')) {
    $directory = Join-Path $SylvaRoot ".lake/packages/$package/.lake/build/lib/lean"
    if (Test-Path $directory) { $paths += $directory }
  }
  $env:LEAN_PATH = $paths -join [IO.Path]::PathSeparator

  $buildLog = Join-Path $OutputDirectory 'gauge3d-build.log'
  $buildExit = Invoke-NativeLean -Executable $lean -Arguments @('-o', (Join-Path $OutputDirectory 'BerryCurvatureGaugeInvariance3D.olean'), $proof) -LogPath $buildLog
  Assert-LeanSuccess $buildExit $buildLog 'BerryCurvatureGaugeInvariance3D'

  $auditSource = Join-Path $OutputDirectory 'gauge3d-axioms.lean'
  $auditLog = Join-Path $OutputDirectory 'gauge3d-axioms.log'
  Set-Content -Path $auditSource -Encoding ASCII -Value @(
    'import BerryCurvatureGaugeInvariance3D',
    '',
    '#print axioms curl_linear_subtraction',
    '#print axioms curl_of_gradient_zero',
    '#print axioms BerryCurvature_gauge_invariance'
  )
  $auditExit = Invoke-NativeLean -Executable $lean -Arguments @($auditSource) -LogPath $auditLog
  Assert-LeanSuccess $auditExit $auditLog '3D axiom audit'
  $auditText = (Get-Content -Raw -Path $auditLog).Trim()
  $expected = @(
    "'curl_linear_subtraction' depends on axioms: [propext, Classical.choice, Quot.sound]",
    "'curl_of_gradient_zero' depends on axioms: [propext, Classical.choice, Quot.sound]",
    "'BerryCurvature_gauge_invariance' depends on axioms: [propext, Classical.choice, Quot.sound]"
  )
  $axiomMatches = $true
  foreach ($line in $expected) {
    if (-not $auditText.Contains($line)) { $axiomMatches = $false }
  }
  if ($auditText.Contains('sorryAx') -or $auditText.Contains('curl_linear_subtraction,')) { $axiomMatches = $false }
  if (-not $axiomMatches) { throw "Unexpected 3D axiom dependencies: $auditText" }

  $proofText = Get-Content -Raw -Path $proof
  $forbidden = [regex]::IsMatch($proofText, '(?m)^\s*(axiom|postulate|sorry)\b') -or $proofText.Contains('True := by trivial')
  if ($forbidden) { throw 'The 3D proof contains a forbidden placeholder or new axiom' }
  $report = [ordered]@{
    schemaVersion = 1
    status = 'success'
    scope = '3D curl linearity and Berry gauge invariance with explicit differentiability; not a full-project proof'
    source = [ordered]@{
      repository = 'TOE-SYLVA-pull'
      root = $SylvaRoot
      commit = (git -C (Split-Path -Parent $SylvaRoot) rev-parse HEAD).Trim()
      originalFile = 'TOE_SYLVA_Solutions/BerryCurvature_GaugeInvariance.lean'
      originalSha256 = (Get-FileHash -Algorithm SHA256 $original).Hash.ToLowerInvariant()
      proofFile = 'research/formalization/BerryCurvatureGaugeInvariance3D.lean'
      proofSha256 = (Get-FileHash -Algorithm SHA256 $proof).Hash.ToLowerInvariant()
      patchFile = 'research/formalization/berry-curvature-gauge-invariance-3d.patch'
      patchSha256 = (Get-FileHash -Algorithm SHA256 $registeredPatch).Hash.ToLowerInvariant()
      leanVersion = '4.29.0 / 98dc76e3c0a9b856c9b98726b713fb04fab16740'
    }
    build = [ordered]@{
      exitCode = $buildExit
      outputSha256 = (Get-FileHash -Algorithm SHA256 (Join-Path $OutputDirectory 'BerryCurvatureGaugeInvariance3D.olean')).Hash.ToLowerInvariant()
      log = $buildLog
    }
    axiomAudit = [ordered]@{
      exitCode = $auditExit
      output = $auditText
      log = $auditLog
      customCurlAxiomPresent = $auditText.Contains('curl_linear_subtraction,')
    }
    validation = [ordered]@{
      patchSynchronized = $patchMatches
      patchApplicationMatchesProof = $applicationMatches
      forbiddenPlaceholderOrNewAxiom = $forbidden
      externalSourceModified = $false
      fullProjectBuilt = $false
      physicalSemanticProof = $false
    }
    boundaries = @(
      'DifferentiableAt assumptions are required by fderiv_sub and are now explicit for A and B.',
      'The main theorem adds the necessary DifferentiableAt assumption for the connection A.',
      'No custom axiom is used by curl_linear_subtraction, curl_of_gradient_zero, or BerryCurvature_gauge_invariance.',
      'The external TOE-SYLVA source tree is only read; the patch and build products stay in the current repository or OutputDirectory.'
    )
  }
  Set-Content -Path $ReportPath -Encoding UTF8 -Value ($report | ConvertTo-Json -Depth 10)
  Write-Output ($report | ConvertTo-Json -Depth 10)
}

run_all_tests
