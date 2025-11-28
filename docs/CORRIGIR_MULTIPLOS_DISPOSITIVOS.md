# 🔧 Corrigir Sistema de Notificações para Múltiplos Dispositivos

## 🐛 Problema Identificado

**Antes:** 
- Constraint `UNIQUE(user_id, platform)` na tabela `notification_tokens`
- Cada usuário podia ter apenas 1 token por plataforma (Android, iOS, Web)
- Se ativasse notificações em 2 celulares Android, o segundo **substituía** o primeiro
- **Resultado:** Apenas o último dispositivo recebia notificações

**Exemplo do problema:**
1. Usuário ativa notificações no Celular A (Android) ✅
2. Usuário ativa notificações no Celular B (Android) ✅
3. Token do Celular A é **substituído** ❌
4. Apenas Celular B recebe notificações

## ✅ Solução Implementada

**Agora:**
- Constraint `UNIQUE(token)` - cada token FCM é único
- Permite múltiplos dispositivos por usuário e plataforma
- Cada dispositivo gera um `device_id` único salvo no `localStorage`
- Todos os dispositivos recebem notificações
- UI mostra quantos dispositivos estão conectados

## 📋 Passos para Aplicar a Correção

### 1️⃣ Executar SQL no Supabase

**Vá em:** Supabase Dashboard > SQL Editor > New Query

**Cole e execute o arquivo:** `docs/fix-multiple-devices-notification.sql`

Este SQL irá:
- ✅ Remover constraints antigas
- ✅ Limpar tokens duplicados (mantém o mais recente)
- ✅ Adicionar constraint `UNIQUE(token)`
- ✅ Adicionar colunas `device_id` e `last_used`
- ✅ Criar índices para performance

### 2️⃣ Testar no Web (Imediato)

As alterações no código já estão aplicadas. Para testar:

1. **Abra em 2 navegadores diferentes** (Chrome e Firefox, por exemplo)
2. **Faça login** em ambos
3. **Ative notificações** em ambos (Configurações > Notificações)
4. Você verá: **"📱 Dispositivos conectados: 2 dispositivos"**
5. **Crie um lembrete** para testar
6. **Ambos os navegadores** devem receber notificação

### 3️⃣ Gerar Novo APK (GitHub Actions)

O código do app já foi atualizado com:
- ✅ Geração de `device_id` único para cada dispositivo
- ✅ `onConflict: 'token'` no upsert (permite múltiplos dispositivos)
- ✅ Verificação por `device_id` (não bloqueia novos dispositivos)
- ✅ Campo `last_used` atualizado automaticamente

**Para gerar novo APK:**
1. Faça commit das mudanças no GitHub
2. Execute a GitHub Action de build do Android
3. Baixe e instale o novo APK

### 4️⃣ Testar no APK

1. **Instale o novo APK** em 2 celulares diferentes
2. **Ative notificações** em ambos (Configurações > Notificações)
3. **Verifique no banco:**
   ```sql
   SELECT 
     user_id,
     platform,
     device_id,
     LEFT(token, 30) as token_preview,
     last_used,
     created_at
   FROM notification_tokens
   WHERE user_id = 'SEU_USER_ID'
   ORDER BY created_at DESC;
   ```
4. Você deve ver **2 linhas** (uma por celular)
5. **Crie um lembrete** 
6. **Ambos os celulares** devem receber notificação 🎉

## 🎯 Benefícios

- ✅ Múltiplos celulares Android recebem notificações
- ✅ Múltiplos navegadores Web recebem notificações
- ✅ Múltiplos iPhones recebem notificações
- ✅ Combinações (2 Androids + 1 iPhone + 2 Webs) funcionam
- ✅ Cada dispositivo tem ID único para tracking
- ✅ Campo `last_used` permite limpar tokens inativos
- ✅ UI mostra quantos dispositivos estão conectados

## 🔍 Como Verificar se Funcionou

### No Banco de Dados (Supabase SQL Editor):

```sql
-- Ver todos os dispositivos por usuário
SELECT 
  user_id,
  platform,
  device_id,
  LEFT(token, 30) as token_preview,
  last_used,
  created_at
FROM notification_tokens
ORDER BY user_id, created_at DESC;

-- Contar dispositivos por usuário
SELECT 
  user_id,
  platform,
  COUNT(*) as num_dispositivos
FROM notification_tokens
GROUP BY user_id, platform
ORDER BY num_dispositivos DESC;
```

### No App (Configurações > Notificações):

- Se tudo funcionou, você verá: **"📱 Dispositivos conectados: X dispositivos"**
- Cada dispositivo que ativar notificações aumentará este número

## 🧹 Limpeza de Tokens Antigos (Opcional)

Para remover tokens não usados há mais de 90 dias:

```sql
DELETE FROM notification_tokens
WHERE last_used < NOW() - INTERVAL '90 days';
```

Pode configurar um cron job Supabase para executar isto automaticamente.

## 🐞 Troubleshooting

### "Notificações já estão ativas" mas não recebo notificação

**Causa:** Token antigo salvo antes da migração SQL.

**Solução:**
1. Desative notificações neste dispositivo
2. Execute o SQL de limpeza
3. Ative notificações novamente

### Erro "constraint notification_tokens_token_key already exists"

**Causa:** SQL já foi executado antes.

**Solução:** Use o SQL completo em `fix-multiple-devices-notification.sql` que já faz `DROP IF EXISTS` antes de recriar.

### Dispositivos não aparecem na contagem

**Causa:** Migração SQL não foi executada.

**Solução:** Execute o arquivo `fix-multiple-devices-notification.sql` no SQL Editor do Supabase.

## 📊 Arquivos Modificados

1. ✅ `docs/fix-multiple-devices-notification.sql` - SQL de migração
2. ✅ `src/services/notificationService.ts` - Web push com device_id
3. ✅ `src/hooks/usePushNotifications.ts` - Mobile push com device_id
4. ✅ `src/components/settings/NotificationSettings.tsx` - UI com contador

## 🎉 Resultado Final

Agora você pode:
- ✅ Ativar notificações em **quantos dispositivos quiser**
- ✅ Receber lembretes em **todos eles simultaneamente**
- ✅ Ver **quantos dispositivos estão conectados** na UI
- ✅ Desativar **dispositivos individuais** sem afetar os outros
