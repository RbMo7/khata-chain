-- Migration: Add Solana transaction signature columns to credit_entries
-- Run this in your Supabase SQL editor.

-- tx_signature — set when a credit is created and anchored on-chain (signed by store owner)
ALTER TABLE credit_entries
  ADD COLUMN IF NOT EXISTS tx_signature        VARCHAR(128),
  ADD COLUMN IF NOT EXISTS repayment_tx_signature VARCHAR(128);

-- Index for quick lookups by signature
CREATE INDEX IF NOT EXISTS idx_credit_entries_tx_sig
  ON credit_entries(tx_signature)
  WHERE tx_signature IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_entries_repayment_tx_sig
  ON credit_entries(repayment_tx_signature)
  WHERE repayment_tx_signature IS NOT NULL;

-- Optional: view to see which credits are anchored on-chain
CREATE OR REPLACE VIEW v_anchored_credits AS
SELECT
    id,
    borrower_pubkey,
    store_owner_pubkey,
    credit_amount,
    currency,
    status,
    due_date,
    tx_signature,
    repayment_tx_signature,
    created_at
FROM credit_entries
WHERE tx_signature IS NOT NULL;
