@echo off
REM ========================================
REM Manual Build Script (Without Maven)
REM ========================================

echo ========================================
echo   Building Secure WebSocket Chat
echo   Manual Compilation (No Maven needed)
echo ========================================
echo.

REM Set Java paths
set "JAVA_HOME=C:\Users\Mandrini Yashodha\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.9.9-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

REM Create output directory
if not exist "build" mkdir build
if not exist "build\classes" mkdir build\classes
if not exist "build\libs" mkdir build\libs

echo [Step 1/4] Downloading dependencies...
echo ========================================

REM Create lib directory if it doesn't exist
if not exist "lib" mkdir lib

REM Download Javalin and dependencies
echo Downloading Javalin 6.1.3...
powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/io/javalin/javalin/6.1.3/javalin-6.1.3.jar' -OutFile 'lib\javalin-6.1.3.jar'"

echo Downloading SLF4J API...
powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/org/slf4j/slf4j-api/2.0.9/slf4j-api-2.0.9.jar' -OutFile 'lib\slf4j-api-2.0.9.jar'"

echo Downloading SLF4J Simple...
powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/org/slf4j/slf4j-simple/2.0.9/slf4j-simple-2.0.9.jar' -OutFile 'lib\slf4j-simple-2.0.9.jar'"

echo Downloading Jetty Server...
powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/org/eclipse/jetty/jetty-server/11.0.15/jetty-server-11.0.15.jar' -OutFile 'lib\jetty-server-11.0.15.jar'"

echo Downloading Jetty Webapp...
powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/org/eclipse/jetty/jetty-webapp/11.0.15/jetty-webapp-11.0.15.jar' -OutFile 'lib\jetty-webapp-11.0.15.jar'"

echo Downloading Jetty WebSocket Servlet...
powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/org/eclipse/jetty/websocket/jetty-websocket-servlet/11.0.15/jetty-websocket-servlet-11.0.15.jar' -OutFile 'lib\jetty-websocket-servlet-11.0.15.jar'"

echo Downloading Jetty WebSocket Server...
powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/org/eclipse/jetty/websocket/jetty-websocket-server/11.0.15/jetty-websocket-server-11.0.15.jar' -OutFile 'lib\jetty-websocket-server-11.0.15.jar'"

echo Downloading Gson...
powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar' -OutFile 'lib\gson-2.10.1.jar'"

echo Downloading Kotlin Stdlib...
powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/org/jetbrains/kotlin/kotlin-stdlib/1.9.0/kotlin-stdlib-1.9.0.jar' -OutFile 'lib\kotlin-stdlib-1.9.0.jar'"

echo.
echo [Step 2/4] Compiling Java source files...
echo ========================================

REM Build classpath
set "CLASSPATH=lib\*"

REM Find and compile all Java files
dir /s /B src\main\java\*.java > sources.txt
javac -d build\classes -cp "%CLASSPATH%" @sources.txt

if errorlevel 1 (
    echo ERROR: Compilation failed!
    del sources.txt
    pause
    exit /b 1
)

echo Compilation successful!
del sources.txt

echo.
echo [Step 3/4] Creating executable JAR...
echo ========================================

REM Create manifest
echo Main-Class: com.Itfac.TestNGLab.chat.ChatServer > build\manifest.txt
echo Class-Path: . lib\javalin-6.1.3.jar lib\slf4j-api-2.0.9.jar lib\slf4j-simple-2.0.9.jar lib\jetty-server-11.0.15.jar lib\jetty-webapp-11.0.15.jar lib\jetty-websocket-servlet-11.0.15.jar lib\jetty-websocket-server-11.0.15.jar lib\gson-2.10.1.jar lib\kotlin-stdlib-1.9.0.jar >> build\manifest.txt

REM Create JAR
cd build\classes
jar cfm ..\secure-websocket-chat.jar ..\manifest.txt .
cd ..\..

REM Copy to target directory
if not exist "target" mkdir target
copy build\secure-websocket-chat.jar target\secure-websocket-chat.jar

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo JAR file created: target\secure-websocket-chat.jar
echo.
echo To run with SSL:
echo   .\run-server-ssl.bat
echo.
echo To run without SSL:
echo   .\run-server.bat
echo.
pause
