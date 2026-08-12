@echo off
setlocal EnableExtensions
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fI"
set "PATH=%PROJECT_ROOT%\node-runtime;%PATH%"
echo [INFO] TypeScript frontend build
if not exist "%PROJECT_ROOT%\package.json" (
 echo [FAIL] Frontend package manifest not found: %PROJECT_ROOT%\package.json
 echo [FAIL] Why it matters: npm cannot install or build the TypeScript frontend.
 echo [FAIL] Corrective action: restore package.json to the project root.
 exit /b 1
)
set "NPM=%PROJECT_ROOT%\node-runtime\npm.cmd"
if not exist "%NPM%" call "%SCRIPT_DIR%bootstrap_node.bat"
if errorlevel 1 exit /b 1
if not exist "%NPM%" (
 echo [WARN] Portable npm is unavailable; retaining existing compiled frontend.
 exit /b 0
)
pushd "%PROJECT_ROOT%"
call "%NPM%" install --no-audit --no-fund
if errorlevel 1 exit /b 1
call "%NPM%" run build
if errorlevel 1 exit /b 1
popd
echo [PASS] TypeScript frontend compiled successfully.
exit /b 0
