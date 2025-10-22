/**
 * Fee Waiver Service
 * 
 * Provides centralized fee waiver logic for admin users.
 * Admin users receive 100% fee waiver on all platform fees for beta testing.
 */

export interface FeeWaiverResult {
  isWaived: boolean;
  originalFee: number;
  finalFee: number;
  waiverPercentage: number;
  reason?: string;
}

export interface UserForFeeWaiver {
  email?: string | null;
  isAdmin?: boolean;
  role?: string;
}

/**
 * Check if a user qualifies for fee waiver
 * Only admin users (isAdmin = true OR role = 'administrator' OR role = 'manager') receive waivers
 */
export function checkFeeWaiverForUser(user: UserForFeeWaiver | null | undefined): boolean {
  if (!user) return false;
  
  // Check if user is admin (for beta testing)
  if (user.isAdmin === true || user.role === 'administrator' || user.role === 'manager') {
    return true;
  }
  
  return false;
}

/**
 * Calculate fee with waiver applied
 */
export function calculateFeeWithWaiverForUser(
  originalFee: number,
  user: UserForFeeWaiver | null | undefined,
  feeType: 'listing' | 'marketplace' | 'interest' | 'bridge' | 'other' = 'other'
): FeeWaiverResult {
  const isWaived = checkFeeWaiverForUser(user);
  
  if (isWaived) {
    return {
      isWaived: true,
      originalFee,
      finalFee: 0,
      waiverPercentage: 100,
      reason: `Admin beta testing fee waiver for ${feeType} fees`
    };
  }
  
  return {
    isWaived: false,
    originalFee,
    finalFee: originalFee,
    waiverPercentage: 0
  };
}

/**
 * Platform fee constants
 */
export const PLATFORM_FEES = {
  LISTING_FEE_USDC: 25,          // 25 USDC flat fee per listing
  MARKETPLACE_RATE: 0.03,         // 3% marketplace transaction fee
  LOAN_INTEREST_APR: 0.085,       // 8.5% APR on loans
  BRIDGE_FEE_RATE: 0.005,         // 0.5% bridge transaction fee
};

/**
 * Calculate listing fee with waiver
 */
export function calculateListingFeeForUser(user: UserForFeeWaiver | null | undefined): FeeWaiverResult {
  return calculateFeeWithWaiverForUser(PLATFORM_FEES.LISTING_FEE_USDC, user, 'listing');
}

/**
 * Calculate marketplace transaction fee with waiver
 */
export function calculateMarketplaceFeeForUser(
  saleAmount: number,
  user: UserForFeeWaiver | null | undefined
): FeeWaiverResult {
  const originalFee = saleAmount * PLATFORM_FEES.MARKETPLACE_RATE;
  return calculateFeeWithWaiverForUser(originalFee, user, 'marketplace');
}

/**
 * Calculate loan interest with waiver
 */
export function calculateLoanInterestForUser(
  principal: number,
  days: number,
  user: UserForFeeWaiver | null | undefined
): FeeWaiverResult {
  // Daily interest = Principal × (APR / 365) × Days
  const originalFee = principal * (PLATFORM_FEES.LOAN_INTEREST_APR / 365) * days;
  return calculateFeeWithWaiverForUser(originalFee, user, 'interest');
}

/**
 * Calculate bridge transaction fee with waiver
 */
export function calculateBridgeFeeForUser(
  amount: number,
  user: UserForFeeWaiver | null | undefined
): FeeWaiverResult {
  const originalFee = amount * PLATFORM_FEES.BRIDGE_FEE_RATE;
  return calculateFeeWithWaiverForUser(originalFee, user, 'bridge');
}

/**
 * Get fee waiver status for a user
 */
export function getFeeWaiverStatusForUser(user: UserForFeeWaiver | null | undefined): {
  hasWaiver: boolean;
  email?: string;
  reason?: string;
  benefits: string[];
} {
  const hasWaiver = checkFeeWaiverForUser(user);
  
  if (hasWaiver) {
    return {
      hasWaiver: true,
      email: user?.email || undefined,
      reason: 'Admin beta testing access',
      benefits: [
        '100% waiver on listing fees ($25 USDC value)',
        '100% waiver on marketplace transaction fees (3%)',
        '100% waiver on loan interest (8.5% APR)',
        '100% waiver on bridge transaction fees (0.5%)'
      ]
    };
  }
  
  return {
    hasWaiver: false,
    benefits: []
  };
}
