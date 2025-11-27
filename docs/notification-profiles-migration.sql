-- Migration to add active_profile column to notification_settings table
-- This allows users to save and switch between notification profiles

-- Add active_profile column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notification_settings' 
    AND column_name = 'active_profile'
  ) THEN
    ALTER TABLE notification_settings 
    ADD COLUMN active_profile TEXT DEFAULT 'custom' CHECK (active_profile IN ('trabalho', 'casa', 'silencioso', 'custom'));
  END IF;
END $$;

-- Update existing records to have 'custom' as default profile
UPDATE notification_settings 
SET active_profile = 'custom' 
WHERE active_profile IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN notification_settings.active_profile IS 'Active notification profile: trabalho, casa, silencioso, or custom';
