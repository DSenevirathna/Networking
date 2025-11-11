# Quick Build Script for PowerShell
# Run this to build the project easily

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Secure WebSocket Chat - Quick Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Setup environment
$env:MAVEN_HOME = "$env:USERPROFILE\maven\apache-maven-3.9.9"
$env:PATH = "$env:MAVEN_HOME\bin;$env:PATH"
$env:JAVA_HOME = "C:\Users\Mandrini Yashodha\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.9.9-hotspot"

Write-Host "Environment configured!" -ForegroundColor Green
Write-Host "Maven: $env:MAVEN_HOME" -ForegroundColor Gray
Write-Host "Java: $env:JAVA_HOME" -ForegroundColor Gray
Write-Host ""

# Build
Write-Host "Building project..." -ForegroundColor Yellow
mvn clean package -DskipTests

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Build Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "JAR file: target\secure-websocket-chat.jar" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Run with SSL:    .\run-server-ssl.bat" -ForegroundColor White
    Write-Host "  2. Run without SSL: .\run-server.bat" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Build Failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
}
