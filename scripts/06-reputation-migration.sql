-- Migration: Add reputation tables to existing KhataChain database
-- Run this in Supabase SQL Editor if you already have an existing database.

-- Create borrower_reputation table
CREATE TABLE IF NOT EXISTS borrower_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_pubkey VARCHAR(88) UNIQUE NOT NULL,
    reputation_score INTEGER DEFAULT 600 NOT NULL
        CHECK (reputation_score BETWEEN 300 AND 1000),
    total_credits         INTEGER DEFAULT 0,
    on_time_payments      INTEGER DEFAULT 0,
    early_payments        INTEGER DEFAULT 0,
    late_payments_minor   INTEGER DEFAULT 0,
    late_payments_major   INTEGER DEFAULT 0,
    late_payments_severe  INTEGER DEFAULT 0,
    overdue_credits       INTEGER DEFAULT 0,
    avg_payment_offset_days DECIMAL(8,2) DEFAULT 0,
    citizenship_bonus_applied   BOOLEAN DEFAULT false,
    first_credit_bonus_applied  BOOLEAN DEFAULT false,
    five_credits_bonus_applied  BOOLEAN DEFAULT false,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (borrower_pubkey) REFERENCES borrowers(borrower_pubkey) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reputation_pubkey ON borrower_reputation(borrower_pubkey);
CREATE INDEX IF NOT EXISTS idx_reputation_score   ON borrower_reputation(reputation_score);

-- Create reputation_events audit log table
CREATE TABLE IF NOT EXISTS reputation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_pubkey VARCHAR(88) NOT NULL,
    credit_entry_id UUID,
    event_type VARCHAR(80) NOT NULL CHECK (event_type IN (
        'account_created',
        'citizenship_verified',
        'credit_accepted',
        'paid_early',
        'paid_on_time',
        'paid_late_minor',
        'paid_late_major',
        'paid_late_severe',
        'credit_overdue_weekly',
        'milestone_first_credit',
        'milestone_five_credits'
    )),
    score_before  INTEGER NOT NULL,
    score_change  INTEGER NOT NULL,
    score_after   INTEGER NOT NULL,
    description   VARCHAR(500),
    payment_offset_days INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (borrower_pubkey) REFERENCES borrowers(borrower_pubkey) ON DELETE CASCADE,
    FOREIGN KEY (credit_entry_id) REFERENCES credit_entries(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rep_events_borrower ON reputation_events(borrower_pubkey, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rep_events_credit   ON reputation_events(credit_entry_id);

-- Seed initial reputation rows for existing borrowers who don't have one yet
INSERT INTO borrower_reputation (borrower_pubkey, reputation_score)
SELECT b.borrower_pubkey, 600
FROM borrowers b
WHERE NOT EXISTS (
    SELECT 1 FROM borrower_reputation r WHERE r.borrower_pubkey = b.borrower_pubkey
)
ON CONFLICT (borrower_pubkey) DO NOTHING;
