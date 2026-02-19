# API Routes Documentation

Complete reference for all KhataChain API endpoints.

## Base URL

Development: `http://localhost:3000/api`
Production: `https://your-domain.com/api`

## Authentication

Most endpoints require authentication via the `Authorization` header:

```
Authorization: Bearer <wallet_address>
```

The middleware will verify the wallet address and attach user information to the request.

---

## Auth Routes

### POST /api/auth/login

Authenticate or create a user by wallet address.

**Request Body:**
```json
{
  "walletAddress": "string (required)",
  "userType": "borrower | store-owner (required)",
  "email": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "walletAddress": "string",
      "userType": "borrower | store-owner",
      "email": "string",
      "citizenshipVerified": boolean,
      "data": { /* borrower or store owner object */ }
    },
    "isNewUser": boolean,
    "message": "string"
  }
}
```

**Status Codes:**
- 200: Success
- 400: Validation error
- 500: Server error

---

### GET /api/auth/me

Get current authenticated user's profile.

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "walletAddress": "string",
    "userType": "borrower | store-owner",
    "email": "string",
    "citizenshipVerified": boolean,
    "data": { /* full user object */ }
  }
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 404: User not found

---

## Borrower Routes

### GET /api/borrower/profile

Get borrower's profile.

**Auth Required:** Yes (Borrower only)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "borrower_pubkey": "string",
    "email": "string",
    "full_name": "string",
    "phone_number": "string",
    "citizenship_verified": boolean,
    "citizenship_hash": "string",
    "created_at": "ISO date",
    "last_active": "ISO date"
  }
}
```

---

### PUT /api/borrower/profile

Update borrower's profile.

**Auth Required:** Yes (Borrower only)

**Request Body:**
```json
{
  "full_name": "string (optional)",
  "phone_number": "string (optional)",
  "email": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated borrower object */ }
}
```

---

### GET /api/borrower/stats

Get borrower's statistics.

**Auth Required:** Yes (Borrower only)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCredits": number,
    "activeCredits": number,
    "totalOwed": number,
    "completedPayments": number
  }
}
```

---

### GET /api/borrower/credits

Get borrower's credits.

**Auth Required:** Yes (Borrower only)

**Query Parameters:**
- `status` (optional): `active` | `overdue` | `paid` | `all` (default: `all`)

**Response:**
```json
{
  "success": true,
  "data": {
    "credits": [ /* array of credit objects */ ],
    "total": number,
    "status": "string"
  }
}
```

---

## Store Owner Routes

### GET /api/store-owner/profile

Get store owner's profile.

**Auth Required:** Yes (Store Owner only)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "store_owner_pubkey": "string",
    "email": "string",
    "store_name": "string",
    "store_description": "string",
    "phone_number": "string",
    "created_at": "ISO date"
  }
}
```

---

### PUT /api/store-owner/profile

Update store owner's profile.

**Auth Required:** Yes (Store Owner only)

**Request Body:**
```json
{
  "store_name": "string (optional)",
  "store_description": "string (optional)",
  "phone_number": "string (optional)",
  "email": "string (optional)"
}
```

---

### GET /api/store-owner/stats

Get store owner's statistics.

**Auth Required:** Yes (Store Owner only)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCreditsIssued": number,
    "activeCredits": number,
    "totalLent": number,
    "totalCollected": number,
    "totalOutstanding": number,
    "overdueCredits": number,
    "stripeConnected": boolean,
    "totalPaymentsReceived": number,
    "pendingPayouts": number,
    "completedPayouts": number
  }
}
```

---

### GET /api/store-owner/credits

Get credits issued by store owner.

**Auth Required:** Yes (Store Owner only)

**Query Parameters:**
- `status` (optional): `active` | `overdue` | `paid` | `all` (default: `all`)
- `recent` (optional): `true` to get recent credits with borrower details
- `limit` (optional): number of results (default: `50`)

**Response:**
```json
{
  "success": true,
  "data": {
    "credits": [ /* array of credit objects */ ],
    "total": number,
    "status": "string" | "type": "recent"
  }
}
```

---

## Credit Routes

### POST /api/credits/create

Create a new credit entry.

**Auth Required:** Yes (Store Owner only)

**Request Body:**
```json
{
  "borrowerPubkey": "string (required)",
  "creditAmount": number, // in paise
  "currency": "string (default: INR)",
  "description": "string (required)",
  "dueDate": "ISO date (required)",
  "interestRate": number, // optional
  "gracePeriodDays": number // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "credit": { /* credit object */ },
    "message": "Credit entry created successfully"
  }
}
```

**Status Codes:**
- 201: Created
- 400: Validation error
- 404: Borrower not found
- 500: Server error

---

### GET /api/credits/[id]

Get credit details with borrower and store owner info.

**Auth Required:** Yes

