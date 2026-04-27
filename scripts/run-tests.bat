@echo off
echo ========================================
echo Chat & Notifications Test Runner
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js first
    pause
    exit /b 1
)

REM Check if required packages are installed
if not exist node_modules\@supabase (
    echo Installing required packages...
    npm install
)

REM Set environment variables if not set
if "%SUPABASE_URL%"=="" (
    echo WARNING: SUPABASE_URL environment variable not set
    echo Please set it in your environment or in a .env file
    echo.
)

if "%SUPABASE_SERVICE_KEY%"=="" (
    echo WARNING: SUPABASE_SERVICE_KEY environment variable not set
    echo Please set it in your environment or in a .env file
    echo.
)

echo Running automated tests...
echo.

REM Run the test script
node scripts/test-chat-functionality.js

echo.
echo Test completed! Check the results above.
echo.
pause
