# 🚀 Quick Start: FCM V1 API

## ⚡ Configuração Rápida (5 minutos)

### 1. Baixar Service Account JSON

1. Firebase Console > Project Settings > Service Accounts
2. Clique em **"Generate new private key"**
3. Baixe o arquivo JSON

### 2. Configurar no Supabase

1. Supabase Dashboard > Settings > Edge Functions > Secrets
2. Adicione:
   - **Nome**: `FCM_SERVICE_ACCOUNT_JSON`
   - **Valor**: Cole o conteúdo completo do JSON baixado

### 3. Pronto! ✅

A API V1 já está habilitada por padrão. Não precisa ativar nada!

## ❓ Por que não funciona a API legada?

A API legada foi **descontinuada** pelo Firebase. A API V1 é:
- ✅ Mais segura
- ✅ Recomendada pelo Firebase
- ✅ Já está habilitada por padrão
- ✅ Não será descontinuada

## 📚 Documentação Completa

- **Setup completo**: `docs/firebase-fcm-v1-setup.md`
- **Melhores práticas**: `docs/push-notifications-best-practices.md`

