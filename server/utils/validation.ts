import { z } from "zod";
import DOMPurify from 'isomorphic-dompurify';

// Input sanitization utilities
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // Strip all HTML tags
      ALLOWED_ATTR: []  // Strip all attributes
    });
  }

  /**
   * Sanitize plain text input
   */
  static sanitizeText(input: string, options: {
    maxLength?: number;
    allowSpecialChars?: boolean;
    trim?: boolean;
  } = {}): string {
    const { maxLength = 10000, allowSpecialChars = true, trim = true } = options;

    let sanitized = input;

    if (trim) {
      sanitized = sanitized.trim();
    }

    // Remove null bytes and other control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Optionally remove special characters (keep only alphanumeric, spaces, basic punctuation)
    if (!allowSpecialChars) {
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s.,!?'-]/g, '');
    }

    // Truncate to max length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Sanitize filename for safe file operations
   */
  static sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let sanitized = filename.replace(/[<>:"/\\|?*]/g, '_');
    sanitized = sanitized.replace(/^\.+/, '_'); // No leading dots
    sanitized = sanitized.replace(/\s+/g, '_'); // Replace spaces with underscores
    sanitized = sanitized.replace(/_{2,}/g, '_'); // Collapse multiple underscores
    
    // Ensure reasonable length
    if (sanitized.length > 255) {
      const extension = sanitized.split('.').pop();
      const name = sanitized.substring(0, 255 - (extension?.length || 0) - 1);
      sanitized = `${name}.${extension}`;
    }

    return sanitized;
  }

  /**
   * Sanitize URL input
   */
  static sanitizeUrl(url: string): string | null {
    try {
      // Remove any potential XSS or malicious schemes
      if (url.toLowerCase().startsWith('javascript:') || 
          url.toLowerCase().startsWith('data:') ||
          url.toLowerCase().startsWith('vbscript:')) {
        return null;
      }

      const parsed = new URL(url);
      
      // Only allow http and https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }

      return parsed.toString();
    } catch {
      return null;
    }
  }
}

// Blockchain address validation utilities
export class AddressValidator {
  /**
   * Validate ICP Principal ID format
   */
  static isValidPrincipalId(principal: string): boolean {
    try {
      // ICP Principal format: base32 encoded with specific length constraints
      if (!principal || typeof principal !== 'string') return false;
      
      // Remove hyphens for validation
      const cleanPrincipal = principal.replace(/-/g, '');
      
      // Check length constraints (5-63 characters without hyphens)
      if (cleanPrincipal.length < 5 || cleanPrincipal.length > 63) return false;
      
      // Check base32 alphabet (RFC 4648)
      const base32Regex = /^[a-z2-7]+$/i;
      return base32Regex.test(cleanPrincipal);
    } catch {
      return false;
    }
  }

  /**
   * Validate ICP AccountIdentifier (hex format, 64 characters)
   */
  static isValidAccountId(accountId: string): boolean {
    if (!accountId || typeof accountId !== 'string') return false;
    
    // Must be exactly 64 hex characters
    return /^[0-9a-fA-F]{64}$/.test(accountId);
  }

  /**
   * Validate Ethereum address with checksum verification
   */
  static isValidEthereumAddress(address: string): { valid: boolean; checksumValid?: boolean } {
    if (!address || typeof address !== 'string') {
      return { valid: false };
    }

    // Remove 0x prefix
    const cleanAddress = address.toLowerCase().replace('0x', '');
    
    // Must be 40 hex characters
    if (!/^[0-9a-f]{40}$/.test(cleanAddress)) {
      return { valid: false };
    }

    // Check if it has mixed case (checksum format)
    const hasUpperCase = /[A-F]/.test(address.replace('0x', ''));
    const hasLowerCase = /[a-f]/.test(address.replace('0x', ''));
    
    if (hasUpperCase && hasLowerCase) {
      // Verify EIP-55 checksum
      const checksumValid = this.verifyEthereumChecksum(address);
      return { valid: true, checksumValid };
    }

    return { valid: true, checksumValid: true }; // All lowercase is valid
  }

  /**
   * Verify Ethereum address EIP-55 checksum
   */
  private static verifyEthereumChecksum(address: string): boolean {
    try {
      const crypto = require('crypto');
      const cleanAddress = address.toLowerCase().replace('0x', '');
      const hash = crypto.createHash('sha3-256').update(cleanAddress, 'hex').digest('hex');
      
      for (let i = 0; i < 40; i++) {
        const char = address.charAt(i + (address.startsWith('0x') ? 2 : 0));
        const expectedCase = parseInt(hash.charAt(i), 16) >= 8 ? 'uppercase' : 'lowercase';
        
        if (char !== char.toLowerCase() && char !== char.toUpperCase()) continue;
        
        const actualCase = char === char.toUpperCase() ? 'uppercase' : 'lowercase';
        if (actualCase !== expectedCase) return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate bridge address based on network
   */
  static validateBridgeAddress(
    address: string, 
    network: string, 
    format: 'principal' | 'accountId' | 'address'
  ): { valid: boolean; error?: string } {
    if (!address) {
      return { valid: false, error: 'Address is required' };
    }

    try {
      switch (network.toLowerCase()) {
        case 'icp':
          if (format === 'principal') {
            const isValid = this.isValidPrincipalId(address);
            return isValid ? { valid: true } : { valid: false, error: 'Invalid ICP Principal ID format' };
          } else if (format === 'accountId') {
            const isValid = this.isValidAccountId(address);
            return isValid ? { valid: true } : { valid: false, error: 'Invalid ICP Account ID format' };
          }
          break;
          
        case 'ethereum':
          if (format === 'address') {
            const validation = this.isValidEthereumAddress(address);
            if (!validation.valid) {
              return { valid: false, error: 'Invalid Ethereum address format' };
            }
            if (validation.checksumValid === false) {
              return { valid: false, error: 'Invalid Ethereum address checksum' };
            }
            return { valid: true };
          }
          break;
          
        default:
          return { valid: false, error: `Unsupported network: ${network}` };
      }
      
      return { valid: false, error: `Invalid format '${format}' for network '${network}'` };
    } catch (error) {
      return { valid: false, error: `Address validation error: ${error}` };
    }
  }
}

// Financial validation utilities
export class FinancialValidator {
  /**
   * Validate monetary amount
   */
  static isValidAmount(amount: number | string, options: {
    min?: number;
    max?: number;
    decimalPlaces?: number;
    allowZero?: boolean;
  } = {}): { valid: boolean; error?: string } {
    const { min = 0, max = Number.MAX_SAFE_INTEGER, decimalPlaces = 2, allowZero = false } = options;
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return { valid: false, error: 'Amount must be a valid number' };
    }

    if (!allowZero && numAmount === 0) {
      return { valid: false, error: 'Amount must be greater than zero' };
    }

    if (numAmount < min) {
      return { valid: false, error: `Amount must be at least ${min}` };
    }

    if (numAmount > max) {
      return { valid: false, error: `Amount must be no more than ${max}` };
    }

    // Check decimal places
    const decimalCount = numAmount.toString().split('.')[1]?.length || 0;
    if (decimalCount > decimalPlaces) {
      return { valid: false, error: `Amount can have at most ${decimalPlaces} decimal places` };
    }

    return { valid: true };
  }

  /**
   * Validate percentage value
   */
  static isValidPercentage(percentage: number | string): { valid: boolean; error?: string } {
    const numPercentage = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
    
    if (isNaN(numPercentage)) {
      return { valid: false, error: 'Percentage must be a valid number' };
    }

    if (numPercentage < 0 || numPercentage > 100) {
      return { valid: false, error: 'Percentage must be between 0 and 100' };
    }

    return { valid: true };
  }

  /**
   * Validate interest rate
   */
  static isValidInterestRate(rate: number | string): { valid: boolean; error?: string } {
    const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
    
    if (isNaN(numRate)) {
      return { valid: false, error: 'Interest rate must be a valid number' };
    }

    // Reasonable interest rate bounds (0% to 1000% APR)
    if (numRate < 0 || numRate > 1000) {
      return { valid: false, error: 'Interest rate must be between 0% and 1000%' };
    }

    return { valid: true };
  }
}

// File validation utilities
export class FileValidator {
  private static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain'
  ];

  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Validate file upload
   */
  static validateFile(file: {
    mimetype: string;
    size: number;
    originalname: string;
    buffer?: Buffer;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      errors.push(`File type '${file.mimetype}' is not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(this.MAX_FILE_SIZE / 1024 / 1024)}MB)`);
    }

    // Check filename
    const sanitizedName = InputSanitizer.sanitizeFilename(file.originalname);
    if (sanitizedName !== file.originalname) {
      errors.push('Filename contains invalid characters');
    }

    // Basic magic byte validation for common formats
    if (file.buffer && file.buffer.length > 0) {
      const magicByteCheck = this.validateMagicBytes(file.buffer, file.mimetype);
      if (!magicByteCheck) {
        errors.push('File content does not match declared file type');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate file magic bytes against MIME type
   */
  private static validateMagicBytes(buffer: Buffer, mimetype: string): boolean {
    const header = buffer.subarray(0, 12);

    switch (mimetype) {
      case 'image/jpeg':
        return header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
      
      case 'image/png':
        return (
          header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47 &&
          header[4] === 0x0D && header[5] === 0x0A && header[6] === 0x1A && header[7] === 0x0A
        );
      
      case 'image/webp':
        return (
          header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
          header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
        );
      
      case 'image/gif':
        return (
          (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38 && header[4] === 0x37 && header[5] === 0x61) ||
          (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38 && header[4] === 0x39 && header[5] === 0x61)
        );
      
      case 'application/pdf':
        return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
      
      case 'text/plain':
        // Text files can have any content, just ensure it's not binary
        return !this.isBinaryBuffer(buffer.subarray(0, 1024));
      
      default:
        return true; // Allow unknown types to pass magic byte check
    }
  }

  /**
   * Check if buffer contains binary data
   */
  private static isBinaryBuffer(buffer: Buffer): boolean {
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      // Check for null bytes or other control characters that suggest binary content
      if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
        return true;
      }
    }
    return false;
  }
}

// Custom Zod validators
export const customValidators = {
  // Sanitized string validator
  sanitizedString: (options: {
    maxLength?: number;
    allowSpecialChars?: boolean;
    required?: boolean;
  } = {}) => {
    const { maxLength = 1000, allowSpecialChars = true, required = true } = options;
    
    let schema = z.string();
    
    if (required) {
      schema = schema.min(1, 'This field is required');
    }
    
    return schema.transform((val) => 
      InputSanitizer.sanitizeText(val, { maxLength, allowSpecialChars })
    ).refine((val) => required ? val.length > 0 : true, {
      message: 'This field is required after sanitization'
    });
  },

  // Financial amount validator
  financialAmount: (options: {
    min?: number;
    max?: number;
    decimalPlaces?: number;
  } = {}) => {
    const { min = 0, max = 1000000000, decimalPlaces = 2 } = options;
    
    return z.union([z.string(), z.number()])
      .transform((val) => typeof val === 'string' ? parseFloat(val) : val)
      .refine((val) => !isNaN(val), { message: 'Must be a valid number' })
      .refine((val) => val >= min, { message: `Must be at least ${min}` })
      .refine((val) => val <= max, { message: `Must be no more than ${max}` })
      .refine((val) => {
        const decimalCount = val.toString().split('.')[1]?.length || 0;
        return decimalCount <= decimalPlaces;
      }, { message: `Can have at most ${decimalPlaces} decimal places` });
  },

  // URL validator with sanitization
  sanitizedUrl: () => {
    return z.string()
      .transform((val) => InputSanitizer.sanitizeUrl(val))
      .refine((val) => val !== null, { message: 'Invalid or unsafe URL' });
  },

  // Principal ID validator
  principalId: () => {
    return z.string()
      .min(1, 'Principal ID is required')
      .refine((val) => AddressValidator.isValidPrincipalId(val), {
        message: 'Invalid ICP Principal ID format'
      });
  },

  // Ethereum address validator
  ethereumAddress: () => {
    return z.string()
      .min(1, 'Ethereum address is required')
      .refine((val) => {
        const validation = AddressValidator.isValidEthereumAddress(val);
        return validation.valid && validation.checksumValid !== false;
      }, {
        message: 'Invalid Ethereum address or checksum'
      });
  },

  // Account ID validator
  accountId: () => {
    return z.string()
      .min(1, 'Account ID is required')
      .refine((val) => AddressValidator.isValidAccountId(val), {
        message: 'Invalid ICP Account ID format'
      });
  }
};