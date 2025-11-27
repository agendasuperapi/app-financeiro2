-- Criar tabela de configurações de notificação
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sound_type TEXT NOT NULL DEFAULT 'default',
  vibration_enabled BOOLEAN DEFAULT true,
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own notification settings"
  ON notification_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON notification_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON notification_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_settings_timestamp
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_updated_at();

-- Inserir configurações padrão para usuários existentes
INSERT INTO notification_settings (user_id, sound_type, vibration_enabled, notification_enabled)
SELECT id, 'default', true, true
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_settings)
ON CONFLICT (user_id) DO NOTHING;
