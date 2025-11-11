@echo off
REM ========================================
REM Simple Build and Run Script
REM Uses existing Maven installation
REM ========================================

echo ========================================
echo   Secure WebSocket Chat - Build Script
echo ========================================
echo.

REM Set Java
set "JAVA_HOME=C:\Users\Mandrini Yashodha\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.9.9-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

REM Set Maven path (the one we found)
set "MAVEN_BIN=C:\Program Files\Maven\apache-maven-3.9.9\apache-maven\src\bin"
set "PATH=%MAVEN_BIN%;%PATH%"

echo Verifying tools...
echo.

java -version
echo.

REM Check if Maven works
mvn --version 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: Maven is not working properly.
    echo.
    echo Please install Maven manually:
    echo 1. Download from: https://maven.apache.org/download.cgi
    echo 2. Extract to C:\Program Files\Maven
    echo 3. Add C:\Program Files\Maven\apache-maven-3.9.9\bin to PATH
    echo.
    echo Or use this quick PowerShell command:
    echo    Start-Process "https://maven.apache.org/download.cgi"
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Building Project with Maven
echo ========================================
echo.

REM Clean and build
call mvn clean package -DskipTests

if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo JAR file created: target\secure-websocket-chat.jar
echo.
echo To run the server:
echo   With SSL:    .\run-server-ssl.bat
echo   Without SSL: .\run-server.bat
echo.
pause