**Note:** User must be either the borrower or store owner of the credit.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "borrower_pubkey": "string",
    "store_owner_pubkey": "string",
    "credit_amount": number,
    "paid_amount": number,
    "outstanding_amount": number,
    "currency": "string",
    "description": "string",
    "status": "string",
    "due_date": "ISO date",
    "borrower": { /* borrower object */ },
    "store_owner": { /* store owner object */ }
  }
}
```

---

### PATCH /api/credits/[id]/status

Update credit status.

**Auth Required:** Yes (Store Owner only - must own the credit)

**Request Body:**
```json
{
  "status": "active | overdue | paid | defaulted | disputed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "credit": { /* updated credit object */ },
    "message": "Credit status updated to <status>"
  }
}
```

---

## Search Routes

### GET /api/search/borrowers

Search for borrowers by name or email.

**Auth Required:** Yes (Store Owner only)

**Query Parameters:**
- `q` (required): Search query (minimum 2 characters)
- `limit` (optional): Results limit (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [ /* array of borrower objects */ ],
    "total": number,
    "query": "string"
  }
}
```

---

## Citizenship Routes

### POST /api/citizenship/check

Check if a citizenship number is available.

**Auth Required:** No

**Request Body:**
```json
{
  "citizenship_number": "string (required)",
  "wallet_address": "string (optional - for logging)"
}
```

**Response (Available):**
```json
{
  "success": true,
  "data": {
    "available": true,
    "message": "This citizenship number is available for registration",
    "citizenshipHash": "string"
  }
}
```

**Response (Not Available):**
```json
{
  "success": true,
  "data": {
    "available": false,
    "message": "This citizenship number is already registered...",
    "existingWallet": "string",
    "status": "active | suspended | revoked"
  }
}
```

---

### POST /api/citizenship/register

Register a citizenship number.

**Auth Required:** No

**Request Body:**
```json
{
  "citizenship_number": "string (required)",
  "borrower_pubkey": "string (required)",
  "wallet_address": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Citizenship registered successfully",
    "registrationId": "uuid",
    "citizenshipHash": "string"
  }
}
```

**Status Codes:**
- 200: Success
- 400: Already registered or validation error
- 500: Server error

---

## Stripe Routes

### POST /api/stripe/payment/intent

Create a payment intent for credit repayment.

**Auth Required:** Yes (Borrower only)

**Request Body:**
```json
{
  "credit_entry_id": "uuid (required)",
  "amount": number, // in paise (required)
  "currency": "string (default: INR)",
  "description": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "clientSecret": "string",
    "paymentIntentId": "string",
    "paymentId": "uuid"
  }
}
```

**Status Codes:**
- 200: Success
- 400: Invalid amount, credit not found, or Stripe account not setup
- 403: Unauthorized (not your credit)
- 500: Server error

---

### POST /api/stripe/webhook

Handle Stripe webhook events.

**Auth Required:** No (verified via Stripe signature)

**Headers Required:**
- `stripe-signature`: Stripe webhook signature

**Events Handled:**
- `payment_intent.succeeded` - Updates payment and credit status
- `payment_intent.payment_failed` - Marks payment as failed
- `payment_intent.canceled` - Marks payment as canceled
- `charge.refunded` - Marks payment as refunded
- `account.updated` - Updates store owner Stripe account status

**Response:**
```json
{
  "received": true
}
```

---

## Testing Routes

### GET /api/test/db

Test database connection.

**Auth Required:** No

**Response:**
```json
{
  "status": "connected",
  "message": "Supabase connection successful! ✅",
  "tables": {
    "borrowers": number,
    "store_owners": number,
    "credit_entries": number
  },
  "timestamp": "ISO date",
  "database": "string"
}
```

---

### POST /api/test/auth

Create/authenticate a test user.

**Auth Required:** No

**Request Body:**
```json
{
  "walletAddress": "string (required)",
  "userType": "borrower | store-owner (required)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully! ✅",
  "user": { /* AuthUser object */ },
  "details": { /* full user object */ }
}
```

---

### GET /api/test/auth?wallet=<address>

Check if a user exists.

**Auth Required:** No

**Query Parameters:**
- `wallet`: Wallet address

**Response:**
```json
{
  "exists": boolean,
  "user": { /* user object if exists */ },
  "details": { /* full details if exists */ }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

The API includes basic rate limiting:
- Default: 100 requests per minute per IP
- Configurable via `checkRateLimit` middleware

---

## CORS

CORS headers are included for all responses:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

---

## Example Usage

### cURL Examples

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "ABC123", "userType": "borrower"}'
```

**Get Profile:**
```bash
curl http://localhost:3000/api/borrower/profile \
  -H "Authorization: Bearer ABC123"
```

**Create Credit:**
```bash
curl -X POST http://localhost:3000/api/credits/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STORE_WALLET" \
  -d '{
    "borrowerPubkey": "ABC123",
    "creditAmount": 50000,
    "description": "Groceries",
    "dueDate": "2026-03-30T00:00:00Z"
  }'
```

### JavaScript Examples

```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: walletAddress,
    userType: 'borrower'
  })
})
const { data } = await response.json()

// Get credits
const creditsResponse = await fetch('/api/borrower/credits?status=active', {
  headers: { 'Authorization': `Bearer ${walletAddress}` }
})
const { data: { credits } } = await creditsResponse.json()
```

---

## Next Steps

1. Test all endpoints using the [TESTING_CHECKLIST.md](../TESTING_CHECKLIST.md)
2. Integrate with UI components
3. Replace mock data with real API calls
4. Test end-to-end workflows

For detailed service documentation, see [SERVICES_REFERENCE.md](../docs/SERVICES_REFERENCE.md)
