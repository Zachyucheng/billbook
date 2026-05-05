@echo off
REM Build Windows installer for Billbook
cd /d "%~dp0"

echo === Building Billbook v2.5.1 Windows Installer ===
echo.

echo [1/3] Installing dependencies...
call npm install --force
if %errorlevel% neq 0 (
    echo Failed to install dependencies.
    pause
    exit /b 1
)

echo [2/3] Building web frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Failed to build web frontend.
    pause
    exit /b 1
)

echo [3/3] Packaging Windows installer...
npx electron-builder --win --x64
if %errorlevel% neq 0 (
    echo Failed to package installer.
    pause
    exit /b 1
)

echo.
echo === Done! Installer is in dist-electron/ ===
pause
