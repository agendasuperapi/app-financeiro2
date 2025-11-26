# 🔥 Configuração do Firebase Cloud Messaging (FCM)

Este guia explica como configurar o Firebase Cloud Messaging para notificações push em Web, Android e iOS.

## 📋 Pré-requisitos

1. Conta no [Firebase Console](https://console.firebase.google.com/)
2. Projeto Firebase criado
3. Acesso ao projeto no Supabase

## 🚀 Passo a Passo

### 1. Criar/Configurar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto" ou selecione um projeto existente
3. Siga o assistente de criação

### 2. Adicionar App Web ao Firebase

1. No Firebase Console, clique no ícone de Web (`</>`)
2. Registre seu app com um nome (ex: "App Financeiro Web")
3. **Copie as credenciais** que aparecerão (firebaseConfig)
4. Você verá algo como:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "seu-projeto.firebaseapp.com",
     projectId: "seu-projeto-id",
     storageBucket: "seu-projeto.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

### 3. Configurar FCM para Web

1. No Firebase Console, vá em **Project Settings** (ícone de engrenagem)
2. Vá na aba **Cloud Messaging**
3. Em **Web Push certificates**, clique em **Generate key pair**
4. **Copie a chave VAPID** gerada (será algo como: `BEl...`)

### 4. Obter Service Account JSON (Para API V1 - Recomendado)

**IMPORTANTE:** O Firebase agora recomenda usar a **API V1** em vez da API legada. A API legada não precisa ser ativada.

1. No Firebase Console, vá em **Project Settings > Service Accounts**
2. Clique em **Generate new private key**
3. **Baixe o arquivo JSON** completo
4. Você precisará do conteúdo completo deste JSON para configurar no Supabase

**Nota:** Se você preferir usar a API legada (não recomendado), consulte `docs/firebase-fcm-v1-setup.md` para instruções da API V1.

### 5. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Firebase VAPID Key (para Web Push)
VITE_FIREBASE_VAPID_KEY=BEl...
```

### 6. Configurar Secrets no Supabase

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Settings > Edge Functions > Secrets**
3. Adicione o seguinte secret:
   - **Nome**: `FCM_SERVICE_ACCOUNT_JSON`
   - **Valor**: Cole o **conteúdo completo do arquivo JSON** que você baixou no passo 4
   
   **Importante:** Cole o JSON completo, incluindo todas as chaves e valores. Deve começar com `{` e terminar com `}`.

**Para mais detalhes sobre a API V1, consulte:** `docs/firebase-fcm-v1-setup.md`

### 7. Configurar Firebase para Android (Opcional - se usar APK)

1. No Firebase Console, adicione um app Android
2. Baixe o arquivo `google-services.json`
3. Coloque em `android/app/google-services.json`
4. Configure o `build.gradle` (já deve estar configurado)

### 8. Configurar Firebase para iOS (Opcional - se usar iOS)

1. No Firebase Console, adicione um app iOS
2. Baixe o arquivo `GoogleService-Info.plist`
3. Configure no Xcode

## ✅ Verificação

Após configurar:

1. **Teste no navegador:**
   - Abra o app
   - Vá em Configurações > Notificações
   - Clique em "Ativar notificações"
   - Deve aparecer um prompt pedindo permissão
   - Após permitir, o token deve ser salvo

2. **Teste enviando notificação:**
   - Use o botão "Enviar notificação de teste"
   - Deve receber a notificação

3. **Verificar logs:**
   - Abra o console do navegador
   - Deve ver logs como: "✅ Token FCM obtido"
   - Verifique no Supabase se o token foi salvo na tabela `notification_tokens`

## 🔍 Troubleshooting

### Erro: "Firebase Messaging não está configurado"
- Verifique se todas as variáveis `VITE_FIREBASE_*` estão no `.env.local`
- Reinicie o servidor de desenvolvimento após adicionar variáveis

### Erro: "FCM_SERVER_KEY não configurada"
- Verifique se o secret foi adicionado no Supabase
- Certifique-se de que o nome está exatamente: `FCM_SERVER_KEY`

### Notificações não aparecem
- Verifique se o navegador suporta notificações
- Verifique se a permissão foi concedida
- Verifique os logs do console
- Verifique se o token está salvo no banco

### Service Worker não registra
- Verifique se o arquivo `sw.js` está na pasta `public/`
- Verifique o console do navegador para erros
- Limpe o cache do navegador

## 📚 Recursos

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [FCM para Web](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)

## 🎯 Próximos Passos

Após configurar:
1. Teste as notificações em diferentes navegadores
2. Configure notificações automáticas (cron job)
3. Personalize as notificações conforme necessário

