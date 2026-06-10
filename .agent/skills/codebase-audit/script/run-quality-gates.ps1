[CmdletBinding()]
param(
  [string]$RootPath = ".",
  [ValidateSet("Discover", "Run")]
  [string]$Mode = "Run",
  [string[]]$Steps = @("lint", "typecheck", "build", "test", "test:integration"),
  [string]$OutputPath,
  [switch]$AsJson
)

$ErrorActionPreference = "Stop"

function Get-FullPath {
  param([string]$Path)
  return (Resolve-Path -LiteralPath $Path).Path
}

function Get-RelativePath {
  param(
    [string]$BasePath,
    [string]$TargetPath
  )

  $baseUri = [System.Uri](([System.IO.Path]::GetFullPath($BasePath).TrimEnd([char[]]@( '\\'[0], '/' ))) + [System.IO.Path]::DirectorySeparatorChar)
  $targetUri = [System.Uri]([System.IO.Path]::GetFullPath($TargetPath))
  return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString()).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
}

function Write-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Content
  )

  $encoding = New-Object System.Text.UTF8Encoding($false)
  $fullPath = if ([System.IO.Path]::IsPathRooted($Path)) { [System.IO.Path]::GetFullPath($Path) } else { [System.IO.Path]::GetFullPath((Join-Path $script:RepoRoot $Path)) }
  $dir = Split-Path -Parent $fullPath
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  [System.IO.File]::WriteAllText($fullPath, ($Content -replace "`r`n", "`n"), $encoding)
}

function Get-ChildPackageFiles {
  param([string]$StartPath)

  $excludeNames = @("node_modules", ".git", "dist", "build", "coverage", "playwright-report", "test-results", ".turbo", ".next")
  $stack = New-Object 'System.Collections.Generic.Stack[string]'
  $results = New-Object 'System.Collections.Generic.List[string]'
  $stack.Push($StartPath)

  while ($stack.Count -gt 0) {
    $current = $stack.Pop()
    foreach ($entry in Get-ChildItem -LiteralPath $current -Force) {
      if ($entry.PSIsContainer) {
        if ($excludeNames -contains $entry.Name) {
          continue
        }
        $stack.Push($entry.FullName)
        continue
      }

      if ($entry.Name -eq "package.json") {
        $results.Add($entry.FullName)
      }
    }
  }

  return $results
}

function Get-ScriptMap {
  param($ScriptsObject)

  $map = @{}
  if ($null -eq $ScriptsObject) {
    return $map
  }

  foreach ($prop in $ScriptsObject.PSObject.Properties) {
    $map[$prop.Name] = [string]$prop.Value
  }

  return $map
}

function Get-PackageRecords {
  param([string]$RepoRoot)

  $rootPackageFile = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot "package.json"))
  $records = foreach ($packageFile in Get-ChildPackageFiles -StartPath $RepoRoot) {
    $normalizedPackageFile = [System.IO.Path]::GetFullPath($packageFile)
    $directory = [System.IO.Path]::GetFullPath((Split-Path -Parent $packageFile))
    $isRoot = ($normalizedPackageFile -ieq $rootPackageFile)
    $relativePath = if ($isRoot) { "." } else { Get-RelativePath -BasePath $RepoRoot -TargetPath $directory }

    $json = Get-Content -Raw -Encoding utf8 $packageFile | ConvertFrom-Json
    [pscustomobject]@{
      Name = if ($json.name) { [string]$json.name } else { Split-Path -Leaf $directory }
      Directory = $directory
      RelativePath = $relativePath
      IsRoot = $isRoot
      Scripts = Get-ScriptMap -ScriptsObject $json.scripts
    }
  }

  $sorted = $records | Sort-Object @{ Expression = { if ($_.IsRoot) { 0 } else { 1 } } }, RelativePath
  if (-not $sorted) {
    throw "No package.json files found below '$RepoRoot'."
  }
  return $sorted
}

function New-PlanEntry {
  param(
    [string]$Step,
    [object]$PackageRecord
  )

  [pscustomobject]@{
    Step = $Step
    Package = $PackageRecord.Name
    RelativePath = $PackageRecord.RelativePath
    WorkingDirectory = $PackageRecord.Directory
    ScriptName = $Step
    Command = "pnpm run $Step"
    Status = "planned"
    ExitCode = $null
    DurationSec = $null
    Reason = $null
  }
}

