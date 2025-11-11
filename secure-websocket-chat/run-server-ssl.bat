@echo off
REM ============================================================================
REM Secure WebSocket Chat Server - Startup Script
REM Member 3 - Security Implementation
REM ============================================================================

echo.
echo ========================================
echo   Secure WebSocket Chat Server
echo   Starting with SSL/TLS Support
echo ========================================
echo.

REM Check if keystore exists
if not exist "keystore\server.keystore" (
    echo ERROR: KeyStore not found!
    echo Please run generate-keystore.bat first to create SSL certificates.
    echo.
    pause
    exit /b 1
)

REM Check if JAR file exists
if not exist "target\secure-websocket-chat-1.0-SNAPSHOT.jar" (
    echo ERROR: JAR file not found!
    echo Please build the project first: mvn clean package
    echo.
    pause
    exit /b 1
)

echo Starting server with SSL enabled...
echo.
echo Configuration:
echo   - SSL: ENABLED
echo   - Port: 7443
echo   - KeyStore: keystore/server.keystore
echo   - Protocol: TLSv1.2, TLSv1.3
echo.
echo Endpoints:
echo   - WebSocket:    wss://localhost:7443/chat
echo   - File Upload:  https://localhost:7443/upload
echo   - Server Status: https://localhost:7443/status
echo.
echo ========================================
echo.

REM Start the server with SSL configuration
java -Dssl.enabled=true ^
     -Djavax.net.ssl.keyStore=keystore/server.keystore ^
     -Djavax.net.ssl.keyStorePassword=changeit ^
     -jar target\secure-websocket-chat-1.0-SNAPSHOT.jar

pause
