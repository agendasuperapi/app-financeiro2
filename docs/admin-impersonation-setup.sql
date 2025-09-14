-- ========================================================================
-- SISTEMA DE IMPERSONAÇÃO ADMINISTRATIVA
-- Data: 2025-09-14
-- Descrição: RPC e auditoria para admins editarem perfis de usuários
-- ========================================================================

-- 1. TABELA DE AUDITORIA PARA ALTERAÇÕES DE PERFIL
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.poupeja_user_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.poupeja_users(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  action TEXT NOT NULL CHECK (action IN ('UPDATE', 'IMPERSONATE')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.poupeja_user_audit ENABLE ROW LEVEL SECURITY;

-- Política: apenas admins podem visualizar logs de auditoria
CREATE POLICY "Only admins can view user audit logs" ON public.poupeja_user_audit
  FOR SELECT USING (public.is_admin());

-- 2. RPC PARA ADMIN EDITAR PERFIL DE USUÁRIO
-- ========================================================================
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  target_user_id UUID,
  new_full_name TEXT DEFAULT NULL,
  new_phone TEXT DEFAULT NULL,
  new_preferred_language TEXT DEFAULT NULL,
  new_preferred_currency TEXT DEFAULT NULL,
  new_timezone TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id UUID;
  old_record RECORD;
  updated_record RECORD;
  changes_made INTEGER := 0;
BEGIN
  -- Verificar se o usuário que está fazendo a chamada é admin
  admin_id := auth.uid();
  
  IF NOT public.is_admin(admin_id) THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é administrador';
  END IF;

  -- Verificar se o usuário alvo existe
  SELECT * INTO old_record FROM public.poupeja_users WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', target_user_id;
  END IF;

  -- Preparar UPDATE apenas com campos não-nulos
  UPDATE public.poupeja_users 
  SET 
    full_name = COALESCE(new_full_name, full_name),
    phone = COALESCE(new_phone, phone),
    preferred_language = COALESCE(new_preferred_language, preferred_language),
    preferred_currency = COALESCE(new_preferred_currency, preferred_currency),
    timezone = COALESCE(new_timezone, timezone),
    updated_at = NOW()
  WHERE id = target_user_id
  RETURNING * INTO updated_record;

  -- Registrar mudanças na auditoria
  IF new_full_name IS NOT NULL AND old_record.full_name IS DISTINCT FROM new_full_name THEN
    INSERT INTO public.poupeja_user_audit (user_id, admin_user_id, field_name, old_value, new_value, action)
    VALUES (target_user_id, admin_id, 'full_name', old_record.full_name, new_full_name, 'IMPERSONATE');
    changes_made := changes_made + 1;
  END IF;

  IF new_phone IS NOT NULL AND old_record.phone IS DISTINCT FROM new_phone THEN
    INSERT INTO public.poupeja_user_audit (user_id, admin_user_id, field_name, old_value, new_value, action)
    VALUES (target_user_id, admin_id, 'phone', old_record.phone, new_phone, 'IMPERSONATE');
    changes_made := changes_made + 1;
  END IF;

  IF new_preferred_language IS NOT NULL AND old_record.preferred_language IS DISTINCT FROM new_preferred_language THEN
    INSERT INTO public.poupeja_user_audit (user_id, admin_user_id, field_name, old_value, new_value, action)
    VALUES (target_user_id, admin_id, 'preferred_language', old_record.preferred_language, new_preferred_language, 'IMPERSONATE');
    changes_made := changes_made + 1;
  END IF;

  IF new_preferred_currency IS NOT NULL AND old_record.preferred_currency IS DISTINCT FROM new_preferred_currency THEN
    INSERT INTO public.poupeja_user_audit (user_id, admin_user_id, field_name, old_value, new_value, action)
    VALUES (target_user_id, admin_id, 'preferred_currency', old_record.preferred_currency, new_preferred_currency, 'IMPERSONATE');
    changes_made := changes_made + 1;
  END IF;

  IF new_timezone IS NOT NULL AND old_record.timezone IS DISTINCT FROM new_timezone THEN
    INSERT INTO public.poupeja_user_audit (user_id, admin_user_id, field_name, old_value, new_value, action)
    VALUES (target_user_id, admin_id, 'timezone', old_record.timezone, new_timezone, 'IMPERSONATE');
    changes_made := changes_made + 1;
  END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', target_user_id,
    'admin_id', admin_id,
    'changes_made', changes_made,
    'updated_data', row_to_json(updated_record),
    'message', format('Perfil do usuário atualizado com sucesso. %s alterações feitas.', changes_made)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Erro ao atualizar perfil do usuário'
    );
END;
$$;

-- 3. RPC PARA GERAR MAGIC LINK (para impersonação de login)
-- ========================================================================
CREATE OR REPLACE FUNCTION public.admin_generate_magic_link(
  target_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id UUID;
  target_user RECORD;
BEGIN
  -- Verificar se o usuário que está fazendo a chamada é admin
  admin_id := auth.uid();
  
  IF NOT public.is_admin(admin_id) THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é administrador';
  END IF;

  -- Verificar se o usuário alvo existe
  SELECT u.id, u.email, pu.full_name 
  INTO target_user 
  FROM auth.users u
  JOIN public.poupeja_users pu ON u.id = pu.id
  WHERE u.email = target_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado com email: %', target_email;
  END IF;

  -- Registrar tentativa de impersonação na auditoria
  INSERT INTO public.poupeja_user_audit (user_id, admin_user_id, field_name, old_value, new_value, action)
  VALUES (target_user.id, admin_id, 'login_impersonate', NULL, 'Magic link gerado', 'IMPERSONATE');

  RETURN json_build_object(
    'success', true,
    'user_id', target_user.id,
    'user_email', target_user.email,
    'user_name', target_user.full_name,
    'admin_id', admin_id,
    'message', 'Dados do usuário preparados para geração de magic link'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Erro ao preparar dados para magic link'
    );
END;
$$;

-- 4. ÍNDICES PARA PERFORMANCE
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_poupeja_user_audit_user_id ON public.poupeja_user_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_poupeja_user_audit_admin_user_id ON public.poupeja_user_audit(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_poupeja_user_audit_created_at ON public.poupeja_user_audit(created_at DESC);

-- 5. COMENTÁRIOS
-- ========================================================================
COMMENT ON TABLE public.poupeja_user_audit IS 'Tabela de auditoria para rastrear alterações administrativas nos perfis de usuários';
COMMENT ON FUNCTION public.admin_update_user_profile IS 'Permite que administradores editem perfis de usuários com auditoria completa';
COMMENT ON FUNCTION public.admin_generate_magic_link IS 'Prepara dados para geração de magic link de impersonação por administradores';