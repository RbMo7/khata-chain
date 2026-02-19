import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { searchBorrowers } from '@/lib/services'

/**
 * GET /api/search/borrowers
 * Search for borrowers by name or email (Store owners only)
 * Query params: q (search query), limit (optional, default: 20)
 */
async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    // If query is provided but too short, return error
    if (query && query.length < 2) {
      return errorResponse('Search query must be at least 2 characters', 400)
    }

    const results = await searchBorrowers(query, limit)

    return successResponse({
      results,
      total: results.length,
      query,
    })
  } catch (error) {
    console.error('[Search Borrowers] Error:', error)
    return errorResponse('Failed to search borrowers', 500)
  }
}

export const GET = withAuth(handler, 'store-owner')
