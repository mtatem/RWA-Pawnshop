import crypto from 'crypto';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;
  private static readonly SALT_LENGTH = 32;
  
  // Master encryption key derived from environment variable
  private static readonly MASTER_KEY = process.env.ENCRYPTION_KEY || this.generateKey();
  
  /**
   * Generate a new encryption key
   */
  static generateKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex');
  }
  
  /**
   * Derive encryption key from master key and salt
   */
  private static deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(this.MASTER_KEY, salt, 100000, this.KEY_LENGTH, 'sha256');
  }
  
  /**
   * Encrypt sensitive data with AES-256-GCM
   */
  static encrypt(data: string): string {
    if (!data) return data;
    
    try {
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const key = this.deriveKey(salt);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      cipher.setAAD(Buffer.from('additional-auth-data'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ]);
      
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string): string {
    if (!encryptedData) return encryptedData;
    
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      const salt = combined.subarray(0, this.SALT_LENGTH);
      const iv = combined.subarray(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const tag = combined.subarray(this.SALT_LENGTH + this.IV_LENGTH, this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);
      const encrypted = combined.subarray(this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);
      
      const key = this.deriveKey(salt);
      
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAAD(Buffer.from('additional-auth-data'));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Hash sensitive data for storage (one-way)
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Generate secure random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  /**
   * Secure compare for preventing timing attacks
   */
  static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
  
  /**
   * Encrypt PII fields in an object
   */
  static encryptPII(data: Record<string, any>, fields: string[]): Record<string, any> {
    const encrypted = { ...data };
    
    for (const field of fields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    }
    
    return encrypted;
  }
  
  /**
   * Decrypt PII fields in an object
   */
  static decryptPII(data: Record<string, any>, fields: string[]): Record<string, any> {
    const decrypted = { ...data };
    
    for (const field of fields) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = this.decrypt(decrypted[field]);
        } catch (error) {
          console.warn(`Failed to decrypt field ${field}:`, error);
          // Keep original value if decryption fails (might not be encrypted)
        }
      }
    }
    
    return decrypted;
  }
}

// Ensure encryption key is available
if (!process.env.ENCRYPTION_KEY) {
  console.warn('ENCRYPTION_KEY not set in environment variables. Using generated key (not recommended for production).');
  console.warn('Generated key:', EncryptionService.generateKey());
}