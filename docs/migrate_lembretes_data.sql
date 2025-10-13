-- Migração de dados de lembretes da poupeja_transactions para tbl_lembrete
-- Este script transfere todos os registros onde type = 'lembrete'

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
    created_at
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
    created_at
FROM public.poupeja_transactions
WHERE type = 'lembrete'
ON CONFLICT (id) DO NOTHING;

-- Após verificar que os dados foram migrados corretamente, 
-- você pode opcionalmente deletar os registros de lembrete da tabela original:
-- DELETE FROM public.poupeja_transactions WHERE type = 'lembrete';
