-- Adicionar campos de notificação à tabela tbl_lembrete

-- Adicionar campo para controlar se a notificação foi enviada
ALTER TABLE public.tbl_lembrete
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Adicionar campo para timestamp da última notificação
ALTER TABLE public.tbl_lembrete
ADD COLUMN IF NOT EXISTS last_notification_at TIMESTAMP WITH TIME ZONE;

-- Adicionar índice para melhorar performance das queries de notificação
CREATE INDEX IF NOT EXISTS idx_tbl_lembrete_notification_sent 
ON public.tbl_lembrete(notification_sent);

-- Comentários para documentação
COMMENT ON COLUMN public.tbl_lembrete.notification_sent IS 'Indica se a notificação já foi enviada';
COMMENT ON COLUMN public.tbl_lembrete.last_notification_at IS 'Timestamp da última notificação enviada';
