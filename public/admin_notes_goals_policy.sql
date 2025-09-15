-- EXECUTAR NO SQL EDITOR DO SUPABASE
-- Políticas RLS para permitir que administradores vejam/gerenciem dados de todos os usuários
-- nas tabelas: public.financeiro_notas e public.poupeja_goals

-- ==========================================
-- TABELA: public.financeiro_notas (Notas)
-- ==========================================
-- Garantir RLS habilitado
ALTER TABLE public.financeiro_notas ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Users can view their own notes" ON public.financeiro_notas;
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.financeiro_notas;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.financeiro_notas;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.financeiro_notas;
DROP POLICY IF EXISTS "Users can view own notes" ON public.financeiro_notas;
DROP POLICY IF EXISTS "Admin can view all notes" ON public.financeiro_notas;
DROP POLICY IF EXISTS "Users can insert own notes" ON public.financeiro_notas;
DROP POLICY IF EXISTS "Users can update own notes" ON public.financeiro_notas;
DROP POLICY IF EXISTS "Users can delete own notes" ON public.financeiro_notas;

-- Usuários visualizam apenas suas próprias notas
CREATE POLICY "Users can view own notes" ON public.financeiro_notas
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Administradores visualizam todas as notas
CREATE POLICY "Admin can view all notes" ON public.financeiro_notas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Inserção: usuário pode inserir suas notas; admin pode inserir para qualquer user_id
CREATE POLICY "Users can insert own notes" ON public.financeiro_notas
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Atualização: usuário atualiza suas notas; admin pode atualizar quaisquer
CREATE POLICY "Users can update own notes" ON public.financeiro_notas
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Deleção: usuário deleta suas notas; admin pode deletar quaisquer
CREATE POLICY "Users can delete own notes" ON public.financeiro_notas
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );


-- ==========================================
-- TABELA: public.poupeja_goals (Metas/Limits)
-- ==========================================
-- Habilitar RLS
ALTER TABLE public.poupeja_goals ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Users can view own goals" ON public.poupeja_goals;
DROP POLICY IF EXISTS "Admin can view all goals" ON public.poupeja_goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.poupeja_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.poupeja_goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.poupeja_goals;

-- Usuários visualizam apenas suas próprias metas
CREATE POLICY "Users can view own goals" ON public.poupeja_goals
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Administradores visualizam todas as metas
CREATE POLICY "Admin can view all goals" ON public.poupeja_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Inserção: usuário pode inserir suas metas; admin pode inserir para qualquer user_id
CREATE POLICY "Users can insert own goals" ON public.poupeja_goals
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Atualização: usuário atualiza suas metas; admin pode atualizar quaisquer
CREATE POLICY "Users can update own goals" ON public.poupeja_goals
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Deleção: usuário deleta suas metas; admin pode deletar quaisquer
CREATE POLICY "Users can delete own goals" ON public.poupeja_goals
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Observações:
-- 1) Estas políticas assumem que existe a tabela user_roles(user_id UUID, role app_role)
--    e que o usuário administrador possui um registro com role = 'admin'.
-- 2) As colunas user_id em financeiro_notas, poupeja_goals e user_roles são UUID, então use auth.uid() sem cast.
-- 3) Após executar, teste no painel SQL com SELECTs filtrando por user_id e
--    com um usuário admin para garantir o acesso de cliente no modo administrador.
