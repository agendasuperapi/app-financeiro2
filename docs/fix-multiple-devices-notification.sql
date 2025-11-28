-- EXECUTAR NO SQL EDITOR DO SUPABASE
-- Script de limpeza e recriação para múltiplos dispositivos

-- 1. Remover constraints e índices antigos
ALTER TABLE notification_tokens 
DROP CONSTRAINT IF EXISTS notification_tokens_user_id_platform_key;

ALTER TABLE notification_tokens 
DROP CONSTRAINT IF EXISTS notification_tokens_token_key;

DROP INDEX IF EXISTS idx_notification_tokens_user_id;
DROP INDEX IF EXISTS idx_notification_tokens_platform;

-- 2. Adicionar colunas novas se não existirem
ALTER TABLE notification_tokens 
ADD COLUMN IF NOT EXISTS device_id TEXT;

ALTER TABLE notification_tokens 
ADD COLUMN IF NOT EXISTS last_used TIMESTAMPTZ DEFAULT NOW();

-- 3. Limpar tokens duplicados (manter o mais recente)
DELETE FROM notification_tokens a
USING notification_tokens b
WHERE a.id < b.id 
AND a.token = b.token;

-- 4. Adicionar constraint UNIQUE no token
ALTER TABLE notification_tokens 
ADD CONSTRAINT notification_tokens_token_key UNIQUE (token);

-- 5. Criar índices para performance
CREATE INDEX idx_notification_tokens_user_id 
ON notification_tokens(user_id);

CREATE INDEX idx_notification_tokens_platform 
ON notification_tokens(platform);

CREATE INDEX idx_notification_tokens_device_id
ON notification_tokens(device_id);

-- 6. Comentários explicativos
COMMENT ON TABLE notification_tokens IS 'Armazena tokens de notificação push. Permite múltiplos dispositivos por usuário e plataforma.';
COMMENT ON COLUMN notification_tokens.device_id IS 'ID único do dispositivo (gerado no frontend)';
COMMENT ON COLUMN notification_tokens.last_used IS 'Última vez que o token foi usado';
