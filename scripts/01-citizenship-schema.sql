-- Citizenship verification views and utilities
-- This file is included for reference, but citizenship tables are created in 00-base-schema.sql

-- Create view for active citizenship registrations
CREATE OR REPLACE VIEW active_citizenship_registrations AS
SELECT 
    cr.id,
    cr.citizenship_number_hash,
    cr.borrower_pubkey,
    cr.first_wallet_address,
    cr.registered_at,
    cr.status,
    cr.verified_at,
    b.email,
    b.full_name,
    b.wallet_address
FROM citizenship_registrations cr
JOIN borrowers b ON cr.borrower_pubkey = b.borrower_pubkey
WHERE cr.status = 'active';

-- Create view for citizenship verification attempts
CREATE OR REPLACE VIEW citizenship_verification_summary AS
SELECT 
    citizenship_hash,
    COUNT(*) as total_attempts,
    SUM(CASE WHEN verification_result = 'allowed' THEN 1 ELSE 0 END) as allowed_count,
    SUM(CASE WHEN verification_result = 'rejected_duplicate' THEN 1 ELSE 0 END) as rejected_duplicate_count,
    MAX(verification_attempt_at) as last_attempt
FROM citizenship_verification_logs
GROUP BY citizenship_hash;
