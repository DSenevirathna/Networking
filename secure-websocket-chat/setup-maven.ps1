# Maven Download and Setup Script
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Maven Setup for Secure WebSocket Chat" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$mavenVersion = "3.9.9"
$mavenUrl = "https://dlcdn.apache.org/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"
$installPath = "C:\Program Files\Maven"
$mavenHome = "$installPath\apache-maven-$mavenVersion"

# Check if Maven is already working
Write-Host "[1/4] Checking for existing Maven installation..." -ForegroundColor Yellow
$mavenCheck = Get-Command mvn -ErrorAction SilentlyContinue
if ($mavenCheck) {
    Write-Host "Maven is already available! Version:" -ForegroundColor Green
    mvn --version
    Write-Host ""
    Write-Host "You can now run: mvn clean package" -ForegroundColor Green
    Read-Host "Press Enter to exit"
    exit 0
}

# Check if Maven is installed but not in PATH
if (Test-Path "$mavenHome\bin\mvn.cmd") {
    Write-Host "Maven found at: $mavenHome" -ForegroundColor Green
    Write-Host "Adding to PATH for this session..." -ForegroundColor Yellow
    $env:PATH = "$mavenHome\bin;$env:PATH"
    $env:MAVEN_HOME = $mavenHome
    
    Write-Host ""
    Write-Host "Testing Maven..." -ForegroundColor Yellow
    mvn --version
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Maven is now ready!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run these commands:" -ForegroundColor Cyan
    Write-Host '  $env:PATH = "' + $mavenHome + '\bin;$env:PATH"' -ForegroundColor White
    Write-Host "  mvn clean package" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 0
}

# Download Maven
Write-Host ""
Write-Host "[2/4] Downloading Maven $mavenVersion..." -ForegroundColor Yellow
Write-Host "From: $mavenUrl" -ForegroundColor Gray

$zipFile = "$env:TEMP\apache-maven-$mavenVersion.zip"

try {
    Invoke-WebRequest -Uri $mavenUrl -OutFile $zipFile -UseBasicParsing
    Write-Host "Download complete!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to download Maven" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download manually from:" -ForegroundColor Yellow
    Write-Host "https://maven.apache.org/download.cgi" -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
    exit 1
}

# Extract Maven
Write-Host ""
Write-Host "[3/4] Extracting Maven..." -ForegroundColor Yellow

try {
    # Create install directory if it doesn't exist
    if (!(Test-Path $installPath)) {
        New-Item -ItemType Directory -Path $installPath -Force | Out-Null
    }
    
    # Extract
    Expand-Archive -Path $zipFile -DestinationPath $installPath -Force
    Write-Host "Extraction complete!" -ForegroundColor Green
    
    # Clean up
    Remove-Item $zipFile -Force
    
} catch {
    Write-Host "ERROR: Failed to extract Maven" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Setup environment
Write-Host ""
Write-Host "[4/4] Setting up environment..." -ForegroundColor Yellow

$env:MAVEN_HOME = $mavenHome
$env:PATH = "$mavenHome\bin;$env:PATH"

# Test Maven
Write-Host ""
Write-Host "Testing Maven installation..." -ForegroundColor Yellow
mvn --version

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Maven Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Maven has been installed to:" -ForegroundColor Cyan
    Write-Host "  $mavenHome" -ForegroundColor White
    Write-Host ""
    Write-Host "To use Maven in this session:" -ForegroundColor Cyan
    Write-Host '  $env:PATH = "' + $mavenHome + '\bin;$env:PATH"' -ForegroundColor White
    Write-Host "  mvn clean package" -ForegroundColor White
    Write-Host ""
    Write-Host "To add Maven permanently to PATH:" -ForegroundColor Yellow
    Write-Host "  1. Open System Properties > Environment Variables" -ForegroundColor White
    Write-Host "  2. Add to PATH: $mavenHome\bin" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "ERROR: Maven installation failed" -ForegroundColor Red
}

Read-Host "Press Enter to exit"
