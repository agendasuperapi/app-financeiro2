# 🔧 Configurar FCM_SERVICE_ACCOUNT_JSON no Supabase

## 📋 Passo a Passo

### 1. Você já tem o arquivo JSON do Firebase

O arquivo `appfinanceiro-22bd4-firebase-adminsdk-fbsvc-da2414deea.json` já está baixado.

### 2. Abrir o arquivo JSON

Abra o arquivo JSON que você baixou do Firebase. Ele deve ter este formato:

```json
{
  "type": "service_account",
  "project_id": "appfinanceiro-22bd4",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@appfinanceiro-22bd4.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### 3. Copiar TODO o conteúdo do JSON

**IMPORTANTE:** Copie o conteúdo completo do arquivo JSON, incluindo:
- Todas as chaves e valores
- As chaves `{` no início e `}` no final
- O campo `private_key` completo (com todas as quebras de linha `\n`)

### 4. Configurar no Supabase

1. Acesse: [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** (ícone de engrenagem no menu lateral)
4. Clique em **Edge Functions** no menu
5. Role até a seção **Secrets**
6. Clique em **Add new secret**
7. Configure:
   - **Name**: `FCM_SERVICE_ACCOUNT_JSON`
   - **Value**: Cole o conteúdo completo do JSON (todo o arquivo)
8. Clique em **Save**

### 5. Verificar se foi salvo

Após salvar, você deve ver o secret `FCM_SERVICE_ACCOUNT_JSON` na lista de secrets.

### 6. Testar

Após configurar, teste enviando uma notificação:
- Use o botão "Enviar notificação de teste" no app
- Ou aguarde o cron job executar automaticamente

## ⚠️ Importante

- O JSON deve ser copiado **completo**, sem remover nada
- Mantenha todas as quebras de linha no `private_key`
- Não adicione espaços extras ou caracteres
- O nome do secret deve ser exatamente: `FCM_SERVICE_ACCOUNT_JSON`

## 🔍 Verificar se está funcionando

Após configurar, verifique os logs da Edge Function `send-notification`:
1. Supabase Dashboard > Edge Functions > send-notification
2. Clique em **Logs**
3. Procure por: "✅ Access token obtido" e "✅ FCM V1 enviado"

Se aparecer erro sobre "FCM_SERVICE_ACCOUNT_JSON não configurada", verifique se:
- O secret foi salvo corretamente
- O nome está exatamente como `FCM_SERVICE_ACCOUNT_JSON`
- O conteúdo do JSON está completo

