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

**Por isso funcionava no Web mas não no APK** - você ativou no web por último!

## ✅ Solução Implementada

**Agora:**
- Constraint `UNIQUE(token)` - cada token é único
- Permite múltiplos dispositivos por usuário e plataforma
- Cada dispositivo gera um `device_id` único
- Todos os dispositivos recebem notificações

## 📋 Passos para Aplicar a Correção

### 1️⃣ Executar SQL no Supabase

**Vá em:** Supabase Dashboard > SQL Editor > New Query

**Cole e execute:**
```sql
-- Remover constraint antiga
ALTER TABLE notification_tokens 
DROP CONSTRAINT IF EXISTS notification_tokens_user_id_platform_key;

-- Adicionar constraint no token
ALTER TABLE notification_tokens 
ADD CONSTRAINT notification_tokens_token_key UNIQUE (token);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_id 
ON notification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_tokens_platform 
ON notification_tokens(platform);

-- Adicionar campos novos
ALTER TABLE notification_tokens 
ADD COLUMN IF NOT EXISTS device_id TEXT;

ALTER TABLE notification_tokens 
ADD COLUMN IF NOT EXISTS last_used TIMESTAMPTZ DEFAULT NOW();
```

### 2️⃣ Gerar Novo APK

O código do frontend já foi atualizado para:
- Gerar um `device_id` único para cada dispositivo
- Usar `onConflict: 'token'` no upsert
- Atualizar `last_used` a cada registro

Execute via GitHub Actions para gerar o novo APK.

### 3️⃣ Testar

1. **Instale o novo APK** em 2 celulares diferentes
2. **Ative notificações** em ambos
3. **Verifique no banco:**
   ```sql
   SELECT 
     user_id,
     platform,
     device_id,
     LEFT(token, 20) as token_preview,
     last_used,
     created_at
   FROM notification_tokens
   WHERE user_id = 'SEU_USER_ID'
   ORDER BY created_at DESC;
   ```
4. Você deve ver **2 linhas** (uma por dispositivo)
5. **Crie um lembrete** para testar
6. **Ambos os celulares** devem receber a notificação

## 🎯 Benefícios

- ✅ Múltiplos celulares Android recebem notificações
- ✅ Múltiplos navegadores Web recebem notificações
- ✅ Combinações iPhone + Android funcionam
- ✅ Cada dispositivo tem ID único para tracking
- ✅ Campo `last_used` permite limpar tokens inativos

## 🧹 Limpeza de Tokens Antigos (Opcional)

Para remover tokens não usados há mais de 90 dias:

```sql
DELETE FROM notification_tokens
WHERE last_used < NOW() - INTERVAL '90 days';
```

Pode configurar um cron job para fazer isso automaticamente.

## 📊 Monitoramento

Verificar quantos dispositivos cada usuário tem registrado:

```sql
SELECT 
  user_id,
  platform,
  COUNT(*) as num_dispositivos
FROM notification_tokens
GROUP BY user_id, platform
ORDER BY num_dispositivos DESC;
```
