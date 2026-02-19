-- Stripe Payment Integration Schema
-- Supports hybrid payment model: on-chain tokens and Stripe fiat payments

-- Modify credit_entries table to track Stripe repayments
ALTER TABLE credit_entries ADD COLUMN IF NOT EXISTS stripe_repayment_amount BIGINT DEFAULT 0;
ALTER TABLE credit_entries ADD COLUMN IF NOT EXISTS repayment_method VARCHAR(50) DEFAULT 'on_chain' CHECK (repayment_method IN ('on_chain', 'stripe', 'hybrid'));
ALTER TABLE credit_entries ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE credit_entries ADD COLUMN IF NOT EXISTS repayment_status VARCHAR(50) DEFAULT 'pending' CHECK (repayment_status IN ('pending', 'partial', 'completed', 'refunded', 'failed'));

-- Create stripe_payments table to track all Stripe transactions
CREATE TABLE IF NOT EXISTS stripe_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_entry_id UUID NOT NULL,
    borrower_pubkey VARCHAR(88) NOT NULL,
    store_owner_pubkey VARCHAR(88) NOT NULL,
    store_owner_stripe_id VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    payment_method_id VARCHAR(255),
    payment_method_type VARCHAR(50) CHECK (payment_method_type IN ('card', 'upi', 'netbanking', 'wallet', 'unknown')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled')),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    webhook_received_at TIMESTAMP,
    failed_reason VARCHAR(500),
    refund_id VARCHAR(255),
    refund_reason VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    FOREIGN KEY (credit_entry_id) REFERENCES credit_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (borrower_pubkey) REFERENCES borrowers(borrower_pubkey),
    INDEX idx_payment_intent (payment_intent_id),
    INDEX idx_credit_entry (credit_entry_id),
    INDEX idx_borrower (borrower_pubkey),
    INDEX idx_store_owner (store_owner_pubkey),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Create store_owner_stripe_accounts table
CREATE TABLE IF NOT EXISTS store_owner_stripe_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_owner_pubkey VARCHAR(88) UNIQUE NOT NULL,
    stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255),
    onboarding_status VARCHAR(50) DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'active', 'inactive', 'rejected', 'suspended')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    connected_at TIMESTAMP,
    bank_account_last4 VARCHAR(4),
    bank_account_country VARCHAR(2),
    bank_account_type VARCHAR(50),
    onboarding_link VARCHAR(500),
    onboarding_link_expires_at TIMESTAMP,
    charges_enabled BOOLEAN DEFAULT false,
    payouts_enabled BOOLEAN DEFAULT false,
    requirements_pending JSONB DEFAULT '[]',
    FOREIGN KEY (store_owner_pubkey) REFERENCES store_owners(store_owner_pubkey) ON DELETE CASCADE,
    INDEX idx_store_owner (store_owner_pubkey),
    INDEX idx_stripe_account (stripe_account_id),
    INDEX idx_onboarding_status (onboarding_status)
);

-- Create stripe_payouts table to track payout history
CREATE TABLE IF NOT EXISTS stripe_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_owner_pubkey VARCHAR(88) NOT NULL,
    store_owner_stripe_id VARCHAR(255) NOT NULL,
    stripe_payout_id VARCHAR(255) UNIQUE NOT NULL,
    amount BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'paid', 'failed', 'cancelled')),
    arrival_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    failure_reason VARCHAR(500),
    automatic BOOLEAN DEFAULT true,
    method VARCHAR(50),
    FOREIGN KEY (store_owner_pubkey) REFERENCES store_owners(store_owner_pubkey) ON DELETE CASCADE,
    INDEX idx_store_owner (store_owner_pubkey),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Create stripe_webhook_events table for logging
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    error_message VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_event_id (stripe_event_id),
    INDEX idx_event_type (event_type),
    INDEX idx_processed (processed),
    INDEX idx_created_at (created_at)
);

-- Create stripe_fees_config table for configurable fees
CREATE TABLE IF NOT EXISTS stripe_fees_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_owner_pubkey VARCHAR(88),
    fee_type VARCHAR(50) CHECK (fee_type IN ('percentage', 'fixed', 'tiered')),
    fee_amount NUMERIC(5, 2),
    min_amount BIGINT DEFAULT 0,
    max_amount BIGINT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (store_owner_pubkey) REFERENCES store_owners(store_owner_pubkey) ON DELETE CASCADE,
    INDEX idx_store_owner (store_owner_pubkey)
);

-- Create stripe_disputes table for tracking chargebacks
CREATE TABLE IF NOT EXISTS stripe_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_dispute_id VARCHAR(255) UNIQUE NOT NULL,
    payment_id UUID NOT NULL,
    store_owner_pubkey VARCHAR(88) NOT NULL,
    amount BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    reason VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'warning_needs_response' CHECK (status IN ('warning_needs_response', 'warning_under_review', 'warning_closed', 'needs_response', 'under_review', 'charge_refunded', 'won', 'lost')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    evidence_due_by TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES stripe_payments(id) ON DELETE CASCADE,
    FOREIGN KEY (store_owner_pubkey) REFERENCES store_owners(store_owner_pubkey),
    INDEX idx_dispute_id (stripe_dispute_id),
    INDEX idx_store_owner (store_owner_pubkey),
    INDEX idx_status (status)
);

-- Create unique constraint for stripe account per store owner
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_stripe_account_per_owner 
    ON store_owner_stripe_accounts(store_owner_pubkey) 
    WHERE onboarding_status IN ('active', 'pending');

-- Grant permissions (adjust role as needed)
-- GRANT SELECT, INSERT, UPDATE ON stripe_payments TO anon;
-- GRANT SELECT ON stripe_payments TO authenticated;
-- GRANT SELECT, INSERT ON stripe_webhook_events TO service_role;
