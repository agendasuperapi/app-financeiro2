-- Script para criar a tabela financeiro_notas no Supabase
-- Execute este script no Editor SQL do painel do Supabase

-- Criar tabela financeiro_notas
CREATE TABLE IF NOT EXISTS public.financeiro_notas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    descricao TEXT NOT NULL,
    notas TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_financeiro_notas_user_id ON public.financeiro_notas(user_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_notas_data ON public.financeiro_notas(data);
CREATE INDEX IF NOT EXISTS idx_financeiro_notas_created_at ON public.financeiro_notas(created_at);

-- Adicionar RLS (Row Level Security) para garantir que usuários só vejam suas próprias notas
ALTER TABLE public.financeiro_notas ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas suas próprias notas
CREATE POLICY "Users can view their own notes" ON public.financeiro_notas
    FOR SELECT USING (auth.uid() = user_id);

-- Política para permitir que usuários insiram notas
CREATE POLICY "Users can insert their own notes" ON public.financeiro_notas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para permitir que usuários atualizem suas próprias notas
CREATE POLICY "Users can update their own notes" ON public.financeiro_notas
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para permitir que usuários deletem suas próprias notas
CREATE POLICY "Users can delete their own notes" ON public.financeiro_notas
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_financeiro_notas_updated_at 
    BEFORE UPDATE ON public.financeiro_notas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();