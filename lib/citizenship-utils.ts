import crypto from 'crypto';

/**
 * Hash a citizenship number for privacy while preventing duplicates
 * Uses SHA-256 with a salt specific to your domain
 */
export function hashCitizenshipNumber(citizenshipNumber: string): string {
  if (!citizenshipNumber || citizenshipNumber.trim().length < 8) {
    throw new Error('Citizenship number must be at least 8 characters');
  }

  const normalizedNumber = citizenshipNumber.trim().toUpperCase();
  
  // Use a domain-specific salt for extra security
  const salt = process.env.CITIZENSHIP_HASH_SALT || 'khatachain-default-salt';
  
  return crypto
    .createHash('sha256')
    .update(normalizedNumber + salt)
    .digest('hex');
}

/**
 * Validate citizenship number format
 * Supports Aadhar (12 digits) and other ID formats
 */
export function validateCitizenshipNumber(citizenshipNumber: string): {
  valid: boolean;
  error?: string;
} {
  if (!citizenshipNumber) {
    return { valid: false, error: 'Citizenship number is required' };
  }

  const trimmed = citizenshipNumber.trim();

  // Check length (8-20 characters to support various ID formats)
  if (trimmed.length < 8 || trimmed.length > 20) {
    return { valid: false, error: 'Must be 8-20 characters' };
  }

  // Allow alphanumeric characters and hyphens/spaces
  if (!/^[a-zA-Z0-9\s\-]+$/.test(trimmed)) {
    return { valid: false, error: 'Only letters, numbers, spaces, and hyphens allowed' };
  }

  return { valid: true };
}

/**
 * Check if a citizenship number is already registered
 */
export async function checkCitizenshipExists(
  citizenshipHash: string,
  supabaseClient: any
): Promise<{
  exists: boolean;
  borrowerPubkey?: string;
  walletAddress?: string;
  status?: string;
}> {
  try {
    const { data, error } = await supabaseClient
      .from('citizenship_registrations')
      .select('borrower_pubkey, first_wallet_address, status')
      .eq('citizenship_number_hash', citizenshipHash)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (not an error)
      console.error('Error checking citizenship:', error);
      return { exists: false };
    }

    if (data) {
      return {
        exists: true,
        borrowerPubkey: data.borrower_pubkey,
        walletAddress: data.first_wallet_address,
        status: data.status,
      };
    }

    return { exists: false };
  } catch (err) {
    console.error('Citizenship check error:', err);
    return { exists: false };
  }
}

/**
 * Register a new citizenship number
 */
export async function registerCitizenship(
  citizenshipHash: string,
  borrowerPubkey: string,
  walletAddress: string,
  supabaseClient: any
): Promise<{
  success: boolean;
  error?: string;
  id?: string;
}> {
  try {
    const { data, error } = await supabaseClient
      .from('citizenship_registrations')
      .insert({
        citizenship_number_hash: citizenshipHash,
        borrower_pubkey: borrowerPubkey,
        first_wallet_address: walletAddress,
        status: 'active',
        verified_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      // Check if it's a duplicate key error
      if (error.code === '23505') {
        return {
          success: false,
          error: 'This citizenship number is already registered',
        };
      }
      throw error;
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('Citizenship registration error:', err);
    return {
      success: false,
      error: err.message || 'Failed to register citizenship',
    };
  }
}

/**
 * Log citizenship verification attempt
 */
export async function logVerificationAttempt(
  citizenshipHash: string,
  walletAddress: string,
  result: 'allowed' | 'rejected_duplicate' | 'rejected_invalid',
  reason: string,
  supabaseClient: any
): Promise<void> {
  try {
    await supabaseClient.from('citizenship_verification_logs').insert({
      citizenship_hash: citizenshipHash,
      wallet_address: walletAddress,
      verification_result: result,
      reason,
      ip_address: null, // Set from request headers in API route
      user_agent: null, // Set from request headers in API route
    });
  } catch (err) {
    console.error('Failed to log verification attempt:', err);
    // Don't throw - logging failures shouldn't block the main flow
  }
}

/**
 * Suspend a citizenship registration (anti-fraud)
 */
export async function suspendCitizenship(
  citizenshipHash: string,
  reason: string,
  supabaseClient: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseClient
      .from('citizenship_registrations')
      .update({ status: 'suspended' })
      .eq('citizenship_number_hash', citizenshipHash);

    if (error) throw error;

    // Log the suspension
    await logVerificationAttempt(
      citizenshipHash,
      '',
      'rejected_invalid',
      `Suspended: ${reason}`,
      supabaseClient
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
