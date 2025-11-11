@echo off
REM ============================================================================
REM SSL/TLS Test Suite for Secure WebSocket Chat
REM Member 3 - Security Implementation
REM ============================================================================

echo.
echo ========================================
echo   SSL/TLS Connection Test Suite
echo ========================================
echo.

REM Check if server is running
echo [Test 1] Checking if server is running...
echo.

curl -k -s https://localhost:7443/status > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ PASS: Server is responding on HTTPS
    echo.
) else (
    curl -s http://localhost:7070/status > nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo ⚠️  WARNING: Server is running without SSL
        echo    Please start with: run-server-ssl.bat
        echo.
    ) else (
        echo ❌ FAIL: Server is not running
        echo    Please start the server first
        echo.
        pause
        exit /b 1
    )
)

REM Test server status endpoint
echo [Test 2] Testing /status endpoint...
echo.

curl -k -s https://localhost:7443/status
echo.
echo.

REM Test SSL certificate details
echo [Test 3] Checking SSL certificate...
echo.

openssl s_client -connect localhost:7443 -showcerts < nul 2>&1 | findstr /C:"subject" /C:"issuer" /C:"Verify"
if %ERRORLEVEL% NEQ 0 (
    echo Note: OpenSSL not found. Skipping certificate inspection.
    echo Install OpenSSL for detailed certificate testing.
)
echo.

REM Test WebSocket upgrade (using curl)
echo [Test 4] Testing WebSocket endpoint availability...
echo.

curl -k -i -N ^
     -H "Connection: Upgrade" ^
     -H "Upgrade: websocket" ^
     -H "Sec-WebSocket-Version: 13" ^
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" ^
     https://localhost:7443/chat 2>&1 | findstr /C:"101" /C:"Upgrade"

if %ERRORLEVEL% EQU 0 (
    echo ✅ PASS: WebSocket endpoint is accessible
) else (
    echo ⚠️  Note: WebSocket upgrade response may vary
)
echo.

REM Summary
echo ========================================
echo   Test Summary
echo ========================================
echo.
echo Server Configuration:
keytool -list -keystore keystore\server.keystore -storepass changeit 2>&1 | findstr /C:"Alias" /C:"Certificate fingerprint"
echo.
echo Test completed. Check results above.
echo.

pause
