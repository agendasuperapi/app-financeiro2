# Como Gerar APK/IPA do Seu App

## Pré-requisitos

### Para Android:
- **Android Studio** instalado
- **Java JDK** (versão 11 ou superior)

### Para iOS:
- **Mac** com macOS
- **Xcode** instalado
- **CocoaPods** instalado (`sudo gem install cocoapods`)

## Passo a Passo

### 1. Transferir o Projeto para o GitHub
1. Clique no botão **"Export to Github"** no Lovable
2. Clone o repositório no seu computador:
   ```bash
   git clone [URL-DO-SEU-REPOSITORIO]
   cd [NOME-DO-PROJETO]
   ```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Adicionar Plataformas

**Para Android:**
```bash
npx cap add android
```

**Para iOS:**
```bash
npx cap add ios
```

### 4. Build do Projeto
```bash
npm run build
```

### 5. Sincronizar com as Plataformas Nativas
```bash
npx cap sync
```

### 6. Gerar o APK (Android)

```bash
npx cap open android
```

Isso abrirá o Android Studio. Dentro do Android Studio:

1. Aguarde o projeto carregar completamente
2. Vá em **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Quando terminar, clique em **"locate"** para encontrar o APK gerado
4. O APK estará em: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Para Gerar APK de Produção (Release):
1. No Android Studio, vá em **Build** → **Generate Signed Bundle / APK**
2. Selecione **APK**
3. Crie ou selecione um keystore
4. Configure as senhas e alias
5. Selecione a variante **release**
6. O APK assinado estará em `android/app/build/outputs/apk/release/`

### 7. Gerar o IPA (iOS)

```bash
npx cap open ios
```

Isso abrirá o Xcode. Dentro do Xcode:

1. Aguarde o projeto carregar
2. Selecione seu dispositivo ou simulador no topo
3. Vá em **Product** → **Archive**
4. Após o archive, clique em **Distribute App**
5. Escolha o método de distribuição:
   - **App Store Connect** (para publicar na App Store)
   - **Ad Hoc** (para distribuição limitada)
   - **Development** (para testes)

## Testar em Dispositivo Físico

**Android:**
```bash
npx cap run android
```

**iOS:**
```bash
npx cap run ios
```

## Modo de Desenvolvimento com Hot Reload

O arquivo `capacitor.config.ts` está configurado para usar hot-reload durante o desenvolvimento. Isso significa que as mudanças que você faz no Lovable aparecerão automaticamente no app.

**Para usar em produção**, remova ou comente a seção `server` no arquivo `capacitor.config.ts`:

```typescript
// server: {
//   url: 'https://098fbad6-4e43-4a26-aed2-9f249e0763e3.lovableproject.com?forceHideBadge=true',
//   cleartext: true
// },
```

Depois rode novamente:
```bash
npm run build
npx cap sync
```

## Comandos Úteis

- **Atualizar plataformas nativas:** `npx cap update`
- **Ver logs do Android:** `npx cap run android -l`
- **Ver logs do iOS:** `npx cap run ios -l`
- **Limpar e rebuild:** `npm run build && npx cap sync`

## Troubleshooting

Se encontrar problemas:
1. Certifique-se de que todas as dependências estão instaladas
2. Rode `npx cap doctor` para diagnosticar problemas
3. Limpe o build: `npm run build && npx cap sync`

## Recursos Adicionais

- [Documentação Oficial do Capacitor](https://capacitorjs.com/docs)
- [Guia de Publicação Android](https://developer.android.com/studio/publish)
- [Guia de Publicação iOS](https://developer.apple.com/ios/submit/)
- [Blog Lovable sobre Mobile](https://lovable.dev/blogs)

## Importante

Após qualquer mudança no código:
1. Faça `git pull` do seu repositório
2. Execute `npm run build`
3. Execute `npx cap sync`
4. Reabra o projeto no Android Studio ou Xcode
