// Precise decimal to BigInt conversion utilities
// Avoids precision loss from parseFloat() by using string manipulation

/**
 * Convert a decimal string to BigInt with specified decimals
 * Example: parseToBigInt("1.5", 18) = 1500000000000000000n
 * 
 * @param value - Decimal string (e.g., "1.5" or "100.123456")
 * @param decimals - Number of decimal places (e.g., 18 for ETH, 6 for USDC)
 * @returns BigInt representation in smallest units
 */
export function parseToBigInt(value: string, decimals: number): bigint {
  // Remove leading/trailing whitespace
  const cleaned = value.trim();
  
  // Validate input
  if (!/^-?\d*\.?\d+$/.test(cleaned)) {
    throw new Error(`Invalid decimal string: ${value}`);
  }
  
  // Split into whole and fractional parts
  const [wholePart = '0', fractionalPart = ''] = cleaned.split('.');
  
  // Pad or truncate fractional part to match decimals
  let paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  
  // Combine whole and fractional parts
  const combined = wholePart + paddedFractional;
  
  // Convert to BigInt
  return BigInt(combined);
}

/**
 * Format BigInt to decimal string with proper precision
 * Example: formatBigIntToDecimal(1500000000000000000n, 18) = "1.5"
 * 
 * @param value - BigInt value in smallest units
 * @param decimals - Number of decimal places
 * @param maxDecimalPlaces - Maximum decimal places to display (default: show all non-zero)
 * @returns Decimal string representation
 */
export function formatBigIntToDecimal(
  value: bigint, 
  decimals: number, 
  maxDecimalPlaces?: number
): string {
  const divisor = BigInt(Math.pow(10, decimals));
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;
  
  // Handle negative values
  const isNegative = value < BigInt(0);
  const absFractional = fractionalPart < BigInt(0) ? -fractionalPart : fractionalPart;
  
  // Pad fractional part with leading zeros
  const fractionalStr = absFractional.toString().padStart(decimals, '0');
  
  // Trim trailing zeros
  const trimmed = fractionalStr.replace(/0+$/, '');
  
  // Apply max decimal places if specified
  const finalFractional = maxDecimalPlaces !== undefined
    ? trimmed.slice(0, maxDecimalPlaces).replace(/0+$/, '')
    : trimmed;
  
  if (finalFractional === '') {
    return wholePart.toString();
  }
  
  const sign = isNegative && (wholePart !== BigInt(0) || finalFractional !== '') ? '-' : '';
  return `${sign}${wholePart < BigInt(0) ? -wholePart : wholePart}.${finalFractional}`;
}

/**
 * Validate that a string is a valid decimal number
 * @param value - String to validate
 * @returns true if valid decimal string
 */
export function isValidDecimal(value: string): boolean {
  return /^-?\d*\.?\d+$/.test(value.trim());
}

/**
 * Calculate percentage of a BigInt value
 * Example: calculatePercentage(1000000n, 50) = 5000n (0.5% of 1000000)
 * 
 * @param amount - BigInt amount
 * @param basisPoints - Percentage in basis points (100 = 1%)
 * @returns Calculated percentage as BigInt
 */
export function calculatePercentage(amount: bigint, basisPoints: number): bigint {
  // Convert basis points to precise multiplier using 1e18 precision
  const percent = BigInt(basisPoints) * BigInt(1e14); // basisPoints/10000 * 1e18
  return (amount * percent) / BigInt(1e18);
}
