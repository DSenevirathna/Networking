@echo off
REM ============================================================================
REM SSL/TLS KeyStore Generation Script for Secure WebSocket Chat
REM Author: Member 3 - Security Implementation
REM ============================================================================

echo.
echo ========================================
echo    SSL/TLS KeyStore Generator
echo    Secure WebSocket Chat Application
echo ========================================
echo.

REM Configuration Variables
set KEYSTORE_DIR=keystore
set KEYSTORE_FILE=%KEYSTORE_DIR%\server.keystore
set KEYSTORE_PASS=changeit
set KEY_ALIAS=chatserver
set VALIDITY_DAYS=365
set KEY_ALG=RSA
set KEY_SIZE=2048
set DNAME="CN=localhost, OU=ChatServer, O=SecureChat, L=Colombo, ST=Western, C=LK"

REM Create keystore directory if it doesn't exist
if not exist "%KEYSTORE_DIR%" (
    echo Creating keystore directory: %KEYSTORE_DIR%
    mkdir "%KEYSTORE_DIR%"
)

REM Check if Java keytool is available
where keytool >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: keytool not found! Please ensure Java JDK is installed and in PATH.
    echo You can add Java to PATH or run this from JDK's bin directory.
    pause
    exit /b 1
)

echo.
echo [Step 1/4] Generating server keystore with self-signed certificate...
echo ---------------------------------------------------------------------

REM Generate server keystore with self-signed certificate
keytool -genkeypair ^
  -alias %KEY_ALIAS% ^
  -keyalg %KEY_ALG% ^
  -keysize %KEY_SIZE% ^
  -validity %VALIDITY_DAYS% ^
  -keystore "%KEYSTORE_FILE%" ^
  -storepass %KEYSTORE_PASS% ^
  -keypass %KEYSTORE_PASS% ^
  -dname %DNAME%

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to generate keystore!
    pause
    exit /b 1
)

echo SUCCESS: Server keystore created at %KEYSTORE_FILE%
echo.

REM Export certificate for client trust
set CERT_FILE=%KEYSTORE_DIR%\server.cer
echo [Step 2/4] Exporting server certificate...
echo ---------------------------------------------------------------------

keytool -exportcert ^
  -alias %KEY_ALIAS% ^
  -keystore "%KEYSTORE_FILE%" ^
  -storepass %KEYSTORE_PASS% ^
  -file "%CERT_FILE%"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to export certificate!
    pause
    exit /b 1
)

echo SUCCESS: Server certificate exported to %CERT_FILE%
echo.

REM Create client truststore (optional, for explicit trust)
set CLIENT_TRUSTSTORE=%KEYSTORE_DIR%\client.truststore
echo [Step 3/4] Creating client truststore...
echo ---------------------------------------------------------------------

keytool -importcert ^
  -alias %KEY_ALIAS% ^
  -file "%CERT_FILE%" ^
  -keystore "%CLIENT_TRUSTSTORE%" ^
  -storepass %KEYSTORE_PASS% ^
  -noprompt

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create client truststore!
    pause
    exit /b 1
)

echo SUCCESS: Client truststore created at %CLIENT_TRUSTSTORE%
echo.

REM Display keystore information
echo [Step 4/4] Verifying keystore contents...
echo ---------------------------------------------------------------------

keytool -list -v -keystore "%KEYSTORE_FILE%" -storepass %KEYSTORE_PASS% | findstr /C:"Alias" /C:"Valid" /C:"Owner"

echo.
echo ========================================
echo    KeyStore Generation Complete!
echo ========================================
echo.
echo Generated Files:
echo   - Server KeyStore:      %KEYSTORE_FILE%
echo   - Server Certificate:   %CERT_FILE%
echo   - Client TrustStore:    %CLIENT_TRUSTSTORE%
echo.
echo KeyStore Password: %KEYSTORE_PASS%
echo Key Alias:         %KEY_ALIAS%
echo Validity:          %VALIDITY_DAYS% days
echo.
echo ========================================
echo    Usage Instructions
echo ========================================
echo.
echo To run the server with SSL:
echo   java -Djavax.net.ssl.keyStore=%KEYSTORE_FILE% ^
echo        -Djavax.net.ssl.keyStorePassword=%KEYSTORE_PASS% ^
echo        -jar target\secure-websocket-chat.jar
echo.
echo Or set SSL_ENABLED=true in application properties
echo.
echo For client connections, use:
echo   wss://localhost:7070/chat (instead of ws://)
echo.
echo ========================================
echo.

REM Optional: Trust globally (requires admin privileges)
echo NOTE: To trust this certificate system-wide (requires admin):
echo   keytool -importcert -alias %KEY_ALIAS% -file %CERT_FILE% ^
echo           -keystore "%JAVA_HOME%\lib\security\cacerts" ^
echo           -storepass changeit
echo.

pause
