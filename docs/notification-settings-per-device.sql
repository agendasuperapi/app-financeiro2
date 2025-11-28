-- Migração para suportar configurações de notificação por dispositivo
-- Execute no SQL Editor do Supabase

-- 1. Adicionar campos para identificar dispositivo na tabela notification_settings
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 2. Adicionar campos para metadata do dispositivo
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web';

ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS device_name TEXT;

-- 3. Remover constraint UNIQUE antiga se existir (usuário global)
ALTER TABLE notification_settings 
DROP CONSTRAINT IF EXISTS notification_settings_user_id_key;

-- 4. Adicionar nova constraint UNIQUE por dispositivo
ALTER TABLE notification_settings 
ADD CONSTRAINT notification_settings_user_device_unique 
UNIQUE (user_id, device_id);

-- 5. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_device 
ON notification_settings(user_id, device_id);

-- 6. Adicionar comentários
COMMENT ON COLUMN notification_settings.device_id IS 'ID único do dispositivo (mesmo usado em notification_tokens)';
COMMENT ON COLUMN notification_settings.platform IS 'Plataforma do dispositivo: web, android, ios';
COMMENT ON COLUMN notification_settings.device_name IS 'Nome amigável do dispositivo para exibição';
