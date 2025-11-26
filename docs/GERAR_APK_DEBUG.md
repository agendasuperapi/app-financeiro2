# Como Gerar APK Debug para Testes

## 🎯 Workflow Automático (GitHub Actions)

O workflow está configurado para gerar **APK debug automaticamente** a cada push.

### O que acontece automaticamente:
1. ✅ Build do projeto web
2. ✅ Upload do build web para Hostinger
3. ✅ Geração do APK debug (não assinado)
4. ✅ Upload do APK para Hostinger
5. ✅ APK disponível como artifact no GitHub

### Acessar o APK:

**Via Hostinger (se configurado):**
- APK mais recente: `https://SEU_DOMINIO/app-debug.apk`
- APKs com timestamp: `https://SEU_DOMINIO/app-debug-YYYYMMDD-HHMMSS.apk`

**Via GitHub:**
1. Acesse: Actions > último workflow executado
2. Baixe o artifact `app-debug-apk`

## 📱 Testar o APK

### No dispositivo físico:
1. Baixe o APK
2. Ative "Instalar apps desconhecidos" nas configurações
3. Instale o APK

### No emulador Android Studio:
```bash
adb install app-debug.apk
```

## 🔨 Gerar APK Localmente

### Requisitos:
- Node.js instalado
- Android Studio instalado
- Pasta `android` criada (`npx cap add android`)

### Passos:

1. **Clone o repositório:**
```bash
git pull
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Build do projeto:**
```bash
npm run build
```

4. **Sync Capacitor:**
```bash
npx cap sync android
```

5. **Gere o APK debug:**
```bash
cd android
./gradlew assembleDebug
```

6. **APK gerado em:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## 🚀 Quando Publicar na Play Store

Quando sair da fase de testes e quiser publicar, consulte o guia:
📖 `docs/GERAR_APK_RELEASE.md`

Lá você encontrará instruções para:
- Criar keystore para assinar o APK
- Configurar secrets no GitHub
- Gerar APK release assinado
- Publicar na Google Play Store

## 🔍 Verificar Informações do APK

```bash
# Ver informações do APK
aapt dump badging app-debug.apk | grep -E 'package|versionCode|versionName'
```

## ⚠️ Limitações do APK Debug

- ❌ Não pode ser publicado na Play Store
- ❌ Não está otimizado (tamanho maior)
- ❌ Não está ofuscado (código visível)
- ✅ Perfeito para testes internos
- ✅ Permite debug via USB
- ✅ Instalação rápida

## 🆘 Troubleshooting

### Erro: "App não instalou"
- Desinstale a versão anterior primeiro
- Verifique espaço no dispositivo

### Erro: "Instalação bloqueada"
- Ative "Instalar apps desconhecidos" para o navegador/gerenciador de arquivos

### Erro: "Gradle build failed"
- Execute: `cd android && ./gradlew clean`
- Tente novamente

### APK muito grande
- Normal para debug (não está otimizado)
- APK release será menor

## 📊 Informações Técnicas

- **Tipo:** Debug APK (não assinado)
- **Tamanho:** ~10-50 MB (varia)
- **Formato:** APK (Android Package)
- **Min SDK:** 22 (Android 5.1)
- **Target SDK:** 34 (Android 14)
