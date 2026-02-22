-- Extension Requests Schema
-- Run this in your Supabase SQL editor to enable the due-date extension feature.

-- -----------------------------------------------------------------------
-- extension_requests table
-- One extension per credit (UNIQUE constraint on credit_entry_id).
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extension_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Related credit
    credit_entry_id UUID NOT NULL REFERENCES credit_entries(id) ON DELETE CASCADE,

    -- Parties
    borrower_pubkey    VARCHAR(88) NOT NULL REFERENCES borrowers(borrower_pubkey)     ON DELETE CASCADE,
    store_owner_pubkey VARCHAR(88) NOT NULL REFERENCES store_owners(store_owner_pubkey) ON DELETE CASCADE,

    -- Borrower request
    requested_days INTEGER NOT NULL CHECK (requested_days > 0 AND requested_days <= 365),
    message        TEXT,

    -- Lender response
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined')),
    adjusted_days   INTEGER CHECK (adjusted_days > 0 AND adjusted_days <= 365),
    response_message TEXT,

    -- Timestamps
    created_at   TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,

    -- One extension per credit
    CONSTRAINT uq_one_extension_per_credit UNIQUE (credit_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_ext_req_borrower      ON extension_requests(borrower_pubkey);
CREATE INDEX IF NOT EXISTS idx_ext_req_store_owner   ON extension_requests(store_owner_pubkey);
CREATE INDEX IF NOT EXISTS idx_ext_req_credit_entry  ON extension_requests(credit_entry_id);
CREATE INDEX IF NOT EXISTS idx_ext_req_status        ON extension_requests(status);

-- -----------------------------------------------------------------------
-- Allow the 'credit_overdue_daily' event type if the column has a CHECK
-- constraint.  (Only needed if your reputation_events table uses one;
-- safe to run regardless.)
-- -----------------------------------------------------------------------
-- ALTER TABLE reputation_events
--   DROP CONSTRAINT IF EXISTS reputation_events_event_type_check;

-- ALTER TABLE reputation_events
--   ADD CONSTRAINT reputation_events_event_type_check
--   CHECK (event_type IN (
--     'account_created',
--     'citizenship_verified',
--     'credit_accepted',
--     'paid_early',
--     'paid_on_time',
--     'paid_late_minor',
--     'paid_late_major',
--     'paid_late_severe',
--     'credit_overdue_weekly',
--     'credit_overdue_daily',
--     'milestone_first_credit',
--     'milestone_five_credits'
--   ));
