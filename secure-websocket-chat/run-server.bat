@echo off
REM ============================================================================
REM Secure WebSocket Chat Server - Standard Startup (No SSL)
REM For development/testing without SSL
REM ============================================================================

echo.
echo ========================================
echo   Secure WebSocket Chat Server
echo   Starting WITHOUT SSL (Development)
echo ========================================
echo.

REM Check if JAR file exists
if not exist "target\secure-websocket-chat-1.0-SNAPSHOT.jar" (
    echo ERROR: JAR file not found!
    echo Please build the project first: mvn clean package
    echo.
    pause
    exit /b 1
)

echo Starting server without SSL...
echo.
echo WARNING: SSL is DISABLED - communications are NOT encrypted!
echo This mode should only be used for local development.
echo.
echo Configuration:
echo   - SSL: DISABLED
echo   - Port: 7070
echo.
echo Endpoints:
echo   - WebSocket:    ws://localhost:7070/chat
echo   - File Upload:  http://localhost:7070/upload
echo   - Server Status: http://localhost:7070/status
echo.
echo ========================================
echo.

REM Start the server without SSL
java -jar target\secure-websocket-chat-1.0-SNAPSHOT.jar

pause
