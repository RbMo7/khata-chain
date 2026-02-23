-- Khata-Loyalty Schema Migration

-- 1. Table to track rewards earned by borrowers
CREATE TABLE IF NOT EXISTS borrower_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    borrower_pubkey TEXT NOT NULL REFERENCES borrowers(borrower_pubkey),
    reward_type TEXT NOT NULL, -- 'repayment_milestone', 'score_milestone', 'loyalty_bonus'
    milestone_key TEXT NOT NULL, -- e.g., 'on_time_5', 'score_800'
    amount_sol DECIMAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    tx_signature TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate rewards for the same milestone for the same borrower
    UNIQUE(borrower_pubkey, milestone_key)
);

-- 2. Add loyalty-related columns to borrower_reputation if they don't exist
-- Note: citizenship_bonus_applied, first_credit_bonus_applied already exist in reputation.service.ts logic
-- but we ensure they are in the schema if not already.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'borrower_reputation' AND column_name = 'total_rewards_earned_sol') THEN
        ALTER TABLE borrower_reputation ADD COLUMN total_rewards_earned_sol DECIMAL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'borrower_reputation' AND column_name = 'next_reward_milestone') THEN
        ALTER TABLE borrower_reputation ADD COLUMN next_reward_milestone TEXT DEFAULT 'on_time_1';
    END IF;
END $$;

-- 3. Enable RLS on new table
ALTER TABLE borrower_rewards ENABLE ROW LEVEL SECURITY;

-- 4. Policies for borrower_rewards
-- Borrowers can see their own rewards
CREATE POLICY "Borrowers can view their own rewards"
    ON borrower_rewards FOR SELECT
    USING (auth.uid()::text = borrower_pubkey OR EXISTS (
        SELECT 1 FROM borrowers WHERE wallet_address = borrower_rewards.borrower_pubkey
    ));

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_borrower_rewards_pubkey ON borrower_rewards(borrower_pubkey);
CREATE INDEX IF NOT EXISTS idx_borrower_rewards_status ON borrower_rewards(status);

-- Add comment
COMMENT ON TABLE borrower_rewards IS 'Tracks SOL rewards distributed to borrowers for positive credit behavior.';
