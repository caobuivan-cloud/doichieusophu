[CmdletBinding()]
param(
  [ValidateSet("Init", "Register", "Keep", "List", "Cleanup")]
  [string]$Action,
  [string]$RootPath = ".",
  [Parameter(Mandatory = $true)][string]$SessionName,
  [string]$ArtifactPath,
  [ValidateSet("test", "script", "log", "screenshot", "report", "fixture", "other")]
  [string]$Kind = "other",
  [ValidateSet("cleanup", "keep")]
  [string]$Retention = "cleanup",
  [string]$Note = "",
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
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $dir = Split-Path -Parent $fullPath
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  [System.IO.File]::WriteAllText($fullPath, ($Content -replace "`r`n", "`n"), $encoding)
}

function Get-SessionDirectory {
  return Join-Path $script:RepoRoot ".agent\tmp\codebase-audit\$SessionName"
}

function Get-ManifestPath {
  return Join-Path (Get-SessionDirectory) "artifacts.json"
}

function Assert-InsideRepo {
  param([string]$FullPath)

  $repoRootNormalized = ([System.IO.Path]::GetFullPath($script:RepoRoot).TrimEnd([char[]]@( '\\'[0], '/' ))) + [System.IO.Path]::DirectorySeparatorChar
  $candidate = [System.IO.Path]::GetFullPath($FullPath)
  if (-not $candidate.StartsWith($repoRootNormalized, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Path '$candidate' is outside the repo root '$script:RepoRoot'."
  }
  if ($candidate -ieq $script:RepoRoot) {
    throw "Refusing to operate on the repo root itself."
  }
  return $candidate
}

function Load-Manifest {
  $manifestPath = Get-ManifestPath
  if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "Manifest not found. Run with -Action Init first."
  }
  return Get-Content -Raw -Encoding utf8 $manifestPath | ConvertFrom-Json
}

function Save-Manifest {
  param($Manifest)
  $manifestPath = Get-ManifestPath
  Write-Utf8NoBom -Path $manifestPath -Content ($Manifest | ConvertTo-Json -Depth 8)
}

function Resolve-ArtifactPath {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "ArtifactPath is required for action '$Action'."
  }

  $fullPath = if ([System.IO.Path]::IsPathRooted($Path)) {
    [System.IO.Path]::GetFullPath($Path)
  } else {
    [System.IO.Path]::GetFullPath((Join-Path $script:RepoRoot $Path))
  }

  return Assert-InsideRepo -FullPath $fullPath
}

$script:RepoRoot = Get-FullPath -Path $RootPath
$sessionDir = Get-SessionDirectory
$manifestPath = Get-ManifestPath

switch ($Action) {
  "Init" {
    New-Item -ItemType Directory -Path $sessionDir -Force | Out-Null
    $manifest = [ordered]@{
      session = $SessionName
      repoRoot = $script:RepoRoot
      manifestPath = $manifestPath
      createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
      artifacts = @()
      cleanupRuns = @()
    }
    Save-Manifest -Manifest $manifest
    $result = [pscustomobject]@{
      Action = "Init"
      Session = $SessionName
      SessionDirectory = $sessionDir
      ManifestPath = $manifestPath
    }
  }
  "Register" {
    $manifest = Load-Manifest
    $fullPath = Resolve-ArtifactPath -Path $ArtifactPath
    $relativePath = Get-RelativePath -BasePath $script:RepoRoot -TargetPath $fullPath
    $artifacts = @($manifest.artifacts)
    $existing = $artifacts | Where-Object { $_.fullPath -ieq $fullPath } | Select-Object -First 1

    if ($existing) {
      $existing.kind = $Kind
      $existing.retention = $Retention
      $existing.note = $Note
      $existing.exists = Test-Path -LiteralPath $fullPath
      $existing.registeredAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    } else {
      $artifacts += [pscustomobject]@{
        fullPath = $fullPath
        relativePath = $relativePath
        kind = $Kind
        retention = $Retention
        note = $Note
        exists = Test-Path -LiteralPath $fullPath
        registeredAtUtc = (Get-Date).ToUniversalTime().ToString("o")
      }
      $manifest.artifacts = $artifacts
    }

    Save-Manifest -Manifest $manifest
    $result = [pscustomobject]@{
      Action = "Register"
      Session = $SessionName
      Artifact = $fullPath
      Retention = $Retention
      Exists = (Test-Path -LiteralPath $fullPath)
    }
  }
  "Keep" {
    $manifest = Load-Manifest
    $fullPath = Resolve-ArtifactPath -Path $ArtifactPath
    $match = @($manifest.artifacts) | Where-Object { $_.fullPath -ieq $fullPath } | Select-Object -First 1
    if (-not $match) {
      throw "Artifact '$fullPath' is not registered in session '$SessionName'."
    }
    $match.retention = "keep"
    if ($Note) {
      $match.note = $Note
    }
    Save-Manifest -Manifest $manifest
    $result = [pscustomobject]@{
      Action = "Keep"
      Session = $SessionName
      Artifact = $fullPath
      Retention = "keep"
    }
  }
  "List" {
    $manifest = Load-Manifest
    $result = $manifest
  }
  "Cleanup" {
    $manifest = Load-Manifest
    $cleanupResults = foreach ($artifact in @($manifest.artifacts)) {
      if ($artifact.retention -ne "cleanup") {
        continue
      }

      $fullPath = Assert-InsideRepo -FullPath $artifact.fullPath
      $status = "missing"
      $reason = $null

      if (Test-Path -LiteralPath $fullPath) {
        try {
          Remove-Item -LiteralPath $fullPath -Recurse -Force
          $status = "deleted"
        } catch {
          $status = "failed"
          $reason = $_.Exception.Message
        }
      }

      [pscustomobject]@{
        fullPath = $fullPath
        relativePath = $artifact.relativePath
        kind = $artifact.kind
        status = $status
        reason = $reason
      }
    }

    $manifest.cleanupRuns = @($manifest.cleanupRuns) + [pscustomobject]@{
      cleanedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
      results = $cleanupResults
    }
    foreach ($artifact in @($manifest.artifacts)) {
      $artifact.exists = Test-Path -LiteralPath $artifact.fullPath
    }
    Save-Manifest -Manifest $manifest

    $result = [pscustomobject]@{
      Action = "Cleanup"
      Session = $SessionName
      Results = $cleanupResults
    }
  }
}

if ($AsJson) {
  $result | ConvertTo-Json -Depth 8
} else {
  switch ($Action) {
    "List" {
      @($result.artifacts) | Select-Object relativePath, kind, retention, exists, note | Format-Table -AutoSize
    }
    "Cleanup" {
      @($result.Results) | Select-Object relativePath, kind, status, reason | Format-Table -AutoSize
    }
    default {
      $result | Format-List
    }
  }
}


