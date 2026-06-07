@echo off
REM Ollama Manual Installer Script for Windows
REM Run this in Command Prompt as Administrator

echo ===================================
echo     Ollama Setup for ViralForce.AI
echo ===================================
echo.
echo This script will download and install Ollama
echo.

REM Method 1: Try installing via Scoop
echo [1/3] Checking for Scoop...
scoop list ollama >nul 2>&1
if %errorlevel% equ 0 (
    echo Ollama is already installed via Scoop!
    goto test_ollama
)

REM Method 2: Try installing via Chocolatey
echo [2/3] Checking for Chocolatey...
choco list ollama -l >nul 2>&1
if %errorlevel% equ 0 (
    echo Ollama is already installed via Chocolatey!
    goto test_ollama
)

REM Method 3: Manual download
echo [3/3] Downloading Ollama installer...
echo Please wait, this may take a few minutes...

REM Create temp directory
set TEMP_DIR=%TEMP%\OllamaSetup
if not exist %TEMP_DIR% mkdir %TEMP_DIR%

REM Download using PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ProgressPreference = 'SilentlyContinue'; ^
   Invoke-WebRequest -Uri 'https://ollama.ai/download/windows' ^
   -OutFile '%TEMP_DIR%\OllamaInstall.exe' -UseBasicParsing; ^
   Write-Host 'Download complete: ' + (Get-Item '%TEMP_DIR%\OllamaInstall.exe').Length + ' bytes'"

if exist "%TEMP_DIR%\OllamaInstall.exe" (
    echo.
    echo [Setup] Starting Ollama installer...
    echo Please complete the installation wizard.
    echo.
    start /wait "%TEMP_DIR%\OllamaInstall.exe"
    echo Installation completed. Waiting for Ollama to initialize...
    timeout /t 5
) else (
    echo ERROR: Failed to download Ollama installer
    echo.
    echo Alternative: Download manually from https://ollama.ai/download
    pause
    exit /b 1
)

:test_ollama
echo.
echo [Check] Verifying Ollama installation...
ollama --version
if %errorlevel% equ 0 (
    echo Ollama is installed!
    echo.
    echo Next steps:
    echo 1. Open a new PowerShell
    echo 2. Run: ollama pull mistral
    echo 3. Run: ollama serve
    echo 4. Keep it running in background
    echo.
    pause
) else (
    echo ERROR: Ollama not found in PATH
    echo You may need to restart your computer for changes to take effect.
    pause
    exit /b 1
)
