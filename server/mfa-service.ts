import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface TOTPSetup {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export interface MFAVerificationResult {
  success: boolean;
  type?: 'totp' | 'backup';
  message?: string;
}

export class MFAService {
  private static readonly SERVICE_NAME = 'RWA Pawn Platform';
  private static readonly ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  
  /**
   * Generate TOTP setup for a user
   */
  static async generateTOTPSetup(userEmail: string): Promise<TOTPSetup> {
    // Generate a secret
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: this.SERVICE_NAME,
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    // Generate backup codes (10 codes, 8 characters each)
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    return {
      secret: this.encryptSecret(secret.base32),
      qrCodeUrl,
      manualEntryKey: secret.base32,
      backupCodes
    };
  }

  /**
   * Verify TOTP token
   */
  static verifyTOTP(encryptedSecret: string, token: string, window: number = 1): boolean {
    try {
      const secret = this.decryptSecret(encryptedSecret);
      
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: token.replace(/\s/g, ''), // Remove spaces
        window // Allow some time drift
      });
    } catch (error) {
      console.error('TOTP verification error:', error);
      return false;
    }
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(hashedBackupCodes: string[], inputCode: string): Promise<boolean> {
    const cleanCode = inputCode.replace(/\s/g, '').toUpperCase();
    
    for (const hashedCode of hashedBackupCodes) {
      if (await bcrypt.compare(cleanCode, hashedCode)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Hash backup codes for storage
   */
  static async hashBackupCodes(backupCodes: string[]): Promise<string[]> {
    return Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 12))
    );
  }

  /**
   * Generate new backup codes
   */
  static generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
  }

  /**
   * Encrypt TOTP secret for database storage
   */
  private static encryptSecret(secret: string): string {
    const iv = crypto.randomBytes(16); // Generate random IV
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted; // Prepend IV to encrypted data
  }

  /**
   * Decrypt TOTP secret from database
   */
  private static decryptSecret(encryptedSecret: string): string {
    const parts = encryptedSecret.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted secret format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Generate current TOTP for testing purposes (development only)
   */
  static generateCurrentTOTP(encryptedSecret: string): string {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('TOTP generation not allowed in production');
    }
    
    const secret = this.decryptSecret(encryptedSecret);
    return speakeasy.totp({
      secret,
      encoding: 'base32'
    });
  }

  /**
   * Validate MFA setup requirements
   */
  static validateMFARequirements(userRole?: string): boolean {
    // Require MFA for admin users and high-value operations
    if (userRole === 'admin') {
      return true;
    }
    
    // Optional for regular users but recommended
    return false;
  }
}