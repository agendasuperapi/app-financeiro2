# 🔥 Configuração FCM V1 API (Recomendado)

O Firebase agora recomenda usar a **API V1** em vez da API legada. Esta é a configuração correta.

## 📋 Passo a Passo

### 1. Obter Service Account JSON

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Vá em **Project Settings** (ícone de engrenagem)
3. Vá na aba **Service Accounts**
4. Clique em **Generate new private key**
5. **Baixe o arquivo JSON** (será algo como `firebase-adminsdk-xxxxx.json`)

### 2. Configurar Secret no Supabase

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Settings > Edge Functions > Secrets**
3. Adicione um novo secret:
   - **Nome**: `FCM_SERVICE_ACCOUNT_JSON`
   - **Valor**: Cole o **conteúdo completo do arquivo JSON** que você baixou
   
   **Exemplo do conteúdo:**
   ```json
   {
     "type": "service_account",
     "project_id": "seu-projeto-id",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "..."
   }
   ```

### 3. Verificar API V1 está Habilitada

1. No Firebase Console, vá em **Project Settings > Cloud Messaging**
2. Verifique se a **API de mensagens em nuvem do Firebase (V1)** está **Habilitada** (deve estar com ✓ verde)
3. Se não estiver, ela já deve estar habilitada por padrão

### 4. Configurar Variáveis de Ambiente (Frontend)

Crie/atualize `.env.local`:

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

**Como obter:**
- Firebase Console > Project Settings > General > Your apps > Web app
- Para VAPID: Project Settings > Cloud Messaging > Web Push certificates

## ✅ Verificação

Após configurar:

1. **Teste no navegador:**
   - Abra o app
   - Vá em Configurações > Notificações
   - Ative notificações
   - Deve funcionar sem erros

2. **Teste enviando notificação:**
   - Use o botão "Enviar notificação de teste"
   - Deve receber a notificação

3. **Verificar logs:**
   - Console do navegador: "✅ Token FCM obtido"
   - Logs da Edge Function no Supabase: "✅ FCM V1 enviado"

## 🔍 Troubleshooting

### Erro: "FCM_SERVICE_ACCOUNT_JSON não configurada"
- Verifique se o secret foi adicionado no Supabase
- Certifique-se de que o nome está exatamente: `FCM_SERVICE_ACCOUNT_JSON`
- Verifique se o JSON está completo (copie todo o conteúdo do arquivo)

### Erro: "Erro ao obter access token"
- Verifique se o JSON do service account está correto
- Verifique se a chave privada está completa (com `\n` preservados)
- Verifique se o projeto tem a API V1 habilitada

### Erro: "project_id não encontrado"
- Verifique se o JSON do service account contém o campo `project_id`
- O JSON deve ser o arquivo completo baixado do Firebase

### API V1 não está habilitada
- A API V1 geralmente já vem habilitada por padrão
- Se não estiver, você pode habilitar em: Google Cloud Console > APIs & Services > Firebase Cloud Messaging API

## 📚 Diferenças entre API Legada e V1

### API Legada (Descontinuada)
- Endpoint: `https://fcm.googleapis.com/fcm/send`
- Autenticação: Server Key (`key=AAAA...`)
- Status: Descontinuada em 20/06/2023

### API V1 (Recomendada) ✅
- Endpoint: `https://fcm.googleapis.com/v1/projects/{project_id}/messages:send`
- Autenticação: OAuth2 com Service Account
- Status: Recomendada e ativa

## 🎯 Vantagens da API V1

✅ Mais segura (OAuth2)  
✅ Melhor controle de acesso  
✅ Suporte a recursos mais avançados  
✅ Recomendada pelo Firebase  
✅ Não será descontinuada  

---

**Importante:** A API legada não precisa ser ativada. Use a API V1 que já está habilitada! 🚀

