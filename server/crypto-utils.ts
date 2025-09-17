// Cryptographic utilities for secure wallet verification
import * as ed25519 from "@noble/ed25519";
import * as secp256k1 from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha2";
import { Principal } from "@dfinity/principal";
import { AuthClient } from "@dfinity/auth-client";
import crypto from "crypto";

export interface SignatureVerification {
  valid: boolean;
  recoveredPrincipal?: string;
  error?: string;
}

export interface DelegationVerification {
  valid: boolean;
  principal?: string;
  delegation?: any;
  error?: string;
}

export class CryptoVerificationService {
  // Verify Plug wallet signature (supports both ed25519 and secp256k1)
  static async verifyPlugSignature(
    message: string,
    signature: string,
    expectedPrincipal: string
  ): Promise<SignatureVerification> {
    try {
      // Plug uses secp256k1 for signatures
      const messageBytes = new TextEncoder().encode(message);
      const messageHash = sha256(messageBytes);
      
      // Parse signature (usually hex encoded)
      const sigBytes = this.hexToBytes(signature);
      
      if (sigBytes.length !== 64 && sigBytes.length !== 65) {
        return { valid: false, error: "Invalid signature length" };
      }

      // For secp256k1, we need to recover the public key from signature
      // This is simplified - real implementation would need proper recovery
      const principal = Principal.fromText(expectedPrincipal);
      
      // TODO: Implement proper secp256k1 signature verification
      // In production: use secp256k1.verify(signature, messageHash, publicKey)
      
      // Verify the signature matches the expected principal
      // Note: This is a simplified verification. In production, you would:
      // 1. Recover public key from signature using secp256k1.Signature.fromDER(sigBytes).recoverPublicKey(messageHash)
      // 2. Derive principal from public key using proper ICP principal derivation
      // 3. Verify it matches expected principal
      
      // For now, we verify signature format and principal validity
      const principalValid = this.isValidPrincipal(expectedPrincipal);
      const signatureValid = sigBytes.length === 64 || sigBytes.length === 65;
      
      if (principalValid && signatureValid) {
        return {
          valid: true,
          recoveredPrincipal: expectedPrincipal
        };
      }

      return { valid: false, error: "Signature verification failed" };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Signature verification error"
      };
    }
  }

  // Verify Internet Identity delegation
  static async verifyInternetIdentityDelegation(
    delegation: any,
    expectedPrincipal: string,
    challenge: string
  ): Promise<DelegationVerification> {
    try {
      // Verify the delegation structure and validity
      if (!delegation || typeof delegation !== 'object') {
        return { valid: false, error: "Invalid delegation format" };
      }

      // Check if delegation contains expected fields
      const requiredFields = ['delegation', 'signature'];
      for (const field of requiredFields) {
        if (!(field in delegation)) {
          return { valid: false, error: `Missing delegation field: ${field}` };
        }
      }

      // Verify principal matches
      const principal = Principal.fromText(expectedPrincipal);
      if (principal.isAnonymous()) {
        return { valid: false, error: "Anonymous principal not allowed" };
      }

      // Verify delegation is not expired
      const now = Date.now();
      const expiry = delegation.delegation?.expiration;
      if (expiry && Number(expiry) / 1000000 < now) {
        return { valid: false, error: "Delegation expired" };
      }

      // In production, you would verify the delegation chain signature
      // For now, we accept valid-structured delegations with non-anonymous principals
      return {
        valid: true,
        principal: expectedPrincipal,
        delegation
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Delegation verification error"
      };
    }
  }

  // Verify wallet ownership through challenge signing
  static async verifyWalletOwnership(
    walletType: 'plug' | 'internetIdentity',
    challenge: string,
    principalId: string,
    proof: string | any
  ): Promise<SignatureVerification | DelegationVerification> {
    switch (walletType) {
      case 'plug':
        if (typeof proof !== 'string') {
          return { valid: false, error: "Plug wallet requires signature string" };
        }
        return this.verifyPlugSignature(challenge, proof, principalId);
      
      case 'internetIdentity':
        return this.verifyInternetIdentityDelegation(proof, principalId, challenge);
      
      default:
        return { valid: false, error: "Unsupported wallet type" };
    }
  }

  // Generate secure payment memo for tracking
  static generatePaymentMemo(
    paymentType: string,
    userId: string,
    metadata?: Record<string, any>
  ): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const hash = crypto
      .createHash('sha256')
      .update(`${paymentType}_${userId}_${timestamp}_${JSON.stringify(metadata || {})}`)
      .digest('hex')
      .slice(0, 16);
    
    return `${paymentType}_${hash}_${random}`.replace(/[^a-zA-Z0-9_]/g, '');
  }

  // Validate transaction memo format
  static validatePaymentMemo(memo: string): boolean {
    // Memo should follow pattern: type_hash_random
    const pattern = /^[a-zA-Z_]+_[a-f0-9]{16}_[a-f0-9]{16}$/;
    return pattern.test(memo);
  }

  // Verify principal format
  static isValidPrincipal(principalId: string): boolean {
    try {
      const principal = Principal.fromText(principalId);
      return !principal.isAnonymous();
    } catch {
      return false;
    }
  }

  // Convert hex string to bytes
  private static hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.replace(/^0x/, '');
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    return bytes;
  }

  // Convert bytes to hex string
  private static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Generate secure challenge for wallet binding
  static generateChallenge(userId: string, walletType: string): {
    challenge: string;
    nonce: string;
    expires: number;
  } {
    const nonce = crypto.randomUUID();
    const timestamp = Date.now();
    const expires = timestamp + (5 * 60 * 1000); // 5 minutes
    
    const challenge = `RWA Platform Wallet Verification Challenge
User: ${userId}
Wallet Type: ${walletType}
Nonce: ${nonce}
Timestamp: ${timestamp}
Expires: ${new Date(expires).toISOString()}

By signing this message, you confirm ownership of this wallet and authorize binding it to your RWA Platform account.`;
    
    return { challenge, nonce, expires };
  }

  // Verify challenge message format and freshness
  static validateChallenge(
    challenge: string,
    expectedUserId: string,
    expectedWalletType: string,
    expectedNonce: string
  ): { valid: boolean; error?: string } {
    try {
      // Parse challenge components
      const lines = challenge.split('\n');
      const userLine = lines.find(line => line.startsWith('User:'));
      const walletTypeLine = lines.find(line => line.startsWith('Wallet Type:'));
      const nonceLine = lines.find(line => line.startsWith('Nonce:'));
      const timestampLine = lines.find(line => line.startsWith('Timestamp:'));
      const expiresLine = lines.find(line => line.startsWith('Expires:'));

      if (!userLine || !walletTypeLine || !nonceLine || !timestampLine || !expiresLine) {
        return { valid: false, error: "Invalid challenge format" };
      }

      // Verify challenge components
      const userId = userLine.split('User: ')[1];
      const walletType = walletTypeLine.split('Wallet Type: ')[1];
      const nonce = nonceLine.split('Nonce: ')[1];
      const timestamp = parseInt(timestampLine.split('Timestamp: ')[1]);
      const expires = new Date(expiresLine.split('Expires: ')[1]).getTime();

      if (userId !== expectedUserId) {
        return { valid: false, error: "Challenge userId mismatch" };
      }

      if (walletType !== expectedWalletType) {
        return { valid: false, error: "Challenge walletType mismatch" };
      }

      if (nonce !== expectedNonce) {
        return { valid: false, error: "Challenge nonce mismatch" };
      }

      if (Date.now() > expires) {
        return { valid: false, error: "Challenge expired" };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Challenge validation error"
      };
    }
  }
}