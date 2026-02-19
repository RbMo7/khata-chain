/**
 * Currency utilities for formatting Nepali Rupees
 */

export const CURRENCY = {
  code: 'NPR',
  symbol: 'रू',
  name: 'Nepali Rupee',
  locale: 'ne-NP',
};

/**
 * Format amount in paisa (smallest unit) to NPR string
 * @param amountInPaisa - Amount in paisa (1 NPR = 100 paisa)
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatNPR(
  amountInPaisa: number,
  options?: {
    showSymbol?: boolean;
    showCode?: boolean;
    decimals?: number;
  }
): string {
  const {
    showSymbol = true,
    showCode = false,
    decimals = 2,
  } = options || {};

  const amount = amountInPaisa / 100;
  
  // Format number with Nepali locale
  const formattedAmount = amount.toLocaleString('en-NP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  let result = formattedAmount;

  if (showSymbol) {
    result = `${CURRENCY.symbol} ${result}`;
  }

  if (showCode) {
    result = `${result} ${CURRENCY.code}`;
  }

  return result;
}

/**
 * Format amount without symbol (just the number)
 */
export function formatAmount(amountInPaisa: number, decimals: number = 2): string {
  return formatNPR(amountInPaisa, { showSymbol: false, decimals });
}

/**
 * Format compact amount (for large numbers)
 * Example: 1000000 paisa = रू 10K
 */
export function formatCompactNPR(amountInPaisa: number): string {
  const amount = amountInPaisa / 100;
  
  if (amount >= 10000000) { // 1 crore
    return `${CURRENCY.symbol} ${(amount / 10000000).toFixed(2)}Cr`;
  } else if (amount >= 100000) { // 1 lakh
    return `${CURRENCY.symbol} ${(amount / 100000).toFixed(2)}L`;
  } else if (amount >= 1000) { // 1 thousand
    return `${CURRENCY.symbol} ${(amount / 1000).toFixed(2)}K`;
  }
  
  return formatNPR(amountInPaisa);
}

/**
 * Parse NPR string to paisa
 * @param value - String value (can include currency symbol)
 * @returns Amount in paisa
 */
export function parseNPR(value: string): number {
  // Remove currency symbol, spaces, and commas
  const cleaned = value
    .replace(CURRENCY.symbol, '')
    .replace(/[,\s]/g, '')
    .trim();
  
  const amount = parseFloat(cleaned);
  
  if (isNaN(amount)) {
    return 0;
  }
  
  // Convert to paisa (multiply by 100)
  return Math.round(amount * 100);
}

/**
 * Convert rupees to paisa
 */
export function rupeesToPaisa(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Convert paisa to rupees
 */
export function paisaToRupees(paisa: number): number {
  return paisa / 100;
}

/**
 * Validate NPR amount
 */
export function isValidAmount(amountInPaisa: number): boolean {
  return !isNaN(amountInPaisa) && amountInPaisa >= 0 && Number.isInteger(amountInPaisa);
}

/**
 * Format date for Nepal timezone
 */
export function formatDateNP(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format full date and time for Nepal  
 */
export function formatDateTimeNP(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
