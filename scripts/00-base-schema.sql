-- KhataChain Base Schema
-- Creates core tables for borrowers, store owners, and credit entries

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create borrowers table
CREATE TABLE IF NOT EXISTS borrowers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_pubkey VARCHAR(88) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(88) NOT NULL,
    full_name VARCHAR(255),
    phone_number VARCHAR(20),
    display_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    citizenship_number_hash VARCHAR(255) UNIQUE,
    citizenship_verified_at TIMESTAMP,
    original_citizenship_hash_verified BOOLEAN DEFAULT false,
    INDEX idx_borrower_pubkey (borrower_pubkey),
    INDEX idx_email (email),
    INDEX idx_citizenship_hash (citizenship_number_hash)
);

-- Create store_owners table
CREATE TABLE IF NOT EXISTS store_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_owner_pubkey VARCHAR(88) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    store_address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    phone_number VARCHAR(20),
    business_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_store_owner_pubkey (store_owner_pubkey),
    INDEX idx_email (email)
);

-- Create credit_entries table
CREATE TABLE IF NOT EXISTS credit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_pubkey VARCHAR(88) NOT NULL,
    store_owner_pubkey VARCHAR(88) NOT NULL,
    credit_amount BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    description VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    due_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'cancelled')),
    nft_mint_address VARCHAR(88),
    stripe_repayment_amount BIGINT DEFAULT 0,
    repayment_method VARCHAR(50) DEFAULT 'on_chain' CHECK (repayment_method IN ('on_chain', 'stripe', 'hybrid')),
    stripe_payment_intent_id VARCHAR(255),
    repayment_status VARCHAR(50) DEFAULT 'pending' CHECK (repayment_status IN ('pending', 'partial', 'completed', 'refunded', 'failed')),
    FOREIGN KEY (borrower_pubkey) REFERENCES borrowers(borrower_pubkey) ON DELETE CASCADE,
    FOREIGN KEY (store_owner_pubkey) REFERENCES store_owners(store_owner_pubkey) ON DELETE CASCADE,
    INDEX idx_borrower (borrower_pubkey),
    INDEX idx_store_owner (store_owner_pubkey),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_due_date (due_date)
);

-- Create citizenship_registrations table for audit trail
CREATE TABLE IF NOT EXISTS citizenship_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizenship_number_hash VARCHAR(255) UNIQUE NOT NULL,
    borrower_pubkey VARCHAR(88) NOT NULL,
    first_wallet_address VARCHAR(88) NOT NULL,
    registered_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    verified_at TIMESTAMP,
    FOREIGN KEY (borrower_pubkey) REFERENCES borrowers(borrower_pubkey) ON DELETE CASCADE,
    INDEX idx_citizenship_hash (citizenship_number_hash),
    INDEX idx_borrower_pubkey (borrower_pubkey),
    INDEX idx_status (status)
);

-- Create citizenship_verification_logs table (audit trail)
CREATE TABLE IF NOT EXISTS citizenship_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizenship_hash VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(88) NOT NULL,
    verification_attempt_at TIMESTAMP DEFAULT NOW(),
    verification_result VARCHAR(50) CHECK (verification_result IN ('allowed', 'rejected_duplicate', 'rejected_invalid')),
    reason VARCHAR(500),
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    INDEX idx_citizenship_hash (citizenship_hash),
    INDEX idx_verification_attempt (verification_attempt_at)
);

-- Create stripe_payments table
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
    FOREIGN KEY (store_owner_pubkey) REFERENCES store_owners(store_owner_pubkey),
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

-- Create stripe_payouts table
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

-- Create stripe_webhook_events table
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

-- Create stripe_disputes table
CREATE TABLE IF NOT EXISTS stripe_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_dispute_id VARCHAR(255) UNIQUE NOT NULL,
    payment_id UUID NOT NULL,
    store_owner_pubkey VARCHAR(88) NOT NULL,
    amount BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    reason VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'warning_needs_response',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    evidence_due_by TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES stripe_payments(id) ON DELETE CASCADE,
    FOREIGN KEY (store_owner_pubkey) REFERENCES store_owners(store_owner_pubkey),
    INDEX idx_dispute_id (stripe_dispute_id),
    INDEX idx_store_owner (store_owner_pubkey),
    INDEX idx_status (status)
);

-- Create RLS policies for security
ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all tables
CREATE POLICY "Service role can manage borrowers" ON borrowers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage store_owners" ON store_owners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage credit_entries" ON credit_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage stripe_payments" ON stripe_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage stripe_webhook_events" ON stripe_webhook_events FOR ALL USING (true) WITH CHECK (true);
