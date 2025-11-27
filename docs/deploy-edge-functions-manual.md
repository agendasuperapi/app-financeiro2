# 🚀 Deploy Manual das Edge Functions

## ⚡ Deploy Rápido (CLI do Supabase)

### Pré-requisitos

1. Instalar Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Fazer login:
   ```bash
   supabase login
   ```

3. Linkar ao projeto:
   ```bash
   supabase link --project-ref gpttodmpflpzhbgzagcc
   ```

### Deploy das Funções Atualizadas

```bash
# Deploy da função check-reminders (corrigida)
supabase functions deploy check-reminders --project-ref gpttodmpflpzhbgzagcc

# Deploy da função send-notification
supabase functions deploy send-notification --project-ref gpttodmpflpzhbgzagcc
```

## 🔄 Deploy via GitHub Actions (Automático)

Se você já tem o workflow configurado:

1. **Commit e push das mudanças:**
   ```bash
   git add supabase/functions/check-reminders/index.ts
   git commit -m "Corrige autenticação ao chamar send-notification"
   git push
   ```

2. **O workflow irá fazer deploy automaticamente** quando detectar mudanças em `supabase/functions/**`

3. **Ou execute manualmente:**
   - GitHub > Actions > "Complete Supabase Deployment"
   - Clique em "Run workflow"
   - Deixe as opções padrão
   - Clique em "Run workflow"

## ✅ Verificar Deploy

Após o deploy, verifique:

1. **No Supabase Dashboard:**
   - Edge Functions > check-reminders
   - Clique em "Logs"
   - Procure por execuções recentes

2. **Teste manualmente:**
   - Execute o cron job ou aguarde a próxima execução
   - Verifique se não há mais erro 401

## 🔍 Troubleshooting

### Erro: "Project not linked"
```bash
supabase link --project-ref gpttodmpflpzhbgzagcc
```

### Erro: "Not authenticated"
```bash
supabase login
```

### Verificar se o deploy foi bem-sucedido
```bash
supabase functions list --project-ref gpttodmpflpzhbgzagcc
```

