-- Habilitar RLS na tabela tbl_log
ALTER TABLE public.tbl_log ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários visualizem apenas seus próprios logs
CREATE POLICY "Users can view their own logs"
ON public.tbl_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política para permitir que usuários insiram apenas seus próprios logs
CREATE POLICY "Users can insert their own logs"
ON public.tbl_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política para permitir que admins atualizem logs
CREATE POLICY "Admins can update logs"
ON public.tbl_log
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Política para permitir que admins deletem logs
CREATE POLICY "Admins can delete logs"
ON public.tbl_log
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- NOTA: Se a função has_role não existir, você precisa criá-la primeiro:
-- 
-- CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
-- 
-- CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
-- RETURNS boolean
-- LANGUAGE sql
-- STABLE
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
--   SELECT EXISTS (
--     SELECT 1
--     FROM public.user_roles
--     WHERE user_id = _user_id
--       AND role = _role
--   )
-- $$;
