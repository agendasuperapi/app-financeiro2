-- Migration: Add sub_conta column to poupeja_transactions table
-- Created: 2025-01-15
-- Description: Adds a new column 'sub_conta' to store sub-account information

ALTER TABLE poupeja_transactions 
ADD COLUMN IF NOT EXISTS sub_conta TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_poupeja_transactions_sub_conta 
ON poupeja_transactions(sub_conta);

-- Add comment to document the column
COMMENT ON COLUMN poupeja_transactions.sub_conta IS 'Sub-account or secondary account classification';
