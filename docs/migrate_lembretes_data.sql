-- Migração de dados de lembretes da poupeja_transactions para tbl_lembrete
-- Este script transfere todos os registros onde type = 'lembrete'

-- Primeiro, adicionar colunas que podem estar faltando na tbl_lembrete
ALTER TABLE public.tbl_lembrete 
ADD COLUMN IF NOT EXISTS formato TEXT,
ADD COLUMN IF NOT EXISTS sub_conta TEXT,
ADD COLUMN IF NOT EXISTS goal_id UUID,
ADD COLUMN IF NOT EXISTS category_id UUID,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adicionar comentários nas novas colunas
COMMENT ON COLUMN public.tbl_lembrete.formato IS 'Formato da transação (agenda, manual, etc.)';
COMMENT ON COLUMN public.tbl_lembrete.sub_conta IS 'Sub-conta ou classificação secundária';
COMMENT ON COLUMN public.tbl_lembrete.goal_id IS 'Referência à meta associada';
COMMENT ON COLUMN public.tbl_lembrete.category_id IS 'Referência à categoria associada';
COMMENT ON COLUMN public.tbl_lembrete.updated_at IS 'Data da última atualização';

-- Migrar dados completos
INSERT INTO public.tbl_lembrete (
    id,
    user_id,
    codigo_trans,
    name,
    amount,
    description,
    date,
    status,
    situacao,
    reference_code,
    phone,
    recurrence,
    formato,
    sub_conta,
    goal_id,
    category_id,
    created_at,
    updated_at
)
SELECT 
    id,
    user_id,
    "codigo-trans",
    name,
    amount,
    description,
    date,
    status,
    situacao,
    reference_code,
    phone,
    recurrence,
    formato,
    sub_conta,
    goal_id,
    category_id,
    created_at,
    updated_at
FROM public.poupeja_transactions
WHERE type = 'lembrete'
ON CONFLICT (id) DO NOTHING;

-- Criar índices para melhor performance nas novas colunas
CREATE INDEX IF NOT EXISTS idx_tbl_lembrete_formato ON public.tbl_lembrete(formato);
CREATE INDEX IF NOT EXISTS idx_tbl_lembrete_sub_conta ON public.tbl_lembrete(sub_conta);
CREATE INDEX IF NOT EXISTS idx_tbl_lembrete_goal_id ON public.tbl_lembrete(goal_id);
CREATE INDEX IF NOT EXISTS idx_tbl_lembrete_category_id ON public.tbl_lembrete(category_id);

-- Adicionar foreign keys se necessário
ALTER TABLE public.tbl_lembrete 
ADD CONSTRAINT fk_tbl_lembrete_goal_id 
FOREIGN KEY (goal_id) REFERENCES public.poupeja_goals(id) ON DELETE SET NULL;

ALTER TABLE public.tbl_lembrete 
ADD CONSTRAINT fk_tbl_lembrete_category_id 
FOREIGN KEY (category_id) REFERENCES public.poupeja_categories(id) ON DELETE SET NULL;

-- Após verificar que os dados foram migrados corretamente, 
-- você pode opcionalmente deletar os registros de lembrete da tabela original:
-- DELETE FROM public.poupeja_transactions WHERE type = 'lembrete';
