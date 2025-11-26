# 🔍 Verificar Sistema de Notificações

## Passo 1: Verificar se há tokens salvos

Execute no SQL Editor do Supabase:

```sql
-- Ver todos os tokens de notificação
SELECT 
  id,
  user_id,
  platform,
  LEFT(token, 50) as token_preview,
  created_at
FROM notification_tokens
ORDER BY created_at DESC;
```

## Passo 2: Verificar lembretes pendentes

```sql
-- Ver lembretes que deveriam notificar
SELECT 
  id,
  user_id,
  name,
  description,
  date,
  status,
  notification_sent,
  last_notification_at,
  created_at
FROM tbl_lembrete
WHERE status = 'pending'
  AND notification_sent = false
ORDER BY date DESC;
```

## Passo 3: Ver logs da edge function

1. Acesse Supabase Dashboard
2. Vá em Edge Functions > check-reminders
3. Clique em "Logs" para ver a execução
4. Procure por:
   - "📋 Encontrados X lembretes para notificar"
   - "✅ Notificação enviada"
   - Erros com ❌

## Passo 4: Testar notificação manualmente

Execute no SQL Editor:

```sql
-- Forçar notificação de um lembrete específico
SELECT net.http_post(
  url := 'https://gpttodmpflpzhbgzagcc.supabase.co/functions/v1/send-notification',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdHRvZG1wZmxwemhiZ3phZ2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNzU2MTcsImV4cCI6MjA3MDg1MTYxN30.Ro2k_slVwV7hsGDM1YNcNP3csi876LPuAwFSBpxJN2I'
  ),
  body := jsonb_build_object(
    'userId', 'SEU_USER_ID_AQUI',
    'title', '💰 Teste de Notificação',
    'body', 'Esta é uma notificação de teste',
    'data', jsonb_build_object('test', true)
  )
) as request_id;
```

## Passo 5: Verificar permissões no navegador

No navegador:
1. Abra as Ferramentas do Desenvolvedor (F12)
2. Vá em Console
3. Digite: `Notification.permission`
4. Deve retornar `"granted"`

Se retornar `"denied"` ou `"default"`:
1. Vá nas configurações do site (ícone de cadeado na barra de endereços)
2. Procure por "Notificações"
3. Mude para "Permitir"

## Passo 6: Verificar Service Worker

No Console do navegador:
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  if (reg) {
    console.log('✅ Service Worker registrado:', reg);
    reg.pushManager.getSubscription().then(sub => {
      console.log('📱 Subscription:', sub);
    });
  } else {
    console.log('❌ Service Worker não registrado');
  }
});
```

## Checklist de Troubleshooting

- [ ] **Tokens salvos**: Há registros na tabela `notification_tokens`?
- [ ] **Lembretes válidos**: Há lembretes com data passada e `notification_sent = false`?
- [ ] **Chaves VAPID**: As chaves estão configuradas nos Secrets do Supabase?
  - VAPID_PUBLIC_KEY
  - VAPID_PRIVATE_KEY
  - VAPID_EMAIL (opcional)
- [ ] **Permissão**: O navegador tem permissão de notificação concedida?
- [ ] **Service Worker**: Está registrado e ativo?
- [ ] **Logs**: Os logs mostram tentativas de envio?

## Chaves VAPID

Se as chaves VAPID não estiverem configuradas:

1. Gere as chaves (uma vez só):
```bash
npx web-push generate-vapid-keys
```

2. No Supabase Dashboard:
   - Vá em Project Settings > Edge Functions > Secrets
   - Adicione:
     - `VAPID_PUBLIC_KEY`: [sua chave pública]
     - `VAPID_PRIVATE_KEY`: [sua chave privada]
     - `VAPID_EMAIL`: mailto:seu@email.com

## Problemas Comuns

### 1. "Nenhum token de notificação encontrado"
**Solução**: Usuário precisa ativar notificações no app (Configurações > Notificações)

### 2. "Chaves VAPID não configuradas"
**Solução**: Gere e configure as chaves VAPID nos Secrets

### 3. Notificação não aparece mesmo com token salvo
**Solução**: 
- Verifique se o navegador não está em modo "Não perturbe"
- Verifique se o site não está com notificações bloqueadas
- Tente forçar o teste com o SQL do Passo 4
