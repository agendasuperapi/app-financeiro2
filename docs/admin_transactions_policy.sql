-- EXECUTAR NO SQL EDITOR DO SUPABASE
-- Política RLS para permitir que administradores vejam transações de todos os usuários

-- Primeiro, remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can view own transactions" ON poupeja_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON poupeja_transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON poupeja_transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON poupeja_transactions;
DROP POLICY IF EXISTS "Admin can view all transactions" ON poupeja_transactions;

-- Habilitar RLS na tabela poupeja_transactions
ALTER TABLE poupeja_transactions ENABLE ROW LEVEL SECURITY;

-- Política para usuários normais verem apenas suas próprias transações
CREATE POLICY "Users can view own transactions" ON poupeja_transactions
  FOR SELECT USING (
    auth.uid() = user_id::uuid
  );

-- Política para administradores verem todas as transações
CREATE POLICY "Admin can view all transactions" ON poupeja_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Política para usuários inserirem apenas suas próprias transações  
CREATE POLICY "Users can insert own transactions" ON poupeja_transactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id::uuid
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Política para usuários atualizarem apenas suas próprias transações
CREATE POLICY "Users can update own transactions" ON poupeja_transactions
  FOR UPDATE USING (
    auth.uid() = user_id::uuid
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Política para usuários deletarem apenas suas próprias transações
CREATE POLICY "Users can delete own transactions" ON poupeja_transactions
  FOR DELETE USING (
    auth.uid() = user_id::uuid
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Garantir que a tabela user_roles também tenha RLS adequado
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Admin can view all roles" ON user_roles;

-- Política para usuários verem apenas seu próprio papel
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (
    auth.uid()::text = user_id
  );

-- Política para administradores verem todos os papéis
CREATE POLICY "Admin can view all roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()::text 
      AND ur.role = 'admin'
    )
  );

-- Política para administradores gerenciarem papéis
CREATE POLICY "Admin can manage roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()::text 
      AND ur.role = 'admin'
    )
  );