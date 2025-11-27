-- EXECUTAR NO SQL EDITOR DO SUPABASE
-- Permitir múltiplos dispositivos por usuário e plataforma

-- 1. Remover a constraint antiga que limitava a 1 token por user_id + platform
ALTER TABLE notification_tokens 
DROP CONSTRAINT IF EXISTS notification_tokens_user_id_platform_key;

-- 2. Adicionar constraint no token para evitar duplicatas
ALTER TABLE notification_tokens 
ADD CONSTRAINT notification_tokens_token_key UNIQUE (token);

-- 3. Criar índice para buscar tokens por usuário rapidamente
CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_id 
ON notification_tokens(user_id);

-- 4. Criar índice para buscar por plataforma
CREATE INDEX IF NOT EXISTS idx_notification_tokens_platform 
ON notification_tokens(platform);

-- 5. Adicionar campo device_id opcional para identificar dispositivos
ALTER TABLE notification_tokens 
ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 6. Adicionar campo last_used para limpar tokens antigos
ALTER TABLE notification_tokens 
ADD COLUMN IF NOT EXISTS last_used TIMESTAMPTZ DEFAULT NOW();

-- Comentário explicativo
COMMENT ON TABLE notification_tokens IS 'Armazena tokens de notificação push. Permite múltiplos dispositivos por usuário e plataforma.';
COMMENT ON COLUMN notification_tokens.device_id IS 'ID único do dispositivo (gerado no frontend)';
COMMENT ON COLUMN notification_tokens.last_used IS 'Última vez que o token foi usado';
