-- Criação da tabela tbl_lembrete para gerenciar lembretes
CREATE TABLE IF NOT EXISTS public.tbl_lembrete (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    codigo_trans TEXT,
    name TEXT,
    amount DECIMAL(15, 2) DEFAULT 0,
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending',
    situacao TEXT DEFAULT 'pendente',
    reference_code TEXT,
    phone TEXT,
    recurrence TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_tbl_lembrete_user_id ON public.tbl_lembrete(user_id);
CREATE INDEX IF NOT EXISTS idx_tbl_lembrete_date ON public.tbl_lembrete(date);
CREATE INDEX IF NOT EXISTS idx_tbl_lembrete_status ON public.tbl_lembrete(status);
CREATE INDEX IF NOT EXISTS idx_tbl_lembrete_reference_code ON public.tbl_lembrete(reference_code);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.tbl_lembrete ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seus próprios lembretes
CREATE POLICY "Users can view their own lembretes"
    ON public.tbl_lembrete
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política: Usuários podem inserir seus próprios lembretes
CREATE POLICY "Users can insert their own lembretes"
    ON public.tbl_lembrete
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar seus próprios lembretes
CREATE POLICY "Users can update their own lembretes"
    ON public.tbl_lembrete
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Política: Usuários podem deletar seus próprios lembretes
CREATE POLICY "Users can delete their own lembretes"
    ON public.tbl_lembrete
    FOR DELETE
    USING (auth.uid() = user_id);

-- Habilitar realtime para esta tabela
ALTER TABLE public.tbl_lembrete REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tbl_lembrete;

-- Comentários para documentação
COMMENT ON TABLE public.tbl_lembrete IS 'Tabela para armazenar lembretes dos usuários';
COMMENT ON COLUMN public.tbl_lembrete.id IS 'Identificador único do lembrete';
COMMENT ON COLUMN public.tbl_lembrete.user_id IS 'ID do usuário dono do lembrete';
COMMENT ON COLUMN public.tbl_lembrete.codigo_trans IS 'Código da transação relacionada';
COMMENT ON COLUMN public.tbl_lembrete.name IS 'Nome do lembrete';
COMMENT ON COLUMN public.tbl_lembrete.amount IS 'Valor associado ao lembrete';
COMMENT ON COLUMN public.tbl_lembrete.description IS 'Descrição do lembrete';
COMMENT ON COLUMN public.tbl_lembrete.date IS 'Data e hora do lembrete';
COMMENT ON COLUMN public.tbl_lembrete.status IS 'Status do lembrete (pending, completed, cancelled)';
COMMENT ON COLUMN public.tbl_lembrete.situacao IS 'Situação do lembrete (pendente, pago, cancelado)';
COMMENT ON COLUMN public.tbl_lembrete.reference_code IS 'Código de referência';
COMMENT ON COLUMN public.tbl_lembrete.phone IS 'Telefone associado ao lembrete';
COMMENT ON COLUMN public.tbl_lembrete.recurrence IS 'Recorrência do lembrete (mensal, semanal, etc)';
COMMENT ON COLUMN public.tbl_lembrete.created_at IS 'Data de criação do registro';
