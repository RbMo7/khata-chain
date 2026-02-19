# KhataChain Authentication Flow

## Overview

KhataChain uses wallet-based authentication with Solana wallets (Phantom, Solflare, Backpack, Glow). The authentication system is built with React Context and provides persistent sessions across page reloads.

## Architecture

### Components

1. **AuthContext** (`/contexts/AuthContext.tsx`)
   - Manages global authentication state
   - Persists user data to localStorage
   - Handles wallet connection/disconnection
   - Provides authentication hooks

2. **WalletConnectModal** (`/components/WalletConnectModal.tsx`)
   - Modal dialog for wallet selection
   - Supports 4 popular Solana wallets
   - Handles wallet connection errors
   - Provides links to install wallets

3. **Protected Routes**
   - `DashboardLayout` component enforces authentication
   - Automatically redirects unauthenticated users
   - Validates user type matches route

### Pages

1. **Landing Page** (`/app/page.tsx`)
   - Public homepage
   - "Get Started" button opens wallet modal
   - Redirects authenticated users to dashboard

2. **Role Selection** (`/app/select-role/page.tsx`)
   - Shown after wallet connection
   - User chooses: Borrower or Store Owner
   - Redirects based on selection

3. **Citizenship Verification** (`/app/borrower/verify/page.tsx`)
   - Required for borrowers only
   - One-time SHA-256 hash verification
   - Prevents duplicate accounts

4. **Dashboards**
   - `/app/borrower/dashboard` - Borrower dashboard
   - `/app/store-owner/dashboard` - Store owner dashboard
   - Protected by DashboardLayout

## Authentication Flow

### First-Time User

```
1. User visits landing page
2. Clicks "Get Started"
3. WalletConnectModal opens
4. User selects wallet (e.g., Phantom)
5. Wallet extension prompts for approval
6. On approval → Redirected to /select-role
7. User selects "Borrower" or "Store Owner"
8. If Borrower → /borrower/verify (citizenship)
9. After verification → Dashboard
10. If Store Owner → Dashboard directly
```

### Returning User

```
1. User visits any page
2. AuthContext checks localStorage
3. Finds saved user data
4. Attempts to reconnect wallet
5. If successful → Redirected to dashboard
6. If failed → Stays on current page
```

## User Object Structure

```typescript
interface User {
  walletAddress: string      // Solana public key
  walletType: string          // "Phantom" | "Solflare" | "Backpack" | "Glow"
  userType: UserType          // "borrower" | "store-owner" | null
  citizenshipVerified: boolean // Only for borrowers
  name?: string
  email?: string
}
```

## Authentication Hooks

### useAuth()

```typescript
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const {
    user,                    // Current user object or null
    isConnecting,            // Loading state during connection
    isAuthenticated,         // true if user exists and has userType
    connectWallet,           // (address, walletType) => void
    disconnectWallet,        // () => void
    setUserType,             // (type) => void
    updateUser,              // (updates) => void
  } = useAuth()
}
```

## Protected Routes

### Using DashboardLayout

```tsx
import { DashboardLayout } from '@/components/DashboardLayout'

export default function BorrowerDashboard() {
  return (
    <DashboardLayout userType="borrower">
      {/* Your page content */}
    </DashboardLayout>
  )
}
```

**DashboardLayout automatically:**
- Redirects unauthenticated users to `/`
- Redirects users to correct dashboard if userType mismatch
- Shows loading spinner during redirect
- Renders Navbar with auth context

## Wallet Integration

### Supported Wallets

1. **Phantom** - Most popular Solana wallet
2. **Solflare** - Web and mobile wallet
3. **Backpack** - Multi-chain wallet
4. **Glow** - Social wallet

### Detection Logic

```javascript
// Check if wallet is installed
const isPhantomInstalled = 'phantom' in window
const isSolflareInstalled = 'solflare' in window
const isBackpackInstalled = 'backpack' in window
const isGlowInstalled = 'glow' in window
```

### Connection Flow

