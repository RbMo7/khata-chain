-- Update credit_entries table schema to support approval workflow
-- This script updates existing databases with pending_approval and rejected statuses

-- Step 1: Add missing columns if they don't exist
ALTER TABLE credit_entries 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 2: Drop the old status constraint
ALTER TABLE credit_entries DROP CONSTRAINT IF EXISTS credit_entries_status_check;

-- Step 3: Add new status constraint with all statuses
ALTER TABLE credit_entries 
  ADD CONSTRAINT credit_entries_status_check 
    CHECK (status IN ('pending_approval', 'active', 'completed', 'overdue', 'cancelled', 'rejected'));

-- Step 4: Update default status for new records
ALTER TABLE credit_entries ALTER COLUMN status SET DEFAULT 'pending_approval';

-- Step 5: Create index for pending approvals (if not exists)
CREATE INDEX IF NOT EXISTS idx_credit_pending_approval 
  ON credit_entries(borrower_pubkey, status) 
  WHERE status = 'pending_approval';

-- Migration complete
-- Note: Existing records with status 'active' will remain 'active'
-- Only new records will default to 'pending_approval'
