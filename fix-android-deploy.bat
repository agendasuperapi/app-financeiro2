@echo off
echo ========================================
echo Corrigindo Deploy Android
echo ========================================
echo.

echo [1/4] Procurando ADB...
set "ADB_PATH="

REM Tentar caminhos comuns do ADB
if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set "ADB_PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
    goto :found_adb
)

if exist "%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe" (
    set "ADB_PATH=%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe"
    goto :found_adb
)

if defined ANDROID_HOME (
    if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
        set "ADB_PATH=%ANDROID_HOME%\platform-tools\adb.exe"
        goto :found_adb
    )
)

if defined ANDROID_SDK_ROOT (
    if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" (
        set "ADB_PATH=%ANDROID_SDK_ROOT%\platform-tools\adb.exe"
        goto :found_adb
    )
)

REM Tentar encontrar no PATH
where adb >nul 2>&1
if %ERRORLEVEL% == 0 (
    set "ADB_PATH=adb"
    goto :found_adb
)

echo ERRO: ADB nao encontrado!
echo.
echo Por favor, certifique-se de que:
echo 1. Android Studio esta instalado
echo 2. Android SDK Platform Tools esta instalado
echo 3. Ou adicione o caminho do ADB ao PATH do sistema
echo.
echo Caminhos comuns:
echo   %LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
echo.
echo Alternativa: Desinstale o app manualmente no emulador:
echo   1. Abra o emulador
echo   2. Va em Configuracoes ^> Apps
echo   3. Encontre 'App Financeiro' e desinstale
pause
exit /b 1

:found_adb
echo ADB encontrado!
echo.

echo [2/4] Verificando dispositivos conectados...
%ADB_PATH% devices
echo.

echo [3/4] Desinstalando app existente (se houver)...
set "PACKAGE_NAME=com.lovable.appfinanceiro"
%ADB_PATH% uninstall %PACKAGE_NAME%
if %ERRORLEVEL% == 0 (
    echo App desinstalado com sucesso!
) else (
    echo App nao estava instalado (normal na primeira instalacao)
)
echo.

echo [4/4] Limpando cache...
%ADB_PATH% shell pm clear %PACKAGE_NAME% >nul 2>&1
echo Cache limpo!
echo.

echo ========================================
echo Pronto! Agora voce pode tentar:
echo   npx cap run android
echo.
echo Ou abra o Android Studio e execute o app de la
echo ========================================
pause


