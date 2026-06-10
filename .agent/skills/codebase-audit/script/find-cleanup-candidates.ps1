[CmdletBinding()]
param(
  [string]$RootPath = ".",
  [string[]]$Scope = @(),
  [switch]$IncludeTracked,
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

function Get-ScopeRoots {
  if (-not $Scope -or $Scope.Count -eq 0) {
    return @($script:RepoRoot)
  }

  $roots = foreach ($entry in $Scope) {
    if ([System.IO.Path]::IsPathRooted($entry)) {
      [System.IO.Path]::GetFullPath($entry)
      continue
    }
    [System.IO.Path]::GetFullPath((Join-Path $script:RepoRoot $entry))
  }

  foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) {
      throw "Scope path '$root' does not exist."
    }
  }

  return $roots
}

function Get-UntrackedStateMap {
  $map = @{}
  try {
    $lines = & git -C $script:RepoRoot status --porcelain --ignored=matching --untracked-files=all 2>$null
    if ($LASTEXITCODE -ne 0) {
      return $map
    }
  } catch {
    return $map
  }

  foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line) -or $line.Length -lt 4) {
      continue
    }

    $status = $line.Substring(0, 2)
    if ($status -notin @("??", "!!")) {
      continue
    }

    $rawPath = $line.Substring(3).Trim()
    if ($rawPath.StartsWith('"') -and $rawPath.EndsWith('"')) {
      $rawPath = $rawPath.Trim('"')
    }

    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $script:RepoRoot $rawPath))
    $map[$fullPath] = if ($status -eq "??") { "untracked" } else { "ignored" }
  }

  return $map
}

function Get-RepoItems {
  param([string[]]$Roots)

  $excludeNames = @("node_modules", ".git", "dist", "build")
  $items = New-Object System.Collections.Generic.List[object]
  $stack = New-Object 'System.Collections.Generic.Stack[string]'

  foreach ($root in $Roots) {
    $stack.Push($root)
  }

  while ($stack.Count -gt 0) {
    $current = $stack.Pop()
    foreach ($entry in Get-ChildItem -LiteralPath $current -Force) {
      if ($entry.PSIsContainer) {
        if ($excludeNames -contains $entry.Name) {
          continue
        }
        $items.Add($entry) | Out-Null
        $stack.Push($entry.FullName)
      } else {
        $items.Add($entry) | Out-Null
      }
    }
  }

  return $items
}

function Add-Candidate {
  param(
    [System.Collections.Generic.Dictionary[string, object]]$Store,
    [string]$Path,
    [string]$Reason,
    [string]$Confidence,
    [string]$GitState
  )

  if ($Store.ContainsKey($Path)) {
    return
  }

  $item = Get-Item -LiteralPath $Path -Force
  $Store[$Path] = [pscustomobject]@{
    path = $Path
    relativePath = Get-RelativePath -BasePath $script:RepoRoot -TargetPath $Path
    itemType = if ($item.PSIsContainer) { "directory" } else { "file" }
    reason = $Reason
    confidence = $Confidence
    gitState = if ([string]::IsNullOrWhiteSpace($GitState)) { "tracked-or-unknown" } else { $GitState }
    lastWriteTimeUtc = $item.LastWriteTimeUtc.ToString("o")
  }
}

$script:RepoRoot = Get-FullPath -Path $RootPath
$scopeRoots = Get-ScopeRoots
$gitStateMap = Get-UntrackedStateMap
$candidates = New-Object 'System.Collections.Generic.Dictionary[string, object]'

$auditTmpRoot = Join-Path $script:RepoRoot ".agent\tmp\codebase-audit"
if (Test-Path -LiteralPath $auditTmpRoot) {
  foreach ($sessionDir in Get-ChildItem -LiteralPath $auditTmpRoot -Directory -Force) {
    Add-Candidate -Store $candidates -Path $sessionDir.FullName -Reason "Audit temp session directory; verify findings are captured before deletion." -Confidence "high" -GitState ($gitStateMap[$sessionDir.FullName])
  }
}

$transientDirectoryNames = @("playwright-report", "test-results", "coverage", ".nyc_output", "tmp", "temp")
$filePattern = '\.(tmp|temp|bak|old|orig|rej|log)$'
$debugPattern = '^(debug|trace)[-_]?.+\.(json|txt|log)$'

foreach ($item in Get-RepoItems -Roots $scopeRoots) {
  $fullPath = $item.FullName
  if ($fullPath -like "$auditTmpRoot*") {
    continue
  }

  $gitState = if ($gitStateMap.ContainsKey($fullPath)) { $gitStateMap[$fullPath] } else { "tracked-or-unknown" }
  $isTransient = $false
  $reason = $null
  $confidence = "medium"

  if ($item.PSIsContainer -and ($transientDirectoryNames -contains $item.Name)) {
    $isTransient = $true
    $reason = "Directory name matches a common generated-output or temp directory pattern."
  }

  if (-not $item.PSIsContainer -and ($item.Name -match $filePattern -or $item.Name -match $debugPattern)) {
    $isTransient = $true
    $reason = "File name matches a common transient/debug/log pattern."
  }

  if (-not $isTransient) {
    continue
  }

  if (-not $IncludeTracked -and $gitState -eq "tracked-or-unknown") {
    continue
  }

  if ($gitState -in @("untracked", "ignored")) {
    $confidence = "high"
  }

  Add-Candidate -Store $candidates -Path $fullPath -Reason $reason -Confidence $confidence -GitState $gitState
}

$result = $candidates.Values | Sort-Object relativePath

if ($AsJson) {
  $result | ConvertTo-Json -Depth 6
} else {
  $result | Select-Object relativePath, itemType, gitState, confidence, reason | Format-Table -Wrap -AutoSize
}


