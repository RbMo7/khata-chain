import { NextResponse } from 'next/server'

// ── Hardcoded fallbacks (used when all live sources fail) ─────────────────────
// Update these periodically; they are only the last-resort values.
const FALLBACK_SOL_USD = 130        // ~current SOL price in USD
const FALLBACK_NPR_PER_USD = 135.5  // central bank mid-rate

/** Fetch with a strict ms timeout. Throws on timeout or network error. */
async function fetchWithTimeout(url: string, ms = 4000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Try multiple sources for SOL/USD price (in order of reliability/speed).
 * Returns the price in USD or null if all fail.
 */
async function fetchSolUSD(): Promise<number | null> {
  // 1. Binance public ticker — fast, no key, no rate limit for simple price
  try {
    const res = await fetchWithTimeout(
      'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT',
      4000
    )
    if (res.ok) {
      const json = await res.json()
      const price = parseFloat(json?.price)
      if (!isNaN(price) && price > 0) return price
    }
  } catch { /* fall through */ }

  // 2. CoinGecko (sometimes slow / rate-limited)
  try {
    const res = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      5000
    )
    if (res.ok) {
      const json = await res.json()
      const price = json?.solana?.usd
      if (price && price > 0) return price
    }
  } catch { /* fall through */ }

  // 3. CoinCap (alternative)
  try {
    const res = await fetchWithTimeout(
      'https://api.coincap.io/v2/assets/solana',
      4000
    )
    if (res.ok) {
      const json = await res.json()
      const price = parseFloat(json?.data?.priceUsd)
      if (!isNaN(price) && price > 0) return price
    }
  } catch { /* fall through */ }

  return null
}

/**
 * GET /api/sol-price
 * Returns { solUSD, nprPerUsd, solPriceNPR, fallback: boolean }
 *
 * Always returns 200 — uses hardcoded fallback values if live sources fail
 * so the repay page is never blocked.
 */
export async function GET() {
  // Run SOL price fetch and NPR/USD rate fetch in parallel with independent timeouts
  const [solUSD, nprPerUsd] = await Promise.all([
    fetchSolUSD(),
    (async (): Promise<number> => {
      try {
        const res = await fetchWithTimeout(
          'https://open.er-api.com/v6/latest/USD',
          4000
        )
        if (res.ok) {
          const json = await res.json()
          const rate = json?.rates?.NPR
          if (rate && rate > 0) return rate
        }
      } catch { /* fall through */ }
      return FALLBACK_NPR_PER_USD
    })(),
  ])

  const resolvedSolUSD = solUSD ?? FALLBACK_SOL_USD
  const resolvedNprPerUsd = nprPerUsd
  const solPriceNPR = resolvedSolUSD * resolvedNprPerUsd
  const isFallback = !solUSD

  if (isFallback) {
    console.warn('[sol-price] All live price sources failed — using hardcoded fallback')
  }

  return NextResponse.json(
    {
      solUSD: resolvedSolUSD,
      nprPerUsd: resolvedNprPerUsd,
      solPriceNPR,
      fallback: isFallback,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    }
  )
}
