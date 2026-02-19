-- Migration: Add credit approval workflow
-- This adds 'pending_approval' and 'rejected' status to credit_entries

-- Drop the existing constraint
ALTER TABLE credit_entries DROP CONSTRAINT IF EXISTS credit_entries_status_check;

-- Add new constraint with pending_approval and rejected statuses
ALTER TABLE credit_entries ADD CONSTRAINT credit_entries_status_check 
  CHECK (status IN ('pending_approval', 'active', 'completed', 'overdue', 'cancelled', 'rejected'));

-- Update default status to pending_approval
ALTER TABLE credit_entries ALTER COLUMN status SET DEFAULT 'pending_approval';

-- Add approval tracking columns
ALTER TABLE credit_entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE credit_entries ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
ALTER TABLE credit_entries ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for pending approvals
CREATE INDEX IF NOT EXISTS idx_credit_pending_approval 
  ON credit_entries(borrower_pubkey, status) 
  WHERE status = 'pending_approval';

COMMENT ON COLUMN credit_entries.status IS 'Credit status: pending_approval (waiting borrower acceptance), active (accepted and NFT minted), completed (fully repaid), overdue (past due date), cancelled (cancelled by store owner), rejected (declined by borrower)';
