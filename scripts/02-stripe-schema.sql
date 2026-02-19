-- Stripe Payment Integration Views and Analytics
-- Stripe tables are created in 00-base-schema.sql

-- Create view for pending payments
CREATE OR REPLACE VIEW pending_stripe_payments AS
SELECT 
    sp.id,
    sp.credit_entry_id,
    sp.borrower_pubkey,
    sp.store_owner_pubkey,
    sp.amount,
    sp.currency,
    sp.status,
    sp.created_at,
    b.full_name as borrower_name,
    so.store_name,
    ce.credit_amount,
    ROUND(100.0 * sp.amount / ce.credit_amount, 2) as repayment_percentage
FROM stripe_payments sp
JOIN borrowers b ON sp.borrower_pubkey = b.borrower_pubkey
JOIN store_owners so ON sp.store_owner_pubkey = so.store_owner_pubkey
JOIN credit_entries ce ON sp.credit_entry_id = ce.id
WHERE sp.status IN ('pending', 'processing');

-- Create view for payment statistics
CREATE OR REPLACE VIEW stripe_payment_statistics AS
SELECT 
    store_owner_pubkey,
    COUNT(*) as total_payments,
    SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as total_received,
    SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as total_failed,
    COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    ROUND(100.0 * COUNT(CASE WHEN status = 'succeeded' THEN 1 END) / COUNT(*), 2) as success_rate
FROM stripe_payments
GROUP BY store_owner_pubkey;

-- Create view for lender settlement summary
CREATE OR REPLACE VIEW lender_settlement_summary AS
SELECT 
    sosa.store_owner_pubkey,
    so.store_name,
    sosa.stripe_account_id,
    sosa.onboarding_status,
    COUNT(sp.id) as total_transactions,
    SUM(CASE WHEN sp.status = 'succeeded' THEN sp.amount ELSE 0 END) as total_settled,
    COUNT(sp.refund_id) as total_refunds,
    sosa.charges_enabled,
    sosa.payouts_enabled,
    sosa.updated_at
FROM store_owner_stripe_accounts sosa
LEFT JOIN store_owners so ON sosa.store_owner_pubkey = so.store_owner_pubkey
LEFT JOIN stripe_payments sp ON sosa.store_owner_pubkey = sp.store_owner_pubkey
GROUP BY sosa.store_owner_pubkey, so.store_name, sosa.stripe_account_id, sosa.onboarding_status, sosa.charges_enabled, sosa.payouts_enabled, sosa.updated_at;
