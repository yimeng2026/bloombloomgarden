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

function run_all_tests {
  $lean = Join-Path $LeanHome 'bin/lean.exe'
  $source = Join-Path $SylvaRoot 'PhysicalChemistry/ReactionNetwork.lean'
  foreach ($required in @($lean, $source, (Join-Path $SylvaRoot 'lakefile.lean'))) {
    if (-not (Test-Path $required)) { throw "Required Lean input is missing: $required" }
  }

  $null = New-Item -ItemType Directory -Force -Path $OutputDirectory
  $null = New-Item -ItemType Directory -Force -Path (Join-Path $OutputDirectory 'PhysicalChemistry')
  $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath)

  $paths = @($OutputDirectory, (Join-Path $SylvaRoot '.lake/build/lib/lean'))
  foreach ($package in @('mathlib', 'plausible', 'LeanSearchClient', 'importGraph', 'proofwidgets', 'aesop', 'Qq', 'batteries', 'Cli')) {
    $directory = Join-Path $SylvaRoot ".lake/packages/$package/.lake/build/lib/lean"
    if (Test-Path $directory) { $paths += $directory }
  }
  $env:LEAN_PATH = $paths -join [IO.Path]::PathSeparator

  $moduleOutput = Join-Path $OutputDirectory 'PhysicalChemistry/ReactionNetwork.olean'
  $buildLog = Join-Path $OutputDirectory 'lean-build.log'
  Push-Location $SylvaRoot
  try {
    $buildExit = Invoke-NativeLean -Executable $lean -Arguments @('-o', $moduleOutput, 'PhysicalChemistry/ReactionNetwork.lean') -LogPath $buildLog
  } finally {
    Pop-Location
  }

  $auditSource = Join-Path $OutputDirectory 'reaction-axiom-audit.lean'
  $axiomLog = Join-Path $OutputDirectory 'lean-axiom.log'
  $auditExit = $null
  $axiomText = ''
  if ($buildExit -eq 0) {
    Set-Content -Path $auditSource -Encoding ASCII -Value @(
      'import PhysicalChemistry.ReactionNetwork',
      '',
      '#print axioms Sylva.ReactionNetwork.MM_deficiency_zero_computed'
    )
    Push-Location $SylvaRoot
    try {
      $auditExit = Invoke-NativeLean -Executable $lean -Arguments @($auditSource) -LogPath $axiomLog
    } finally {
      Pop-Location
    }
    if (Test-Path $axiomLog) { $axiomText = Get-Content -Raw -Path $axiomLog }
  }

  $expected = "'Sylva.ReactionNetwork.MM_deficiency_zero_computed' depends on axioms: [propext, Classical.choice, Quot.sound]"
  $axiomMatches = $buildExit -eq 0 -and $auditExit -eq 0 -and $axiomText.Contains($expected) -and -not $axiomText.Contains('sorryAx')
  $sourceCommit = (git -C $SylvaRoot rev-parse HEAD).Trim()
  $report = [ordered]@{
    schemaVersion = 1
    status = if ($axiomMatches) { 'success' } else { 'failed' }
    scope = 'direct Lean compilation of one selected module and one declaration; not a full Lake build or physical-semantic proof'
    source = [ordered]@{
      repository = 'TOE-SYLVA-pull'
      root = $SylvaRoot
      commit = $sourceCommit
      file = 'PhysicalChemistry/ReactionNetwork.lean'
      sha256 = (Get-FileHash -Algorithm SHA256 $source).Hash.ToLowerInvariant()
      leanVersion = '4.29.0 / 98dc76e3c0a9b856c9b98726b713fb04fab16740'
    }
    build = [ordered]@{
      exitCode = $buildExit
      moduleOutput = $moduleOutput
      moduleOutputSha256 = if (Test-Path $moduleOutput) { (Get-FileHash -Algorithm SHA256 $moduleOutput).Hash.ToLowerInvariant() } else { $null }
      log = $buildLog
    }
    axiomAudit = [ordered]@{
      declaration = 'Sylva.ReactionNetwork.MM_deficiency_zero_computed'
      exitCode = $auditExit
      axioms = if ($axiomMatches) { @('propext', 'Classical.choice', 'Quot.sound') } else { @() }
      sorryAx = $axiomText.Contains('sorryAx')
      output = $axiomText.Trim()
      log = $axiomLog
    }
    environment = [ordered]@{
      leanHome = $LeanHome
      outputDirectory = $OutputDirectory
      note = 'Native Windows Lean is used because WSL 9P access stalled in p9_client_rpc during Lake configuration and direct Lean reads. This is an environment workaround, not a Lake success claim.'
    }
    boundaries = @(
      'Warnings in lean-build.log remain visible and are not suppressed.',
      'No full-repository build, physical-semantic validation, observational test, or model-family exclusion is claimed.',
      'The audit is for one declaration, not for every declaration in the source module or repository.'
    )
  }
  Set-Content -Path $ReportPath -Encoding UTF8 -Value ($report | ConvertTo-Json -Depth 8)
  Write-Output ($report | ConvertTo-Json -Depth 8)
  if (-not $axiomMatches) { exit 1 }
}

run_all_tests
