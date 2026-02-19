-- Citizenship Number Management
-- This schema prevents duplicate borrower accounts by enforcing unique citizenship records

-- Modify borrowers table to include citizenship tracking
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS citizenship_number_hash VARCHAR(255) UNIQUE NOT NULL DEFAULT '';
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS citizenship_verified_at TIMESTAMP;
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS original_citizenship_hash_verified BOOLEAN DEFAULT false;

-- Create citizenship registrations table for audit trail
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

-- Create index on borrowers for citizenship lookups
CREATE INDEX IF NOT EXISTS idx_borrowers_citizenship_hash ON borrowers(citizenship_number_hash);

-- Create table for citizenship verification logs (audit trail)
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

-- Grant appropriate permissions (adjust role as needed)
-- GRANT SELECT, INSERT ON citizenship_registrations TO anon;
-- GRANT SELECT ON citizenship_verification_logs TO anon;