function Get-ExecutionPlan {
  param(
    [object[]]$Packages,
    [string[]]$Steps
  )

  $rootPackage = $Packages | Where-Object { $_.IsRoot } | Select-Object -First 1
  $plan = New-Object System.Collections.Generic.List[object]

  foreach ($step in $Steps) {
    $entries = @()
    $isBuildLike = $step -in @("lint", "typecheck", "build")
    $isTestLike = $step.StartsWith("test")

    if ($isBuildLike -and $rootPackage -and $rootPackage.Scripts.ContainsKey($step)) {
      $entries += New-PlanEntry -Step $step -PackageRecord $rootPackage
    } else {
      foreach ($pkg in $Packages) {
        if ($pkg.Scripts.ContainsKey($step)) {
          if ($isBuildLike -and $pkg.IsRoot) {
            continue
          }
          $entries += New-PlanEntry -Step $step -PackageRecord $pkg
        }
      }

      if (-not $entries -and -not $isTestLike -and $rootPackage -and $rootPackage.Scripts.ContainsKey($step)) {
        $entries += New-PlanEntry -Step $step -PackageRecord $rootPackage
      }
    }

    if (-not $entries) {
      $plan.Add([pscustomobject]@{
        Step = $step
        Package = $null
        RelativePath = $null
        WorkingDirectory = $null
        ScriptName = $step
        Command = $null
        Status = "skipped"
        ExitCode = $null
        DurationSec = 0
        Reason = "Script '$step' not found in the root package or any workspace package."
      }) | Out-Null
      continue
    }

    foreach ($entry in $entries) {
      $plan.Add($entry) | Out-Null
    }
  }

  return $plan
}

function Invoke-PlanEntry {
  param([object]$Entry)

  if ($Entry.Status -eq "skipped") {
    return $Entry
  }

  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  $status = "passed"
  $exitCode = 0
  $reason = $null

  Write-Host ("[{0}] {1} ({2})" -f $Entry.Step, $Entry.Command, $Entry.RelativePath)

  Push-Location -LiteralPath $Entry.WorkingDirectory
  try {
    & pnpm run $Entry.ScriptName | Out-Host
    $exitCode = if ($null -ne $LASTEXITCODE) { [int]$LASTEXITCODE } else { 0 }
    if ($exitCode -ne 0) {
      $status = "failed"
      $reason = "pnpm returned exit code $exitCode."
    }
  } catch {
    $status = "failed"
    $exitCode = 1
    $reason = $_.Exception.Message
  } finally {
    Pop-Location
    $stopwatch.Stop()
  }

  [pscustomobject]@{
    Step = $Entry.Step
    Package = $Entry.Package
    RelativePath = $Entry.RelativePath
    WorkingDirectory = $Entry.WorkingDirectory
    ScriptName = $Entry.ScriptName
    Command = $Entry.Command
    Status = $status
    ExitCode = $exitCode
    DurationSec = [math]::Round($stopwatch.Elapsed.TotalSeconds, 2)
    Reason = $reason
  }
}

$script:RepoRoot = Get-FullPath -Path $RootPath
$packages = Get-PackageRecords -RepoRoot $script:RepoRoot
$plan = Get-ExecutionPlan -Packages $packages -Steps $Steps

$results = foreach ($entry in $plan) {
  if ($Mode -eq "Run") {
    Invoke-PlanEntry -Entry $entry
    continue
  }
  $entry
}

$summary = [pscustomobject]@{
  Total = @($results).Count
  Passed = @($results | Where-Object { $_.Status -eq "passed" }).Count
  Failed = @($results | Where-Object { $_.Status -eq "failed" }).Count
  Planned = @($results | Where-Object { $_.Status -eq "planned" }).Count
  Skipped = @($results | Where-Object { $_.Status -eq "skipped" }).Count
}

$payload = [pscustomobject]@{
  GeneratedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  RepoRoot = $script:RepoRoot
  Mode = $Mode
  Steps = $Steps
  Packages = $packages | Select-Object Name, RelativePath, IsRoot
  Results = $results
  Summary = $summary
}

if ($OutputPath) {
  Write-Utf8NoBom -Path $OutputPath -Content ($payload | ConvertTo-Json -Depth 8)
}

if ($AsJson) {
  $payload | ConvertTo-Json -Depth 8
} else {
  $results |
    Select-Object Step, Package, RelativePath, ScriptName, Status, ExitCode, Reason |
    Format-Table -AutoSize

  Write-Host ""
  Write-Host ("Summary: total={0}, passed={1}, failed={2}, planned={3}, skipped={4}" -f $summary.Total, $summary.Passed, $summary.Failed, $summary.Planned, $summary.Skipped)
}

if ($Mode -eq "Run" -and $summary.Failed -gt 0) {
  exit 1
}




