/**
 * Fee Waiver Service
 * 
 * Provides centralized fee waiver logic for specific users.
 * VIP users (mtatem@gmail.com, tatm@tatemweb.com) receive 100% fee waiver on all platform fees.
 * Admin users also receive 100% fee waiver for beta testing purposes.
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

export interface UserForFeeWaiver {
  email?: string | null;
  isAdmin?: boolean;
  role?: string;
}

/**
 * Check if a user qualifies for fee waiver (backward compatible)
 */
export function checkFeeWaiver(userEmail: string | null | undefined): boolean {
  if (!userEmail) return false;
  
  const normalizedEmail = userEmail.toLowerCase().trim();
  return FEE_WAIVER_EMAILS.includes(normalizedEmail);
}

/**
 * Check if a user qualifies for fee waiver (enhanced with admin support)
 */
export function checkFeeWaiverForUser(user: UserForFeeWaiver | null | undefined): boolean {
  if (!user) return false;
  
  // Check if user is admin (for beta testing)
  if (user.isAdmin === true || user.role === 'administrator' || user.role === 'manager') {
    return true;
  }
  
  // Check if user is a VIP by email
  if (user.email) {
    const normalizedEmail = user.email.toLowerCase().trim();
    return FEE_WAIVER_EMAILS.includes(normalizedEmail);
  }
  
  return false;
}

/**
 * Calculate fee with waiver applied (backward compatible - email only)
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
 * Calculate fee with waiver applied (enhanced with admin support)
 */
export function calculateFeeWithWaiverForUser(
  originalFee: number,
  user: UserForFeeWaiver | null | undefined,
  feeType: 'listing' | 'marketplace' | 'interest' | 'bridge' | 'other' = 'other'
): FeeWaiverResult {
  const isWaived = checkFeeWaiverForUser(user);
  
  if (isWaived) {
    const reason = user?.isAdmin || user?.role === 'administrator' || user?.role === 'manager'
      ? `Admin beta testing fee waiver for ${feeType} fees`
      : `VIP user fee waiver for ${feeType} fees`;
    
    return {
      isWaived: true,
      originalFee,
      finalFee: 0,
      waiverPercentage: 100,
      reason
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
 * Calculate listing fee with waiver (backward compatible - email only)
 */
export function calculateListingFee(userEmail: string | null | undefined): FeeWaiverResult {
  return calculateFeeWithWaiver(PLATFORM_FEES.LISTING_FEE_USDC, userEmail, 'listing');
}

/**
 * Calculate listing fee with waiver (enhanced with admin support)
 */
export function calculateListingFeeForUser(user: UserForFeeWaiver | null | undefined): FeeWaiverResult {
  return calculateFeeWithWaiverForUser(PLATFORM_FEES.LISTING_FEE_USDC, user, 'listing');
}

/**
 * Calculate marketplace transaction fee with waiver (backward compatible - email only)
 */
export function calculateMarketplaceFee(
  saleAmount: number,
  userEmail: string | null | undefined
): FeeWaiverResult {
  const originalFee = saleAmount * PLATFORM_FEES.MARKETPLACE_RATE;
  return calculateFeeWithWaiver(originalFee, userEmail, 'marketplace');
}

/**
 * Calculate marketplace transaction fee with waiver (enhanced with admin support)
 */
export function calculateMarketplaceFeeForUser(
  saleAmount: number,
  user: UserForFeeWaiver | null | undefined
): FeeWaiverResult {
  const originalFee = saleAmount * PLATFORM_FEES.MARKETPLACE_RATE;
  return calculateFeeWithWaiverForUser(originalFee, user, 'marketplace');
}

/**
 * Calculate loan interest with waiver (backward compatible - email only)
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
 * Calculate loan interest with waiver (enhanced with admin support)
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
 * Calculate bridge transaction fee with waiver (backward compatible - email only)
 */
export function calculateBridgeFee(
  amount: number,
  userEmail: string | null | undefined
): FeeWaiverResult {
  const originalFee = amount * PLATFORM_FEES.BRIDGE_FEE_RATE;
  return calculateFeeWithWaiver(originalFee, userEmail, 'bridge');
}

/**
 * Calculate bridge transaction fee with waiver (enhanced with admin support)
 */
export function calculateBridgeFeeForUser(
  amount: number,
  user: UserForFeeWaiver | null | undefined
): FeeWaiverResult {
  const originalFee = amount * PLATFORM_FEES.BRIDGE_FEE_RATE;
  return calculateFeeWithWaiverForUser(originalFee, user, 'bridge');
}

/**
 * Get fee waiver status for a user (backward compatible - email only)
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

/**
 * Get fee waiver status for a user (enhanced with admin support)
 */
export function getFeeWaiverStatusForUser(user: UserForFeeWaiver | null | undefined): {
  hasWaiver: boolean;
  email?: string;
  reason?: string;
  benefits: string[];
} {
  const hasWaiver = checkFeeWaiverForUser(user);
  
  if (hasWaiver) {
    const isAdmin = user?.isAdmin || user?.role === 'administrator' || user?.role === 'manager';
    const reason = isAdmin ? 'Admin beta testing access' : 'VIP user status';
    
    return {
      hasWaiver: true,
      email: user?.email || undefined,
      reason,
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
