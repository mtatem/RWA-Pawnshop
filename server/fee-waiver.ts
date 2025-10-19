/**
 * Fee Waiver Service
 * 
 * Provides centralized fee waiver logic for specific users.
 * VIP users (mtatem@gmail.com, tatm@tatemweb.com) receive 100% fee waiver on all platform fees.
 */

// VIP users with complete fee waiver
const FEE_WAIVER_EMAILS = [
  'mtatem@gmail.com',
  'tatm@tatemweb.com'
];

export interface FeeWaiverResult {
  isWaived: boolean;
  originalFee: number;
  finalFee: number;
  waiverPercentage: number;
  reason?: string;
}

/**
 * Check if a user qualifies for fee waiver
 */
export function checkFeeWaiver(userEmail: string | null | undefined): boolean {
  if (!userEmail) return false;
  
  const normalizedEmail = userEmail.toLowerCase().trim();
  return FEE_WAIVER_EMAILS.includes(normalizedEmail);
}

/**
 * Calculate fee with waiver applied
 */
export function calculateFeeWithWaiver(
  originalFee: number,
  userEmail: string | null | undefined,
  feeType: 'listing' | 'marketplace' | 'interest' | 'bridge' | 'other' = 'other'
): FeeWaiverResult {
  const isWaived = checkFeeWaiver(userEmail);
  
  if (isWaived) {
    return {
      isWaived: true,
      originalFee,
      finalFee: 0,
      waiverPercentage: 100,
      reason: `VIP user fee waiver for ${feeType} fees`
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
export function calculateListingFee(userEmail: string | null | undefined): FeeWaiverResult {
  return calculateFeeWithWaiver(PLATFORM_FEES.LISTING_FEE_USDC, userEmail, 'listing');
}

/**
 * Calculate marketplace transaction fee with waiver
 */
export function calculateMarketplaceFee(
  saleAmount: number,
  userEmail: string | null | undefined
): FeeWaiverResult {
  const originalFee = saleAmount * PLATFORM_FEES.MARKETPLACE_RATE;
  return calculateFeeWithWaiver(originalFee, userEmail, 'marketplace');
}

/**
 * Calculate loan interest with waiver
 */
export function calculateLoanInterest(
  principal: number,
  days: number,
  userEmail: string | null | undefined
): FeeWaiverResult {
  // Daily interest = Principal × (APR / 365) × Days
  const originalFee = principal * (PLATFORM_FEES.LOAN_INTEREST_APR / 365) * days;
  return calculateFeeWithWaiver(originalFee, userEmail, 'interest');
}

/**
 * Calculate bridge transaction fee with waiver
 */
export function calculateBridgeFee(
  amount: number,
  userEmail: string | null | undefined
): FeeWaiverResult {
  const originalFee = amount * PLATFORM_FEES.BRIDGE_FEE_RATE;
  return calculateFeeWithWaiver(originalFee, userEmail, 'bridge');
}

/**
 * Get fee waiver status for a user
 */
export function getFeeWaiverStatus(userEmail: string | null | undefined): {
  hasWaiver: boolean;
  email?: string;
  benefits: string[];
} {
  const hasWaiver = checkFeeWaiver(userEmail);
  
  if (hasWaiver) {
    return {
      hasWaiver: true,
      email: userEmail || undefined,
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
