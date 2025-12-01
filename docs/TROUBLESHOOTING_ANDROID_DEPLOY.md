# Troubleshooting: Erro de Deploy Android

## Erro: `ERR_UNKNOWN: Non-zero exit code from adb: 1`

Este erro geralmente ocorre quando você tenta instalar um APK no emulador/dispositivo e já existe uma versão do app instalada com uma assinatura diferente.

## Soluções

### Solução 1: Script Automático (Recomendado)

Execute o script PowerShell que desinstala o app existente:

```powershell
.\fix-android-deploy.ps1
```

Depois, tente novamente:
```bash
npx cap run android
```

### Solução 2: Desinstalar Manualmente via ADB

1. Encontre o caminho do ADB (geralmente em):
   - `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`
   - Ou adicione ao PATH do sistema

2. Execute:
```bash
adb uninstall com.lovable.appfinanceiro
```

3. Tente instalar novamente:
```bash
npx cap run android
```

### Solução 3: Desinstalar pelo Emulador

1. Abra o emulador Android
2. Vá em **Configurações** > **Apps**
3. Encontre **"App Financeiro"**
4. Toque no app > **Desinstalar**
5. Tente instalar novamente

### Solução 4: Limpar e Rebuildar

Se as soluções acima não funcionarem:

1. Execute o script de limpeza:
```bash
.\fix-android-build.bat
```

2. Depois execute:
```bash
npx cap run android
```

### Solução 5: Usar Android Studio

1. Abra o projeto no Android Studio:
```bash
npx cap open android
```

2. Aguarde o projeto carregar
3. Selecione o emulador no topo
4. Clique no botão **Run** (▶️) ou pressione `Shift+F10`
5. O Android Studio vai desinstalar automaticamente a versão antiga se necessário

## Verificar Dispositivos Conectados

Para verificar se o emulador está rodando:

```bash
# Se ADB estiver no PATH
adb devices

# Ou encontre o caminho manualmente
%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe devices
```

Você deve ver algo como:
```
List of devices attached
emulator-5554    device
```

## Outros Erros Comuns

### "No devices found"
- Certifique-se de que o emulador está rodando
- Ou conecte um dispositivo físico via USB com depuração USB ativada

### "INSTALL_FAILED_INSUFFICIENT_STORAGE"
- O emulador está sem espaço
- Aumente o armazenamento do emulador ou limpe apps desnecessários

### "INSTALL_FAILED_UPDATE_INCOMPATIBLE"
- A versão instalada tem assinatura diferente
- Use uma das soluções acima para desinstalar primeiro

## Prevenção

Para evitar este problema no futuro:

1. Sempre desinstale versões antigas antes de instalar uma nova
2. Use o mesmo keystore para builds de debug (Android Studio faz isso automaticamente)
3. Considere usar `npx cap run android` que gerencia isso automaticamente


