# Sistema de Impersonação Administrativa - Guia de Implantação

## ✅ Lista de Verificação Completa

### 1. Confirmação de Funcionalidade
- ✅ **Sistema permite admin "impersonar" usuários** 
- ✅ **Gera magic link para login automático**
- ✅ **Edita perfil de usuário (nome, telefone, idioma, moeda, fuso)**
- ✅ **Auditoria completa de todas as alterações**

### 2. Estrutura Implementada
- ✅ **RPC `admin_generate_magic_link`**: Valida admin e prepara dados
- ✅ **RPC `admin_update_user_profile`**: Permite edição de perfis com auditoria  
- ✅ **Edge Function `impersonate-user`**: Gera magic link após validação
- ✅ **Tabela `poupeja_user_audit`**: Registra todas as alterações administrativas

### 3. Esquema Adaptado
- ✅ **Usa `poupeja_users`** (não `accounts`)
- ✅ **Integrado com `user_roles` existente**
- ✅ **Compatible com funções `check_user_role` e `is_admin`** 

## 🚀 Como Implantar

### Passo 1: Executar SQL (OBRIGATÓRIO)
Execute o arquivo `docs/admin-impersonation-setup.sql` no seu Supabase:

1. Abra o **Supabase Dashboard**
2. Vá para **SQL Editor**
3. Cole o conteúdo de `admin-impersonation-setup.sql`
4. Execute (Run)

### Passo 2: Reimplantar Edge Functions
A Edge Function `impersonate-user` foi atualizada e precisa ser reimplantada:

```bash
# Via Supabase CLI
supabase functions deploy impersonate-user

# Ou via UI do Supabase
```

## 🧪 Como Testar

### Teste 1: Magic Link para Login
```bash
# Teste local (após supabase start)
curl -X POST http://localhost:54321/functions/v1/impersonate-user \
  -H "Authorization: Bearer SEU_JWT_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"email": "rafael@app.com"}'
```

**Resposta esperada:**
```json
{
  "success": true,
  "loginUrl": "https://...magic-link-url...",
  "user_data": {
    "id": "uuid-do-usuario",
    "email": "rafael@app.com", 
    "name": "Nome do Usuario"
  },
  "message": "Link de login gerado com sucesso"
}
```

### Teste 2: Editar Perfil de Usuário
```sql
-- No SQL Editor do Supabase
SELECT public.admin_update_user_profile(
  'uuid-do-usuario-alvo',
  'Novo Nome Completo',        -- new_full_name
  '+5511999999999',           -- new_phone  
  'en',                       -- new_preferred_language
  'USD',                      -- new_preferred_currency
  'America/New_York'          -- new_timezone
);
```

### Teste 3: Verificar Auditoria
```sql
-- Ver logs de auditoria
SELECT * FROM public.poupeja_user_audit 
WHERE user_id = 'uuid-do-usuario-alvo'
ORDER BY created_at DESC;
```

## 🔐 Segurança Implementada

### Validações de Admin
- ✅ **JWT obrigatório** na Edge Function
- ✅ **Verificação de role 'admin'** via `check_user_role`
- ✅ **RLS habilitado** em todas as tabelas
- ✅ **SECURITY DEFINER** nos RPCs

### Auditoria Completa
- ✅ **Registra quem** fez a alteração (admin_user_id)
- ✅ **Registra quando** (timestamp automático)
- ✅ **Registra o que** mudou (campo, valor antigo/novo)
- ✅ **Tipo de ação** (IMPERSONATE)

## 📋 Payload da Edge Function

### Request
```json
{
  "email": "usuario@exemplo.com"
}
```

### Response (Sucesso)
```json
{
  "success": true,
  "loginUrl": "https://gpttodmpflpzhbgzagcc.supabase.co/auth/v1/verify?...",
  "user_data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@exemplo.com",
    "name": "Nome do Usuario"
  },
  "message": "Link de login gerado com sucesso"
}
```

### Response (Erro)
```json
{
  "error": "Usuário não encontrado com email: invalid@example.com"
}
```

## 🛠️ Comandos de Implantação

### Via CLI (Recomendado)
```bash
# 1. Fazer login
supabase login

# 2. Linkar projeto (se ainda não linkado)  
supabase link --project-ref SUA_REF_DO_PROJETO

# 3. Aplicar SQL (execute manualmente no dashboard)
# Copie docs/admin-impersonation-setup.sql e execute no SQL Editor

# 4. Reimplantar Edge Function
supabase functions deploy impersonate-user
```

### Via Dashboard
1. **SQL**: Copie `admin-impersonation-setup.sql` → SQL Editor → Execute
2. **Edge Functions**: Vá para Functions → Redeploy `impersonate-user`

## ⚠️ Considerações Importantes

### Dados Sensíveis
- Magic links dão **acesso completo** à conta do usuário
- Use **apenas em ambiente seguro** 
- Links têm **expiração automática**

### Auditoria
- Todos os logs ficam em `poupeja_user_audit`
- **Apenas admins** podem visualizar logs
- Registra **tentativas de acesso** via magic link

### Performance
- Índices criados automaticamente em `poupeja_user_audit`
- RPCs otimizados com `SECURITY DEFINER`

## 🎯 Próximos Passos

1. ✅ Execute o SQL em `docs/admin-impersonation-setup.sql`
2. ✅ Reimplante a Edge Function `impersonate-user`  
3. ✅ Teste com um usuário real
4. ✅ Verifique logs de auditoria
5. ✅ Configure monitoramento (opcional)

---

**Pronto para usar!** 🚀 

O sistema está totalmente adaptado ao seu esquema `poupeja_*` com auditoria completa e segurança robusta.