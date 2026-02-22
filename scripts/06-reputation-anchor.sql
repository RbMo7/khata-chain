-- Migration: Add on-chain reputation anchoring columns to borrower_reputation
-- Run this in your Supabase SQL editor.

-- reputation_hash       — SHA256(walletAddress + score + timestamp) committed on-chain
-- reputation_hash_tx    — Solana tx signature of the Memo that inscribed the hash
-- reputation_anchored_at — when the last hash was committed
ALTER TABLE borrower_reputation
  ADD COLUMN IF NOT EXISTS reputation_hash         VARCHAR(64),
  ADD COLUMN IF NOT EXISTS reputation_hash_tx      VARCHAR(128),
  ADD COLUMN IF NOT EXISTS reputation_anchored_at  TIMESTAMP WITH TIME ZONE;

-- Index for quick lookup by hash (used by the verifier API)
CREATE INDEX IF NOT EXISTS idx_reputation_hash
  ON borrower_reputation(reputation_hash)
  WHERE reputation_hash IS NOT NULL;

-- Optional: view for the public verifier API — joins score + on-chain proof
CREATE OR REPLACE VIEW v_reputation_public AS
SELECT
    br.borrower_pubkey,
    br.reputation_score,
    br.total_credits,
    br.on_time_payments,
    br.early_payments,
    br.late_payments_minor,
    br.late_payments_major,
    br.late_payments_severe,
    br.citizenship_bonus_applied,
    br.reputation_hash,
    br.reputation_hash_tx,
    br.reputation_anchored_at,
    br.updated_at AS score_updated_at
FROM borrower_reputation br;
