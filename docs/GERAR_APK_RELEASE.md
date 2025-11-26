# Como Gerar APK de Release Assinado

## 1. Criar Keystore para Assinar o APK

Execute este comando no terminal (fora do projeto):

```bash
keytool -genkey -v -keystore app-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias app-release
```

**Importante:** Guarde bem a senha e o alias que você definir!

## 2. Configurar Secrets no GitHub

Adicione os seguintes secrets no GitHub (Settings > Secrets and variables > Actions > New repository secret):

### ANDROID_KEYSTORE_BASE64
Converta seu arquivo .jks para base64:

**No Linux/Mac:**
```bash
base64 -i app-release-key.jks | tr -d '\n'
```

**No Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("app-release-key.jks"))
```

### ANDROID_KEY_ALIAS
O alias que você definiu ao criar o keystore (ex: `app-release`)

### ANDROID_KEY_PASSWORD
A senha da chave (key password)

### ANDROID_STORE_PASSWORD
A senha do keystore (store password)

## 3. Workflow Automático

O workflow `.github/workflows/deploy-supabase-complete.yml` está configurado para:

1. **Com keystore configurado:** Gera APK release assinado
2. **Sem keystore:** Gera APK debug

### Upload para Hostinger

O workflow já está configurado para fazer upload automático para Hostinger se você tiver os secrets:
- `HOSTINGER_FTP_HOST`
- `HOSTINGER_FTP_USER`
- `HOSTINGER_FTP_PASSWORD`
- `HOSTINGER_FTP_DIR` (opcional, padrão: `/public_html`)

## 4. Gerar APK Manualmente (Local)

### Com Keystore Configurado:

1. Crie o arquivo `android/keystore.properties`:
```properties
storePassword=SUA_SENHA_STORE
keyPassword=SUA_SENHA_KEY
keyAlias=app-release
storeFile=app-release-key.jks
```

2. Copie seu arquivo `app-release-key.jks` para `android/`

3. Execute:
```bash
cd android
./gradlew assembleRelease
```

O APK estará em: `android/app/build/outputs/apk/release/app-release.apk`

### Sem Keystore (Debug):

```bash
cd android
./gradlew assembleDebug
```

O APK estará em: `android/app/build/outputs/apk/debug/app-debug.apk`

## 5. Arquivos no .gitignore

Os seguintes arquivos **NÃO** devem ser versionados:
- `android/keystore.properties`
- `android/*.jks`
- `android/*.keystore`

Eles já estão no .gitignore do projeto.

## 6. Publicar na Google Play Store

Quando tiver o APK release assinado:

1. Acesse [Google Play Console](https://play.google.com/console)
2. Crie um novo aplicativo
3. Faça upload do APK release
4. Preencha as informações do app
5. Submeta para revisão

## Troubleshooting

### Erro: "Failed to read key"
- Verifique se as senhas estão corretas no `keystore.properties`
- Verifique se o arquivo .jks está no local correto

### Erro: "Keystore was tampered with"
- A senha do store está incorreta

### APK não instalando
- Certifique-se de que o APK está assinado corretamente
- Verifique se o versionCode foi incrementado (se estiver atualizando)
