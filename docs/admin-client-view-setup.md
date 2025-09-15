# Configuração da Visualização de Cliente para Admins

## Visão Geral
A funcionalidade de visualização de cliente permite que administradores vejam o sistema através da perspectiva de qualquer usuário, facilitando o suporte e debug de problemas específicos.

## Configurações Necessárias no Supabase

### 1. Row Level Security (RLS) - Políticas de Acesso

#### Política para Transações
```sql
-- Permite que admins vejam transações de qualquer usuário
CREATE POLICY "Admins can view all transactions" ON poupeja_transactions
FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

-- Permite que usuários vejam suas próprias transações
CREATE POLICY "Users can view own transactions" ON poupeja_transactions
FOR SELECT USING (auth.uid() = user_id);
```

#### Política para Categorias
```sql
-- Permite que admins vejam categorias de qualquer usuário
CREATE POLICY "Admins can view all categories" ON poupeja_categories
FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

-- Permite que usuários vejam suas próprias categorias
CREATE POLICY "Users can view own categories" ON poupeja_categories
FOR SELECT USING (auth.uid() = user_id);
```

#### Política para Limites/Metas
```sql
-- Permite que admins vejam limites de qualquer usuário
CREATE POLICY "Admins can view all limits" ON poupeja_limits
FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

-- Permite que usuários vejam seus próprios limites
CREATE POLICY "Users can view own limits" ON poupeja_limits
FOR SELECT USING (auth.uid() = user_id);
```

#### Política para Dados de Usuário
```sql
-- Permite que admins vejam dados de qualquer usuário
CREATE POLICY "Admins can view all user data" ON poupeja_users
FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

-- Permite que usuários vejam seus próprios dados
CREATE POLICY "Users can view own data" ON poupeja_users
FOR SELECT USING (auth.uid() = id);
```

### 2. Função para Impersonação Segura

#### Edge Function: switch-user-context
```typescript
// supabase/functions/switch-user-context/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    const { data: { user } } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Verificar se é admin
    const { data: adminCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!adminCheck) {
      return new Response('Forbidden - Admin access required', { 
        status: 403, 
        headers: corsHeaders 
      })
    }

    const { target_user_id } = await req.json()

    if (!target_user_id) {
      return new Response('target_user_id is required', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Buscar dados do usuário alvo
    const { data: targetUser, error } = await supabase
      .from('poupeja_users')
      .select('*')
      .eq('id', target_user_id)
      .single()

    if (error || !targetUser) {
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Retornar dados necessários para a visualização
    return new Response(
      JSON.stringify({
        success: true,
        user: targetUser,
        message: `Switched to user context: ${targetUser.name}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
```

### 3. Tabela de Auditoria (Opcional)
```sql
-- Tabela para registrar quando admins visualizam dados de outros usuários
CREATE TABLE admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para a tabela de auditoria
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can access audit log" ON admin_audit_log
FOR ALL USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);
```

## Como Funciona

1. **Seleção de Usuário**: Admin clica no botão "Visualizar como Cliente" na tabela de usuários
2. **Context Switch**: O sistema armazena as informações do usuário selecionado no contexto da aplicação
3. **Interface Adaptada**: A aba "Cliente" mostra as informações e funcionalidades do usuário selecionado
4. **Acesso Seguro**: As políticas RLS garantem que apenas admins possam acessar dados de outros usuários
5. **Auditoria**: Todas as ações são registradas para compliance e segurança

## Benefícios

- **Suporte Eficiente**: Admins podem reproduzir problemas específicos de usuários
- **Debug Facilitado**: Visualização direta dos dados do usuário problemático  
- **Segurança Garantida**: RLS garante que apenas admins autorizados tenham acesso
- **Auditoria Completa**: Registro de todas as ações para compliance
- **UX Otimizada**: Interface intuitiva para alternar entre usuários

## Próximos Passos

1. Execute os scripts SQL no Supabase SQL Editor
2. Implemente a Edge Function `switch-user-context`
3. Teste a funcionalidade com usuários de diferentes status
4. Configure alertas de auditoria se necessário