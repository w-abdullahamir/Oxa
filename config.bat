@echo off
setlocal enabledelayedexpansion

:: CONFIGURATION
set "targetFile=C:\1Projects\Oxa\.env"
set "port=10000"

echo Locating Wireless IPv4 Address...

:: Extract IP from ipconfig
for /f "usebackq tokens=2 delims=:" %%f in (`ipconfig ^| findstr /c:"IPv4 Address"`) do (
    set "rawIp=%%f"
    set "currentIp=!rawIp:~1!"
    :: This break ensures we take the first IPv4 found; adjust if you have multiple adapters
    goto :found
)

:found
if not defined currentIp (
    echo Error: Could not find IPv4 address.
    pause
    exit /b
)

echo Found IP: %currentIp%

:: Update the specific line in the .env file using PowerShell
powershell -Command "(Get-Content '%targetFile%') -replace 'EXPO_PUBLIC_OXA_BACKEND_URL=.*', 'EXPO_PUBLIC_OXA_BACKEND_URL=http://%currentIp%:%port%' | Set-Content '%targetFile%'"