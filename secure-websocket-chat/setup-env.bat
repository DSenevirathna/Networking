@echo off
REM ========================================
REM Environment Setup Script
REM Adds Java and Maven to PATH
REM ========================================

echo Setting up environment...

REM Add Java to PATH
set "JAVA_HOME=C:\Users\Mandrini Yashodha\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.9.9-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

REM Try to find Maven
set "MAVEN_PATH=C:\Program Files\Maven\apache-maven-3.9.9\apache-maven\src\bin"
if exist "%MAVEN_PATH%\mvn.cmd" (
    set "PATH=%MAVEN_PATH%;%PATH%"
    echo Maven found at: %MAVEN_PATH%
) else (
    echo WARNING: Maven not found. Please install Maven or update the path in this script.
    echo You can download Maven from: https://maven.apache.org/download.cgi
)

REM Verify Java
echo.
echo Checking Java...
java -version

REM Verify Maven
echo.
echo Checking Maven...
mvn --version 2>nul
if errorlevel 1 (
    echo Maven is not available. Please install Maven.
) else (
    echo Maven is ready!
)

echo.
echo ========================================
echo Environment setup complete!
echo ========================================
echo.
echo You can now run:
echo   mvn clean package
echo   .\run-server-ssl.bat
echo.
