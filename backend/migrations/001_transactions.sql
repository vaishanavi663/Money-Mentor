-- Money Mentor: transactions for UPI/SMS import (user_id matches BIGINT users.id)
-- Idempotent: safe to re-run.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS upi_ref VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS raw_sms TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMPTZ;

-- Backfill merchant from legacy description
UPDATE transactions SET merchant = description WHERE merchant IS NULL OR TRIM(COALESCE(merchant, '')) = '';

-- Backfill transaction_date from legacy date column if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'date'
  ) THEN
    UPDATE transactions
    SET transaction_date = COALESCE(
      transaction_date,
      ((date::text || ' 00:00:00')::timestamp AT TIME ZONE 'Asia/Kolkata')
    )
    WHERE transaction_date IS NULL;
  END IF;
END $$;

UPDATE transactions SET transaction_date = NOW() WHERE transaction_date IS NULL;

-- Migrate income/expense → credit/debit
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
UPDATE transactions SET type = 'credit' WHERE type = 'income';
UPDATE transactions SET type = 'debit' WHERE type = 'expense';
UPDATE transactions SET type = 'debit' WHERE type NOT IN ('debit', 'credit');
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('debit', 'credit'));

-- Drop legacy date if it exists (transaction_date is canonical)
ALTER TABLE transactions DROP COLUMN IF EXISTS date;

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
