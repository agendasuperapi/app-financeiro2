-- Migração para adicionar campo "formato" à tabela poupeja_transactions
-- Execute este script no Editor SQL do painel do Supabase

-- Adicionar coluna formato à tabela poupeja_transactions
ALTER TABLE public.poupeja_transactions 
ADD COLUMN IF NOT EXISTS formato TEXT DEFAULT 'agenda';

-- Comentário explicativo da coluna
COMMENT ON COLUMN public.poupeja_transactions.formato IS 'Campo para identificar o formato da transação (ex: agenda, manual, etc.)';

-- Atualizar registros existentes para terem o valor padrão
UPDATE public.poupeja_transactions 
SET formato = 'agenda' 
WHERE formato IS NULL;