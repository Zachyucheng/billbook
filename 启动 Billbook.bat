@echo off
cd /d "%~dp0"
echo === Launching Billbook Desktop ===
echo.
echo This will start Billbook using the bundled Electron runtime.
echo Close the Electron window to exit.
echo.
"%CD%\node_modules\electron\dist\electron.exe" "%CD%"
pause