```javascript
// Example: Phantom wallet connection
const walletObj = window.phantom
const response = await walletObj.connect()
const publicKey = response.publicKey.toString()

// Store in auth context
connectWallet(publicKey, 'Phantom')
```

## localStorage Persistence

### Storage Key
`khatachain_user`

### Data Stored
```json
{
  "walletAddress": "Eys21cSKe8x...",
  "walletType": "Phantom",
  "userType": "borrower",
  "citizenshipVerified": true,
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Session Management

- Data is saved on every user state change
- Automatically loaded on app mount
- Cleared on disconnect

## Navigation Rules

### Public Routes
- `/` - Landing page (accessible to all)

### Protected Routes
- `/select-role` - Wallet connected, no userType
- `/borrower/verify` - Borrower, not verified
- `/borrower/dashboard` - Borrower, verified
- `/borrower/credits` - Borrower, verified
- `/borrower/history` - Borrower, verified
- `/borrower/profile` - Borrower, verified
- `/borrower/repay` - Borrower, verified
- `/store-owner/dashboard` - Store owner
- `/store-owner/credits` - Store owner
- `/store-owner/create-credit` - Store owner
- `/store-owner/stripe-setup` - Store owner
- `/store-owner/profile` - Store owner

## Security Considerations

### Client-Side Auth
⚠️ **Current Implementation:** Auth state is stored in localStorage and managed client-side.

**For Production:**
- [ ] Add JWT tokens for server-side verification
- [ ] Implement wallet signature verification
- [ ] Add API route protection with middleware
- [ ] Store sensitive user data server-side only
- [ ] Add session expiration (24h recommended)

### Wallet Security
- Never store private keys
- Only store public keys (wallet addresses)
- Use wallet's built-in signing for transactions
- Verify signatures server-side

## Testing Locally

### Prerequisites
```bash
# Install a Solana wallet extension
# Recommended: Phantom (https://phantom.app)
```

### Test Flow
1. Start dev server: `pnpm dev`
2. Visit `http://localhost:3000`
3. Click "Get Started"
4. Select your wallet
5. Approve connection in wallet extension
6. Choose "Borrower" or "Store Owner"
7. Complete citizenship verification (borrowers)
8. Explore dashboard

### Mock Data
All dashboards currently use mock data. For production:
- Connect to Supabase for user data
- Fetch real credit entries
- Integrate with Stripe API

## Troubleshooting

### Wallet Not Detected
**Issue:** "Phantom wallet not found"  
**Solution:** Install wallet extension and refresh page

### Connection Rejected
**Issue:** "Connection request was rejected"  
**Solution:** User declined in wallet. Try again.

### Stuck on Loading
**Issue:** Page shows loading spinner forever  
**Solution:** Clear localStorage and disconnect wallet manually

### Wrong Dashboard
**Issue:** Store owner sees borrower dashboard  
**Solution:** Auth context redirects to correct dashboard automatically

## API Integration (TODO)

### Endpoints Needed
```
POST /api/auth/connect
  - Verify wallet signature
  - Create or fetch user
  - Return JWT token

POST /api/auth/verify-signature
  - Verify wallet signed message
  - Return user data

POST /api/auth/disconnect
  - Invalidate session
  - Clear server-side data

GET /api/user/profile
  - Fetch user profile
  - Requires auth token

PATCH /api/user/profile
  - Update user data
  - Requires auth token
```

### Example: Signature Verification

```typescript
// Client-side
const message = "Sign this message to authenticate with KhataChain"
const signature = await wallet.signMessage(message)

// Server-side
const isValid = nacl.sign.detached.verify(
  new TextEncoder().encode(message),
  signature,
  publicKey
)
```

## Future Enhancements

- [ ] Add "Sign In With Solana" (SIWS)
- [ ] Implement nonce-based signature verification
- [ ] Add multi-wallet support (connect multiple wallets)
- [ ] Implement session refresh tokens
- [ ] Add email/password fallback (optional)
- [ ] Add OAuth providers (Google, Twitter)
- [ ] Implement user profile completion wizard
- [ ] Add email verification for borrowers
- [ ] Implement 2FA for high-value transactions
- [ ] Add wallet switching without disconnect
