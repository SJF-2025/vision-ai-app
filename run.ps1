[CmdletBinding()]
param(
  [string]$ImageTag = "vision-ai-app:full",
  [string]$ContainerName = "vision-ai-app",
  [int]$FrontendPort = 3001,
  [int]$BackendPort = 8002
)

$ErrorActionPreference = "Stop"

# Move to script directory
Set-Location -Path $PSScriptRoot

Write-Host "Building image $ImageTag..." -ForegroundColor Cyan
podman build --build-arg INCLUDE_TORCH=true -t $ImageTag -f Containerfile .

Write-Host "Stopping previous container (if any)..." -ForegroundColor Cyan
podman rm -f $ContainerName 2>$null | Out-Null

# Windows paths: no :Z flag
$weightsHost = Join-Path (Get-Location) "weights"

Write-Host "Starting container $ContainerName on http://localhost:$FrontendPort ..." -ForegroundColor Cyan
podman run --rm -d `
  -p ${FrontendPort}:${FrontendPort} `
  -p ${BackendPort}:8002 `
  -e FRONTEND_PORT=$FrontendPort `
  -e BACKEND_PORT=$BackendPort `
  -e FRONTEND_CORS_ORIGIN="http://localhost:$FrontendPort,http://127.0.0.1:$FrontendPort" `
  -v "${weightsHost}:/app/weights" `
  --name $ContainerName $ImageTag | Out-Null

Write-Host "" 
Write-Host "Started $ContainerName" -ForegroundColor Green
Write-Host "- Frontend: http://localhost:$FrontendPort"
Write-Host "- Backend:  http://localhost:$BackendPort/health"
