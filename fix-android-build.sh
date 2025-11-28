#!/bin/bash

echo "========================================"
echo "Limpeza Completa Android + Capacitor"
echo "========================================"
echo ""

echo "[1/7] Parando processos Gradle..."
cd android
./gradlew --stop
cd ..

echo ""
echo "[2/7] Limpando cache Gradle..."
cd android
./gradlew clean
cd ..

echo ""
echo "[3/7] Removendo diretorios de build..."
rm -rf android/app/build
rm -rf android/build
rm -rf android/.gradle
rm -rf android/.idea
rm -rf node_modules/.cache

echo ""
echo "[4/7] Removendo arquivos Capacitor Android antigos..."
rm -rf android/capacitor-cordova-android-plugins

echo ""
echo "[5/7] Verificando e instalando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "Node modules nao encontrados. Instalando..."
    npm install
else
    echo "Node modules encontrados. Reinstalando para garantir integridade..."
    rm -rf node_modules
    npm install
fi

echo ""
echo "[6/7] Buildando projeto web..."
npm run build

echo ""
echo "[7/7] Resincronizando Capacitor Android..."
npx cap sync android

echo ""
echo "========================================"
echo "Limpeza concluida! Agora execute:"
echo "npx cap run android"
echo "========================================"
