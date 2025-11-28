@echo off
echo ========================================
echo Limpeza Completa Android + Capacitor
echo ========================================
echo.

echo [1/7] Parando processos Gradle...
cd android
call gradlew --stop
cd ..

echo.
echo [2/7] Limpando cache Gradle...
cd android
call gradlew clean
cd ..

echo.
echo [3/7] Removendo diretorios de build...
rmdir /s /q android\app\build 2>nul
rmdir /s /q android\build 2>nul
rmdir /s /q android\.gradle 2>nul
rmdir /s /q android\.idea 2>nul
rmdir /s /q node_modules\.cache 2>nul

echo.
echo [4/7] Removendo arquivos Capacitor Android antigos...
rmdir /s /q android\capacitor-cordova-android-plugins 2>nul

echo.
echo [5/7] Verificando e instalando dependencias...
if not exist "node_modules" (
    echo Node modules nao encontrados. Instalando...
    call npm install
) else (
    echo Node modules encontrados. Reinstalando para garantir integridade...
    rmdir /s /q node_modules 2>nul
    call npm install
)

echo.
echo [6/7] Buildando projeto web...
call npm run build

echo.
echo [7/7] Resincronizando Capacitor Android...
call npx cap sync android

echo.
echo ========================================
echo Limpeza concluida! Agora execute:
echo npx cap run android
echo ========================================
pause
