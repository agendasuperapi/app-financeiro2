# Script para corrigir erro de deploy no Android Emulator
# Este script desinstala a aplicação existente do emulador antes de tentar instalar novamente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Corrigindo Deploy Android" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Função para encontrar ADB
function Find-Adb {
    $commonPaths = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "$env:USERPROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe",
        "$env:ANDROID_HOME\platform-tools\adb.exe",
        "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe"
    )
    
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    
    # Tentar encontrar via PATH
    try {
        $adb = Get-Command adb -ErrorAction SilentlyContinue
        if ($adb) {
            return $adb.Source
        }
    } catch {
        # Ignorar erro
    }
    
    return $null
}

# Encontrar ADB
Write-Host "[1/4] Procurando ADB..." -ForegroundColor Yellow
$adbPath = Find-Adb

if (-not $adbPath) {
    Write-Host "ERRO: ADB não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, certifique-se de que:" -ForegroundColor Yellow
    Write-Host "1. Android Studio está instalado" -ForegroundColor Yellow
    Write-Host "2. Android SDK Platform Tools está instalado" -ForegroundColor Yellow
    Write-Host "3. Ou adicione o caminho do ADB ao PATH do sistema" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Caminhos comuns:" -ForegroundColor Yellow
    Write-Host "  $env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Alternativa: Desinstale o app manualmente no emulador:" -ForegroundColor Yellow
    Write-Host "  1. Abra o emulador" -ForegroundColor Yellow
    Write-Host "  2. Vá em Configurações > Apps" -ForegroundColor Yellow
    Write-Host "  3. Encontre 'App Financeiro' e desinstale" -ForegroundColor Yellow
    exit 1
}

Write-Host "ADB encontrado em: $adbPath" -ForegroundColor Green
Write-Host ""

# Verificar dispositivos conectados
Write-Host "[2/4] Verificando dispositivos conectados..." -ForegroundColor Yellow
$devices = & $adbPath devices
Write-Host $devices

$deviceCount = ($devices | Select-String "device$" | Measure-Object).Count

if ($deviceCount -eq 0) {
    Write-Host "ERRO: Nenhum dispositivo/emulador conectado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor:" -ForegroundColor Yellow
    Write-Host "1. Inicie o emulador Android no Android Studio" -ForegroundColor Yellow
    Write-Host "2. Ou conecte um dispositivo físico via USB" -ForegroundColor Yellow
    Write-Host "3. Execute este script novamente" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Desinstalar app existente
Write-Host "[3/4] Desinstalando app existente (se houver)..." -ForegroundColor Yellow
$packageName = "com.lovable.appfinanceiro"

$uninstallResult = & $adbPath uninstall $packageName 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "App desinstalado com sucesso!" -ForegroundColor Green
} else {
    if ($uninstallResult -match "not found") {
        Write-Host "App não estava instalado (isso é normal na primeira instalação)" -ForegroundColor Yellow
    } else {
        Write-Host "Aviso: $uninstallResult" -ForegroundColor Yellow
    }
}

Write-Host ""

# Limpar cache do app (se existir)
Write-Host "[4/4] Limpando cache..." -ForegroundColor Yellow
& $adbPath shell pm clear $packageName 2>&1 | Out-Null
Write-Host "Cache limpo!" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pronto! Agora você pode tentar:" -ForegroundColor Green
Write-Host "  npx cap run android" -ForegroundColor White
Write-Host ""
Write-Host "Ou abra o Android Studio e execute o app de lá" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan


