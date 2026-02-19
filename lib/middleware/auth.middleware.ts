/**
 * API Middleware Utilities
 * Helper functions for auth verification and error handling in API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateWallet } from '../services/auth.service'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    walletAddress: string
    userType: 'borrower' | 'store-owner'
    email: string
  }
}

/**
 * Verify wallet signature from request headers
 * Expects: Authorization: Bearer <wallet_address>
 * In production, this should verify a signed message
 */
export async function verifyAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return null
    }

    // Extract wallet address from Bearer token
    const walletAddress = authHeader.replace('Bearer ', '').trim()

    if (!walletAddress) {
      return null
    }

    // Authenticate the wallet
    const user = await authenticateWallet(walletAddress)

    return user
  } catch (error) {
    console.error('Auth verification error:', error)
    return null
  }
}

/**
 * Middleware wrapper to protect API routes
 * Usage: export const POST = withAuth(handler, 'borrower')
 */
export function withAuth(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  requiredUserType?: 'borrower' | 'store-owner'
) {
  return async (req: NextRequest, context?: any) => {
    try {
      const user = await verifyAuth(req)

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized. Please connect your wallet.' },
          { status: 401 }
        )
      }

      // Check user type if specified
      if (requiredUserType && user.userType !== requiredUserType) {
        return NextResponse.json(
          { error: `Access denied. This endpoint requires ${requiredUserType} role.` },
          { status: 403 }
        )
      }

      // Attach user to request for use in handler
      ;(req as any).user = user

      // Call the actual handler
      return await handler(req, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Optional auth - doesn't reject unauthenticated requests
 * but attaches user if authenticated
 */
export function withOptionalAuth(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    try {
      const user = await verifyAuth(req)

      if (user) {
        ;(req as any).user = user
      }

      return await handler(req, context)
    } catch (error) {
      console.error('Optional auth middleware error:', error)
      return await handler(req, context)
    }
  }
}

/**
 * Extract wallet address from request body
 */
export async function getWalletFromBody(req: NextRequest): Promise<string | null> {
  try {
    const body = await req.json()
    return body.wallet_address || body.walletAddress || body.pubkey || null
  } catch {
    return null
  }
}

/**
 * Standard error response
 */
export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Standard success response
 */
export function successResponse(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Extract request metadata (IP, user agent, etc.)
 */
export function getRequestMetadata(req: NextRequest) {
  return {
    ipAddress: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    referer: req.headers.get('referer') || null,
  }
}

/**
 * Validate required fields in request body
 */
export async function validateRequiredFields(
  req: NextRequest,
  fields: string[]
): Promise<{ valid: boolean; missing?: string[]; body?: any }> {
  try {
    const body = await req.json()
    const missing = fields.filter((field) => !(field in body) || body[field] === null || body[field] === undefined)

    if (missing.length > 0) {
      return { valid: false, missing }
    }

    return { valid: true, body }
  } catch (error) {
    return { valid: false }
  }
}

/**
 * Rate limiting helper (basic implementation)
 * In production, use a proper rate limiting solution like Upstash
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests = 10,
  windowMs = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetAt) {
    // Create new record
    const resetAt = now + windowMs
    rateLimitMap.set(identifier, { count: 1, resetAt })
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  // Increment count
  record.count++
  rateLimitMap.set(identifier, record)

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.resetAt,
  }
}

/**
 * CORS headers for API responses
 */
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

/**
 * Handle OPTIONS request for CORS
 */
export function handleOptions() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  })
}
