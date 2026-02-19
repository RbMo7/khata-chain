#!/bin/bash

# KhataChain Testing Script
# Run this after SQL scripts are executed in Supabase

set -e

echo "🧪 KhataChain Testing Suite"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "📡 Checking if dev server is running..."
if ! curl -s http://localhost:3000/api/test/db > /dev/null 2>&1; then
    echo -e "${RED}❌ Dev server not running on port 3000${NC}"
    echo "Please start it with: pnpm dev"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Test 1: Database Connection
echo "🗄️  Test 1: Database Connection"
echo "--------------------------------"
RESPONSE=$(curl -s http://localhost:3000/api/test/db)
STATUS=$(echo $RESPONSE | jq -r '.status' 2>/dev/null || echo "error")

if [ "$STATUS" = "connected" ]; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
    echo $RESPONSE | jq .
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo $RESPONSE | jq . 2>/dev/null || echo $RESPONSE
    exit 1
fi
echo ""

# Test 2: Create Borrower
echo "👤 Test 2: Create Test Borrower"
echo "--------------------------------"
BORROWER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "TestBorrower1234567890ABCDEFGHIJKLMNOPQR",
    "userType": "borrower"
  }')

SUCCESS=$(echo $BORROWER_RESPONSE | jq -r '.success' 2>/dev/null || echo "false")

if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Borrower created successfully${NC}"
    echo $BORROWER_RESPONSE | jq '.user | {walletAddress, userType, email}'
else
    echo -e "${RED}❌ Borrower creation failed${NC}"
    echo $BORROWER_RESPONSE | jq . 2>/dev/null || echo $BORROWER_RESPONSE
    echo ""
    echo -e "${YELLOW}⚠️  Did you run the SQL scripts in Supabase?${NC}"
    echo "   1. Go to Supabase Dashboard → SQL Editor"
    echo "   2. Run scripts/00-base-schema.sql"
    echo "   3. Run scripts/01-citizenship-schema.sql"
    echo "   4. Run scripts/02-stripe-schema.sql"
    exit 1
fi
echo ""

# Test 3: Create Store Owner
echo "🏪 Test 3: Create Test Store Owner"
echo "-----------------------------------"
STORE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "TestStoreOwner1234567890ABCDEFGHIJKLMN",
    "userType": "store-owner"
  }')

SUCCESS=$(echo $STORE_RESPONSE | jq -r '.success' 2>/dev/null || echo "false")

if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Store Owner created successfully${NC}"
    echo $STORE_RESPONSE | jq '.user | {walletAddress, userType, email}'
else
    echo -e "${RED}❌ Store Owner creation failed${NC}"
    echo $STORE_RESPONSE | jq . 2>/dev/null || echo $STORE_RESPONSE
    exit 1
fi
echo ""

# Test 4: Verify Borrower Exists
echo "🔍 Test 4: Verify Borrower Can Be Retrieved"
echo "--------------------------------------------"
VERIFY_RESPONSE=$(curl -s "http://localhost:3000/api/test/auth?wallet=TestBorrower1234567890ABCDEFGHIJKLMNOPQR")

EXISTS=$(echo $VERIFY_RESPONSE | jq -r '.exists' 2>/dev/null || echo "false")

if [ "$EXISTS" = "true" ]; then
    echo -e "${GREEN}✅ Borrower retrieved successfully${NC}"
    echo $VERIFY_RESPONSE | jq '.user | {walletAddress, userType}'
else
    echo -e "${RED}❌ Failed to retrieve borrower${NC}"
    echo $VERIFY_RESPONSE | jq . 2>/dev/null || echo $VERIFY_RESPONSE
    exit 1
fi
echo ""

# Test 5: Verify Store Owner Exists
echo "🔍 Test 5: Verify Store Owner Can Be Retrieved"
echo "-----------------------------------------------"
VERIFY_STORE_RESPONSE=$(curl -s "http://localhost:3000/api/test/auth?wallet=TestStoreOwner1234567890ABCDEFGHIJKLMN")

EXISTS=$(echo $VERIFY_STORE_RESPONSE | jq -r '.exists' 2>/dev/null || echo "false")

if [ "$EXISTS" = "true" ]; then
    echo -e "${GREEN}✅ Store Owner retrieved successfully${NC}"
    echo $VERIFY_STORE_RESPONSE | jq '.user | {walletAddress, userType}'
else
    echo -e "${RED}❌ Failed to retrieve store owner${NC}"
    echo $VERIFY_STORE_RESPONSE | jq . 2>/dev/null || echo $VERIFY_STORE_RESPONSE
    exit 1
fi
echo ""

# Summary
echo "=============================="
echo -e "${GREEN}🎉 All Tests Passed!${NC}"
echo "=============================="
echo ""
echo "✅ Database connection working"
echo "✅ User creation working"
echo "✅ User retrieval working"
echo ""
echo "📊 Created Test Users:"
echo "  • Borrower: TestBorrower1234567890ABCDEFGHIJKLMNOPQR"
echo "  • Store Owner: TestStoreOwner1234567890ABCDEFGHIJKLMN"
echo ""
echo "🔍 Verify in Supabase Dashboard:"
echo "  1. Go to Table Editor"
echo "  2. Check 'borrowers' table → Should see 1 row"
echo "  3. Check 'store_owners' table → Should see 1 row"
echo ""
echo "⏭️  Next Steps:"
echo "  • Read TESTING_CHECKLIST.md for more tests"
echo "  • Check docs/SERVICES_REFERENCE.md for API reference"
echo "  • Ready to build production API routes!"
echo ""
