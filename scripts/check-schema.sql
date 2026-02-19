-- Check if tables exist in Supabase
-- Run this in Supabase SQL Editor to verify schema is set up

-- Check for main tables
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('borrowers', 'store_owners', 'credit_entries', 
                        'citizenship_registrations', 'citizenship_verification_logs',
                        'stripe_payments', 'store_owner_stripe_accounts', 
                        'stripe_payouts', 'stripe_webhook_events', 'stripe_disputes')
    THEN '✅ Required table exists'
    ELSE '❌ Unexpected table'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected tables count (should be 10)
SELECT 
  COUNT(*) as total_tables,
  CASE 
    WHEN COUNT(*) = 10 THEN '✅ All tables present'
    WHEN COUNT(*) = 0 THEN '❌ No tables - Run SQL scripts!'
    ELSE CONCAT('⚠️ Only ', COUNT(*), ' of 10 tables found')
  END as schema_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

-- Check for views
SELECT 
  table_name as view_name,
  '✅ View exists' as status
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;
