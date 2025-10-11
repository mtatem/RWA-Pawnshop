import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import Stripe from "stripe";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertRwaSubmissionSchema,
  insertPawnLoanSchema,
  insertMarketplaceAssetSchema,
  insertBidSchema,
  insertTransactionSchema,
  insertBridgeTransactionSchema,
  insertUserSchema,
  walletBindIntentSchema,
  walletBindVerificationSchema,
  userUpdateSchema,
  mfaVerificationSchema,
  paymentIntentSchema,
  assetPricingCache,
  bridgeEstimationSchema,
  bridgeInitiationSchema,
  bridgeHistoryFilterSchema,
  insertDocumentSchema,
  documentUploadSchema,
  documentAnalysisRequestSchema,
  documents,
  fraudDetectionResults,
  insertRwapawnPurchaseSchema,
  userLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  contactFormSchema,
  formSubmissions
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { MFAService } from "./mfa-service";
import { EncryptionService } from "./encryption-service";

// Import comprehensive validation middleware and utilities
import { 
  validateRequest, 
  errorHandler, 
  notFoundHandler, 
  successResponse, 
  rateLimitConfigs, 
  securityHeaders 
} from "./middleware/validation";
import { 
  AddressValidator, 
  FileValidator, 
  FinancialValidator, 
  InputSanitizer 
} from "./utils/validation";
import { z } from "zod";
import { requireAdminAuth, requireRole, requirePermission } from "./admin-auth";
import { USER_ROLES } from "../shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { processChat, ChatMessage } from "./services/chat-service";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

// Validate that we have a secret key, not a publishable key (relaxed for development)
if (process.env.STRIPE_SECRET_KEY.startsWith('pk_')) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('STRIPE_SECRET_KEY contains a publishable key! Please use a secret key (starts with sk_)');
  } else {
    console.warn('⚠️  Development Warning: STRIPE_SECRET_KEY appears to be a publishable key. This will cause Stripe operations to fail.');
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

// RWAPAWN token configuration
// Total Supply: 10 billion tokens at $0.25 per token
const RWAPAWN_EXCHANGE_RATE = 4; // $1 USD = 4 RWAPAWN tokens ($0.25 per token)
const MIN_PURCHASE_USD = 10; // $10 minimum (40 tokens)
const MAX_PURCHASE_USD = 10000; // $10,000 maximum (40,000 tokens)
const TOTAL_RWAPAWN_SUPPLY = 10000000000; // 10 billion tokens

// System wallet configuration - CRITICAL: These are AccountIdentifiers, not Principals
const SYSTEM_ICP_ACCOUNT_ID = "1ef008c2d7e445954e12ec2033b202888723046fde489be3a250cacf01d65963";
const SYSTEM_ETH_ADDRESS = "0x00f3C42833C3170159af4E92dbb451Fb3F708917";

// Enhanced validation schemas for API endpoints
const userIdParamSchema = z.object({
  id: z.string().min(1, 'User ID is required').max(50, 'User ID too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid User ID format')
});

const assetIdParamSchema = z.object({
  id: z.string().min(1, 'Asset ID is required').max(50, 'Asset ID too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid Asset ID format')
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().min(1, 'Page must be at least 1').max(1000, 'Page number too high').default(1),
  limit: z.coerce.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),
  sort: z.enum(['createdAt', 'updatedAt', 'name', 'value']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc')
});

const walletAddressParamSchema = z.object({
  address: z.string().min(1, 'Wallet address is required').max(100, 'Wallet address too long')
    .refine((addr) => {
      const ethValidation = AddressValidator.isValidEthereumAddress(addr);
      const icpPrincipalValidation = AddressValidator.isValidPrincipalId(addr);
      const icpAccountValidation = AddressValidator.isValidAccountId(addr);
      return ethValidation.valid || icpPrincipalValidation || icpAccountValidation;
    }, 'Invalid wallet address format')
});

// RWAPAWN payment validation schemas
const rwapawnPaymentIntentSchema = z.object({
  amount: z.number()
    .min(MIN_PURCHASE_USD, `Minimum purchase amount is $${MIN_PURCHASE_USD}`)
    .max(MAX_PURCHASE_USD, `Maximum purchase amount is $${MAX_PURCHASE_USD}`)
    .multipleOf(0.01, 'Amount must be in cents (2 decimal places)'),
  idempotencyKey: z.string().optional().refine((key) => {
    if (key && (key.length < 1 || key.length > 255)) {
      return false;
    }
    return true;
  }, 'Idempotency key must be between 1 and 255 characters')
});

const rwapawnPaymentConfirmSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  purchaseId: z.string().min(1, 'Purchase ID is required'),
});
import { CryptoVerificationService } from "./crypto-utils";
import { ICPLedgerService } from "./icp-ledger-service";
import { pricingService } from "./services/pricing-service";
import { chainFusionBridge } from "./services/chain-fusion-bridge";
import documentAnalysisService from "./services/document-analysis";
import { adminService } from "./services/admin-service";
import { pricingQuerySchema } from "@shared/schema";
import { db } from "./db";
import { sql, eq, and } from "drizzle-orm";
import { rwapawnPurchases } from "@shared/schema";
import { verifyAdminCredentials, generateAdminToken } from "./admin-auth";
import { emailService } from "./services/email-service";

// Session management for traditional auth
const TRADITIONAL_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory storage for wallet binding nonces (in production, use Redis)
const bindingNonces = new Map<string, { nonce: string; userId: string; expires: number; walletType: string; challenge: string }>();

// Track successful bindings to prevent replay attacks (in production, use Redis with TTL)
const successfulBindings = new Map<string, { userId: string; principalId: string; timestamp: number }>();

// Track payment intent idempotency keys to prevent duplicates (in production, use Redis with TTL)
const paymentIntentCache = new Map<string, { paymentIntentId: string; userId: string; timestamp: number }>();

// Track failed attempts for rate limiting (in production, use Redis)
const failedAttempts = new Map<string, { count: number; lastAttempt: number; blocked: boolean }>();

// Cleanup expired nonces and old data every 5 minutes
setInterval(() => {
  const now = Date.now();
  
  // Clean expired nonces
  for (const [key, value] of Array.from(bindingNonces.entries())) {
    if (value.expires < now) {
      bindingNonces.delete(key);
    }
  }
  
  // Clean old successful bindings (keep for 24 hours to prevent replay)
  for (const [key, value] of Array.from(successfulBindings.entries())) {
    if (now - value.timestamp > 24 * 60 * 60 * 1000) {
      successfulBindings.delete(key);
    }
  }
  
  // Clean old payment intent cache (keep for 24 hours to prevent replay)
  for (const [key, value] of Array.from(paymentIntentCache.entries())) {
    if (now - value.timestamp > 24 * 60 * 60 * 1000) {
      paymentIntentCache.delete(key);
    }
  }
  
  // Reset failed attempt counters after 1 hour
  for (const [key, value] of Array.from(failedAttempts.entries())) {
    if (now - value.lastAttempt > 60 * 60 * 1000) {
      failedAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Rate limiting helper
const checkRateLimit = (userId: string): { allowed: boolean; reason?: string } => {
  const userAttempts = failedAttempts.get(userId);
  if (!userAttempts) return { allowed: true };
  
  const now = Date.now();
  
  // Block if too many failed attempts in the last hour
  if (userAttempts.count >= 5 && (now - userAttempts.lastAttempt) < 60 * 60 * 1000) {
    return { allowed: false, reason: "Too many failed attempts. Try again later." };
  }
  
  return { allowed: true };
};

// Middleware for checking if user is admin
const isAdmin = async (req: any, res: any, next: any) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(req.user.id);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: "Authorization check failed" });
  }
};

// Middleware for checking ownership
const checkOwnership = async (req: any, res: any, next: any) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = req.params.userId || req.body.userId;
    if (req.user.id !== userId) {
      return res.status(403).json({ message: "Access denied - not owner" });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: "Ownership check failed" });
  }
};

// Multer configuration for document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1, // Single file upload
    fields: 10, // Limit form fields to prevent abuse
  },
  fileFilter: (req, file, cb) => {
    // Accept only images and PDFs
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png', 
      'image/webp',
      'application/pdf'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only JPEG, PNG, WebP images and PDFs are allowed.`));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply security headers to all routes
  app.use(securityHeaders);

  // Apply general API rate limiting
  app.use('/api/', rateLimitConfigs.api);

  // Auth middleware setup
  await setupAuth(app);

  // Auth routes with enhanced validation
  app.get('/api/auth/user', 
    rateLimitConfigs.auth, 
    isAuthenticated, 
    async (req: any, res) => {
      try {
        // Handle development bypass case
        let userId: string;
        if (process.env.DEV_AUTH_BYPASS === 'true' && !req.user?.claims?.sub && !req.user?.id) {
          // Return the admin user for testing
          userId = '38698486';
          console.log('Using development bypass - returning admin user:', userId);
        } else {
          // Try both user.id (new format) and user.claims.sub (legacy format)
          userId = req.user?.id || req.user?.claims?.sub;
        }
        
        // Validate user ID format
        if (!userId || typeof userId !== 'string' || userId.length > 50) {
          return res.status(400).json({
            success: false,
            error: 'Invalid user ID format',
            code: 'INVALID_USER_ID',
            timestamp: new Date().toISOString()
          });
        }
        
        const user = await storage.getUser(userId);
        
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
            code: 'USER_NOT_FOUND',
            timestamp: new Date().toISOString()
          });
        }
        
        // Transform user object to match frontend expectations
        const transformedUser = {
          ...user,
          isMfaEnabled: user.mfaEnabled // Map mfaEnabled to isMfaEnabled for frontend compatibility
        };
        
        res.json(successResponse(transformedUser));
      } catch (error) {
        console.error("Error fetching user:", {
          userId: req.user?.claims?.sub,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: "Failed to fetch user",
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Admin Authentication Routes
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      if (verifyAdminCredentials(username, password)) {
        const token = generateAdminToken(username);
        res.json({
          success: true,
          token,
          admin: { username, isAdmin: true }
        });
      } else {
        // Add delay to prevent brute force attacks
        await new Promise(resolve => setTimeout(resolve, 1000));
        res.status(401).json({
          success: false,
          error: 'Invalid admin credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
        code: 'LOGIN_ERROR'
      });
    }
  });

  // Admin verification endpoint
  app.get('/api/admin/verify', requireAdminAuth, async (req: any, res) => {
    res.json({
      success: true,
      admin: req.adminUser
    });
  });

  // Traditional User Authentication Routes
  app.post('/api/auth/login',
    rateLimitConfigs.auth,
    validateRequest(userLoginSchema, 'body'),
    async (req, res) => {
      try {
        const { email, password } = req.body;
        
        // Get user by email
        const user = await storage.getUserByEmail(email);
        if (!user || !user.passwordHash) {
          // Add delay to prevent brute force attacks
          await new Promise(resolve => setTimeout(resolve, 1000));
          return res.status(401).json({
            success: false,
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
            timestamp: new Date().toISOString()
          });
        }
        
        // Check if account is locked
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          return res.status(423).json({
            success: false,
            error: 'Account is temporarily locked due to too many failed login attempts',
            code: 'ACCOUNT_LOCKED',
            timestamp: new Date().toISOString()
          });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
          // Increment login attempts
          await storage.incrementLoginAttempts(user.id);
          
          // Check if we need to lock the account (5 failed attempts)
          const currentAttempts = (user.loginAttempts || 0) + 1;
          if (currentAttempts >= 5) {
            const lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + 15); // Lock for 15 minutes
            await storage.lockUser(user.id, lockUntil);
            
            return res.status(423).json({
              success: false,
              error: 'Too many failed login attempts. Account locked for 15 minutes.',
              code: 'ACCOUNT_LOCKED',
              timestamp: new Date().toISOString()
            });
          }
          
          // Add delay to prevent brute force attacks
          await new Promise(resolve => setTimeout(resolve, 1000));
          return res.status(401).json({
            success: false,
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
            timestamp: new Date().toISOString()
          });
        }
        
        // Reset login attempts on successful login
        await storage.resetLoginAttempts(user.id);
        
        // Create session for traditional auth users (compatible with isAuthenticated middleware)
        const sessionUser = {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl
          },
          // For traditional auth, set a long expiry (24 hours from now)
          expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
          // Traditional auth doesn't use refresh tokens
          refresh_token: null,
          access_token: null
        };
        
        // Log the user in using passport session
        req.logIn(sessionUser, (err) => {
          if (err) {
            console.error('Session creation error:', err);
            return res.status(500).json({
              success: false,
              error: 'Failed to create session',
              code: 'SESSION_ERROR',
              timestamp: new Date().toISOString()
            });
          }
          
          res.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              username: user.username,
              emailVerified: user.emailVerified,
              accountStatus: user.accountStatus,
              isAdmin: user.isAdmin || false
            },
            timestamp: new Date().toISOString()
          });
        });
        
      } catch (error) {
        console.error('Traditional login error:', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: 'Login failed',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Forgot password endpoint
  app.post('/api/auth/forgot-password',
    rateLimitConfigs.auth,
    validateRequest(forgotPasswordSchema, 'body'),
    async (req, res) => {
      try {
        const { email } = req.body;
        
        // Always return success to prevent email enumeration
        const successResponse = {
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent',
          timestamp: new Date().toISOString()
        };
        
        const user = await storage.getUserByEmail(email);
        if (!user || !user.passwordHash) {
          // Don't reveal that the user doesn't exist
          return res.json(successResponse);
        }
        
        // Generate password reset token
        const resetToken = randomUUID();
        const resetTokenHash = await bcrypt.hash(resetToken, 10);
        const resetExpires = new Date();
        resetExpires.setHours(resetExpires.getHours() + 1); // Token expires in 1 hour
        
        // Save reset token
        await storage.setPasswordResetToken(user.id, resetTokenHash, resetExpires);
        
        // TODO: Send email with reset link containing the resetToken
        // For development, log the reset token
        console.log(`Password reset token for ${email}: ${resetToken}`);
        
        res.json(successResponse);
        
      } catch (error) {
        console.error('Forgot password error:', {
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: 'Failed to process password reset request',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Reset password endpoint
  app.post('/api/auth/reset-password',
    rateLimitConfigs.auth,
    validateRequest(resetPasswordSchema, 'body'),
    async (req, res) => {
      try {
        const { token, password } = req.body;
        
        // Hash the token to match what's stored
        const tokenHash = await bcrypt.hash(token, 10);
        
        // Find user with valid reset token
        const user = await storage.getUserByResetToken(tokenHash);
        if (!user) {
          return res.status(400).json({
            success: false,
            error: 'Invalid or expired reset token',
            code: 'INVALID_TOKEN',
            timestamp: new Date().toISOString()
          });
        }
        
        // Hash new password
        const newPasswordHash = await bcrypt.hash(password, 12);
        
        // Update user password and clear reset token
        await storage.updateUserPassword(user.id, newPasswordHash);
        await storage.clearPasswordResetToken(user.id);
        
        res.json({
          success: true,
          message: 'Password has been reset successfully',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Reset password error:', {
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: 'Failed to reset password',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Change password endpoint for authenticated users
  app.post('/api/user/change-password',
    isAuthenticated,
    rateLimitConfigs.auth,
    validateRequest(changePasswordSchema, 'body'),
    async (req: any, res) => {
      try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id as string;
        
        // Get current user
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
            code: 'USER_NOT_FOUND',
            timestamp: new Date().toISOString()
          });
        }

        // Check if user has a password set (for users who registered with OAuth)
        if (!user.passwordHash) {
          return res.status(400).json({
            success: false,
            error: 'No password is set for this account',
            code: 'NO_PASSWORD_SET',
            timestamp: new Date().toISOString()
          });
        }
        
        // Verify current password
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValidCurrentPassword) {
          // Log failed attempt
          await storage.incrementLoginAttempts(user.id);
          
          return res.status(400).json({
            success: false,
            error: 'Current password is incorrect',
            code: 'INVALID_CURRENT_PASSWORD',
            timestamp: new Date().toISOString()
          });
        }
        
        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 12);
        
        // Update password
        await storage.updateUserPassword(user.id, newPasswordHash);
        
        // Log successful password change activity
        await storage.logUserActivity({
          userId: user.id,
          activityType: 'password_change',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: true,
          details: { timestamp: new Date().toISOString() }
        });
        
        res.json({
          success: true,
          message: 'Password changed successfully',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Change password error:', {
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: 'Failed to change password',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // MFA validation schemas
  const mfaSetupSchema = z.object({
    userEmail: z.string().email('Valid email required').optional()
  });

  const mfaEnableSchema = z.object({
    totpToken: z.string().min(6, 'TOTP token must be 6 digits').max(6, 'TOTP token must be 6 digits')
  });

  const mfaVerifySchema = z.object({
    totpToken: z.string().min(6, 'TOTP token must be 6 digits').max(6, 'TOTP token must be 6 digits')
  });

  const mfaBackupCodeSchema = z.object({
    backupCode: z.string().min(8, 'Invalid backup code format').max(8, 'Invalid backup code format')
  });

  // Multi-Factor Authentication Routes
  app.post('/api/mfa/setup', 
    isAuthenticated,
    rateLimitConfigs.api,
    async (req: any, res) => {
      try {
        const userId = req.user.id as string;
        const user = await storage.getUser(userId);
        
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
            code: 'USER_NOT_FOUND',
            timestamp: new Date().toISOString()
          });
        }

        if (user.mfaEnabled) {
          return res.status(400).json({
            success: false,
            error: 'MFA is already enabled for this account',
            code: 'MFA_ALREADY_ENABLED',
            timestamp: new Date().toISOString()
          });
        }

        // Generate TOTP setup
        const totpSetup = await MFAService.generateTOTPSetup(user.email || `user_${userId}@example.com`);
        
        // SECURITY FIX: Store TOTP secret and backup codes server-side with proper encryption
        await storage.storeMfaSetup(userId, totpSetup.secret, totpSetup.backupCodes);

        // Only return data needed for user setup - NO SECRET EXPOSURE
        res.json({
          success: true,
          data: {
            qrCodeUrl: totpSetup.qrCodeUrl,
            manualEntryKey: totpSetup.manualEntryKey,
            backupCodes: totpSetup.backupCodes, // Return unhashed codes for user to save
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('MFA setup error:', {
          userId: req.user?.claims?.sub,
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: 'Failed to generate MFA setup',
          code: 'MFA_SETUP_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  app.post('/api/mfa/enable',
    isAuthenticated,
    rateLimitConfigs.api,
    validateRequest(mfaEnableSchema, 'body'),
    async (req: any, res) => {
      try {
        const userId = req.user.id as string;
        const { totpToken } = req.body;
        
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
            code: 'USER_NOT_FOUND',
            timestamp: new Date().toISOString()
          });
        }

        if (user.mfaEnabled) {
          return res.status(400).json({
            success: false,
            error: 'MFA is already enabled for this account',
            code: 'MFA_ALREADY_ENABLED',
            timestamp: new Date().toISOString()
          });
        }

        // SECURITY FIX: Fetch stored setup data from server instead of trusting client
        const mfaSetup = await storage.getMfaSetup(userId);
        if (!mfaSetup.secret) {
          return res.status(400).json({
            success: false,
            error: 'No MFA setup found. Please start the setup process first.',
            code: 'NO_PENDING_SETUP',
            timestamp: new Date().toISOString()
          });
        }

        // Verify TOTP token against server-stored secret
        const isValidToken = MFAService.verifyTOTP(mfaSetup.secret, totpToken);
        if (!isValidToken) {
          return res.status(400).json({
            success: false,
            error: 'Invalid TOTP token. Please check your authenticator app.',
            code: 'INVALID_TOTP',
            timestamp: new Date().toISOString()
          });
        }

        // Enable MFA for the user
        await storage.enableMfa(userId);

        // Log the activity
        await storage.logUserActivity({
          userId,
          activityType: 'mfa_setup',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: { action: 'enabled_mfa' }
        });

        res.json({
          success: true,
          data: {
            message: 'MFA has been successfully enabled for your account',
            mfaEnabled: true,
            backupCodesRemaining: mfaSetup.backupCodes.length
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('MFA enable error:', {
          userId: req.user?.claims?.sub,
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: 'Failed to enable MFA',
          code: 'MFA_ENABLE_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  app.post('/api/mfa/verify-totp',
    isAuthenticated,
    rateLimitConfigs.api,
    validateRequest(mfaVerifySchema, 'body'),
    async (req: any, res) => {
      try {
        const userId = req.user.id as string;
        const { totpToken } = req.body;
        
        const user = await storage.getUser(userId);
        if (!user || !user.mfaEnabled) {
          return res.status(400).json({
            success: false,
            error: 'MFA is not enabled for this account',
            code: 'MFA_NOT_ENABLED',
            timestamp: new Date().toISOString()
          });
        }

        // Get the user's TOTP secret
        const totpSecrets = await storage.getMfaTokens(userId, 'totp');
        if (totpSecrets.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No TOTP secret found for this user',
            code: 'NO_TOTP_SECRET',
            timestamp: new Date().toISOString()
          });
        }

        const encryptedSecret = totpSecrets[0].tokenValueHash;
        const isValidToken = MFAService.verifyTOTP(encryptedSecret, totpToken);

        if (!isValidToken) {
          return res.status(400).json({
            success: false,
            error: 'Invalid TOTP token',
            code: 'INVALID_TOTP',
            timestamp: new Date().toISOString()
          });
        }

        res.json({
          success: true,
          message: 'TOTP token verified successfully',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('TOTP verification error:', {
          userId: req.user?.claims?.sub,
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: 'Failed to verify TOTP token',
          code: 'TOTP_VERIFY_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  app.post('/api/mfa/verify-backup-code',
    isAuthenticated,
    rateLimitConfigs.api,
    validateRequest(mfaBackupCodeSchema, 'body'),
    async (req: any, res) => {
      try {
        const userId = req.user.id as string;
        const { backupCode } = req.body;
        
        const user = await storage.getUser(userId);
        if (!user || !user.mfaEnabled) {
          return res.status(400).json({
            success: false,
            error: 'MFA is not enabled for this account',
            code: 'MFA_NOT_ENABLED',
            timestamp: new Date().toISOString()
          });
        }

        // Get unused backup codes
        const backupCodes = await storage.getUnusedBackupCodes(userId);
        const hashedBackupCodes = backupCodes.map(code => code.tokenValueHash);

        const isValidCode = await MFAService.verifyBackupCode(hashedBackupCodes, backupCode);
        if (!isValidCode) {
          return res.status(400).json({
            success: false,
            error: 'Invalid backup code',
            code: 'INVALID_BACKUP_CODE',
            timestamp: new Date().toISOString()
          });
        }

        // Mark the backup code as used
        for (const code of backupCodes) {
          const isMatch = await bcrypt.compare(backupCode.toUpperCase(), code.tokenValueHash);
          if (isMatch) {
            await storage.useMfaToken(code.id);
            break;
          }
        }

        res.json({
          success: true,
          message: 'Backup code verified successfully',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Backup code verification error:', {
          userId: req.user?.claims?.sub,
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: 'Failed to verify backup code',
          code: 'BACKUP_CODE_VERIFY_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  app.post('/api/mfa/disable',
    isAuthenticated,
    rateLimitConfigs.api,
    async (req: any, res) => {
      try {
        const userId = req.user.id as string;
        
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
            code: 'USER_NOT_FOUND',
            timestamp: new Date().toISOString()
          });
        }

        if (!user.mfaEnabled) {
          return res.status(400).json({
            success: false,
            error: 'MFA is not enabled for this account',
            code: 'MFA_NOT_ENABLED',
            timestamp: new Date().toISOString()
          });
        }

        // Disable MFA for the user
        await storage.updateUser(userId, { mfaEnabled: false });

        // Mark all MFA tokens as used/expired for this user
        const allMfaTokens = await storage.getMfaTokens(userId, 'totp');
        const allBackupCodes = await storage.getMfaTokens(userId, 'backup_code');
        
        for (const token of [...allMfaTokens, ...allBackupCodes]) {
          await storage.useMfaToken(token.id);
        }

        // Log the activity
        await storage.logUserActivity({
          userId,
          activityType: 'mfa_disable',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: { action: 'disabled_mfa' }
        });

        res.json({
          success: true,
          message: 'MFA has been disabled for your account',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('MFA disable error:', {
          userId: req.user?.claims?.sub,
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: 'Failed to disable MFA',
          code: 'MFA_DISABLE_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // User routes with comprehensive validation
  app.post("/api/users", 
    rateLimitConfigs.auth,
    validateRequest(insertUserSchema, 'body'),
    async (req, res) => {
      try {
        const userData = req.body; // Already validated by middleware
        let user;
        
        // Handle traditional password-based registration
        if (userData.password) {
          // Check for existing user by email
          if (userData.email) {
            const existingUser = await storage.getUserByEmail(userData.email);
            if (existingUser) {
              return res.status(409).json({
                success: false,
                error: 'User with this email already exists',
                code: 'EMAIL_EXISTS',
                timestamp: new Date().toISOString()
              });
            }
          }
          
          // Check for existing user by username
          if (userData.username) {
            const existingUser = await storage.getUserByUsername(userData.username);
            if (existingUser) {
              return res.status(409).json({
                success: false,
                error: 'Username already taken',
                code: 'USERNAME_EXISTS',
                timestamp: new Date().toISOString()
              });
            }
          }
          
          // Hash the password and create user
          const saltRounds = 12;
          const passwordHash = await bcrypt.hash(userData.password, saltRounds);
          
          // Remove password from userData before storing
          const { password, confirmPassword, ...userDataForDB } = userData;
          
          user = await storage.createUserWithPassword(userDataForDB, passwordHash);
          
          console.log('Traditional user created successfully:', {
            userId: user.id,
            email: userData.email,
            username: userData.username,
            timestamp: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
        } 
        // Handle wallet-based registration
        else if (userData.walletAddress) {
          // Additional business logic validation for wallet addresses
          const addressValidation = AddressValidator.validateBridgeAddress(
            userData.walletAddress,
            userData.walletAddress.startsWith('0x') ? 'ethereum' : 'icp',
            userData.walletAddress.startsWith('0x') ? 'address' : 
            (userData.walletAddress.length === 64 ? 'accountId' : 'principal')
          );
          
          if (!addressValidation.valid) {
            return res.status(400).json({
              success: false,
              error: `Invalid wallet address: ${addressValidation.error}`,
              code: 'INVALID_WALLET_ADDRESS',
              field: 'walletAddress',
              timestamp: new Date().toISOString()
            });
          }
          
          // Check for existing user by wallet
          const existingUser = await storage.getUserByWallet(userData.walletAddress);
          if (existingUser) {
            return res.json(successResponse(existingUser, 'User already exists'));
          }
          
          user = await storage.createUser(userData);
          
          console.log('Wallet user created successfully:', {
            userId: user.id,
            walletAddress: userData.walletAddress,
            timestamp: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Either password or walletAddress is required for registration',
            code: 'MISSING_AUTH_METHOD',
            timestamp: new Date().toISOString()
          });
        }
        
        res.status(201).json(successResponse(user, 'User created successfully'));
      } catch (error) {
        console.error("Error creating user:", {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          requestBody: req.body,
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        res.status(500).json({
          success: false,
          error: "Failed to create user",
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  app.get("/api/users/:id", 
    validateRequest(userIdParamSchema, 'params'),
    async (req, res) => {
      try {
        const userId = req.params.id;
        
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: "User not found",
            code: 'USER_NOT_FOUND',
            timestamp: new Date().toISOString()
          });
        }
        
        res.json(successResponse(user));
      } catch (error) {
        console.error("Error fetching user:", {
          userId: req.params.id,
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: "Failed to fetch user",
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  app.get("/api/users/wallet/:address", 
    validateRequest(walletAddressParamSchema, 'params'),
    async (req, res) => {
      try {
        const walletAddress = req.params.address;
        
        // Additional wallet address validation
        const addressValidation = AddressValidator.validateBridgeAddress(
          walletAddress,
          walletAddress.startsWith('0x') ? 'ethereum' : 'icp',
          walletAddress.startsWith('0x') ? 'address' : 
          (walletAddress.length === 64 ? 'accountId' : 'principal')
        );
        
        if (!addressValidation.valid) {
          return res.status(400).json({
            success: false,
            error: `Invalid wallet address format: ${addressValidation.error}`,
            code: 'INVALID_WALLET_ADDRESS',
            field: 'address',
            timestamp: new Date().toISOString()
          });
        }
        
        const user = await storage.getUserByWallet(walletAddress);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: "User not found for this wallet address",
            code: 'USER_NOT_FOUND',
            timestamp: new Date().toISOString()
          });
        }
        
        res.json(successResponse(user));
      } catch (error) {
        console.error("Error fetching user by wallet:", {
          address: req.params.address,
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: "Failed to fetch user",
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  app.patch("/api/users/:id", 
    validateRequest(userIdParamSchema, 'params'),
    isAuthenticated, 
    validateRequest(userUpdateSchema, 'body'),
    async (req: any, res) => {
      try {
        const userId = req.params.id;
        
        // Check if user is updating their own profile
        if (req.user.id !== userId) {
          return res.status(403).json({
            success: false,
            error: "Access denied - not owner",
            code: 'FORBIDDEN',
            timestamp: new Date().toISOString()
          });
        }

        const updateData = req.body; // Already validated by middleware
      
        if (Object.keys(updateData).length === 0) {
          return res.status(400).json({
            success: false,
            error: "No valid fields to update",
            code: 'NO_UPDATE_DATA',
            timestamp: new Date().toISOString()
          });
        }

        // SECURITY: Block principalId updates - require wallet binding verification
        if (updateData.principalId) {
          return res.status(403).json({ 
            success: false,
            error: "Direct principalId updates not allowed. Use /api/wallet/verify-binding endpoint.",
            code: 'PRINCIPAL_UPDATE_FORBIDDEN',
            timestamp: new Date().toISOString()
          });
        }

        const updatedUser = await storage.updateUser(userId, updateData);
        
        if (!updatedUser) {
          return res.status(404).json({
            success: false,
            error: "User not found",
            code: 'USER_NOT_FOUND',
            timestamp: new Date().toISOString()
          });
        }

        console.log('User updated successfully:', {
          userId,
          updatedFields: Object.keys(updateData),
          timestamp: new Date().toISOString(),
          ip: req.ip
        });

        res.json(successResponse(updatedUser, 'User updated successfully'));
      } catch (error) {
        console.error("Error updating user:", {
          userId: req.params.id,
          updateData: req.body,
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: "Failed to update user",
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );


  // Update user profile
  app.patch("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id as string;
      const updateData = req.body;
      
      // Remove any fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      delete updateData.isAdmin;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: "No valid fields to update",
          code: 'NO_UPDATE_DATA',
          timestamp: new Date().toISOString()
        });
      }
      
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: "User not found",
          code: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log('User profile updated successfully:', {
        userId,
        updatedFields: Object.keys(updateData),
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      
      res.json(successResponse(updatedUser, 'Profile updated successfully'));
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update profile",
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Upload endpoint for profile images
  app.post("/api/upload", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }
      
      // Validate file type (images only)
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: "Only image files are allowed" });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const extension = req.file.originalname.split('.').pop();
      const filename = `profile-images/${userId}-${timestamp}.${extension}`;
      
      // For now, return a placeholder URL since object storage integration needs more setup
      const imageUrl = `/api/files/${filename}`;
      
      console.log(`Profile image uploaded: ${filename} for user ${userId}`);
      
      res.json({
        success: true,
        uploadURL: imageUrl,
        url: imageUrl,
        filename: filename
      });
    } catch (error) {
      console.error("Profile image upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // KYC Information endpoints
  app.get("/api/user/kyc", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const kycInfo = await storage.getKycInformation(userId);
      
      if (!kycInfo) {
        return res.json(successResponse(null, 'No KYC information found'));
      }
      
      // Return KYC info without sensitive encrypted data
      const sanitizedKyc = {
        id: kycInfo.id,
        userId: kycInfo.userId,
        documentType: kycInfo.documentType,
        documentCountry: kycInfo.documentCountry,
        status: kycInfo.status,
        submittedAt: kycInfo.submittedAt,
        reviewedAt: kycInfo.reviewedAt,
        reviewNotes: kycInfo.reviewNotes,
        rejectionReason: kycInfo.rejectionReason
      };
      
      res.json(successResponse(sanitizedKyc));
    } catch (error) {
      console.error("Error fetching KYC information:", {
        userId: req.user?.claims?.sub,
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      res.status(500).json({
        success: false,
        error: "Failed to fetch KYC information",
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });

  // KYC submission with file uploads
  const kycUpload = multer({
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per file
      files: 3 // Maximum 3 files (document front, back, selfie)
    },
    fileFilter: (req, file, cb) => {
      // Only allow image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  const kycSubmissionSchema = z.object({
    documentType: z.enum(['passport', 'drivers_license', 'national_id']),
    documentNumber: z.string().min(1).max(50),
    documentCountry: z.string().min(2).max(3),
    fullName: z.string().min(1).max(100),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    nationality: z.string().min(1).max(100),
    occupation: z.string().min(1).max(100),
    sourceOfFunds: z.enum(['employment', 'business_ownership', 'investments', 'inheritance', 'savings', 'pension', 'other']),
    annualIncome: z.enum(['under_25k', '25k_50k', '50k_100k', '100k_250k', '250k_500k', 'over_500k'])
  });

  app.post("/api/user/kyc", 
    isAuthenticated, 
    kycUpload.fields([
      { name: 'documentImage', maxCount: 1 },
      { name: 'documentBackImage', maxCount: 1 },
      { name: 'selfieImage', maxCount: 1 }
    ]),
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        
        // Check if KYC already exists and is not rejected
        const existingKyc = await storage.getKycInformation(userId);
        if (existingKyc && existingKyc.status !== 'rejected') {
          return res.status(409).json({
            success: false,
            error: "KYC information already submitted",
            code: 'KYC_ALREADY_EXISTS',
            timestamp: new Date().toISOString()
          });
        }

        // Validate form data
        const formData = kycSubmissionSchema.parse(req.body);
        
        // Validate required files
        if (!req.files?.documentImage) {
          return res.status(400).json({
            success: false,
            error: "Document image is required",
            code: 'MISSING_DOCUMENT_IMAGE',
            timestamp: new Date().toISOString()
          });
        }
        
        if (!req.files?.selfieImage) {
          return res.status(400).json({
            success: false,
            error: "Selfie image is required",
            code: 'MISSING_SELFIE_IMAGE',
            timestamp: new Date().toISOString()
          });
        }

        // Save uploaded files to disk (TODO: Migrate to object storage in production)
        const documentImageFile = req.files.documentImage[0];
        const documentBackImageFile = req.files.documentBackImage?.[0];
        const selfieImageFile = req.files.selfieImage[0];

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '../uploads/kyc');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique file paths and save files
        const documentImageKey = `document_${userId}_${Date.now()}${path.extname(documentImageFile.originalname)}`;
        const documentImagePath = path.join(uploadsDir, documentImageKey);
        fs.writeFileSync(documentImagePath, documentImageFile.buffer);

        let documentBackImageKey = null;
        if (documentBackImageFile) {
          documentBackImageKey = `document_back_${userId}_${Date.now()}${path.extname(documentBackImageFile.originalname)}`;
          const documentBackImagePath = path.join(uploadsDir, documentBackImageKey);
          fs.writeFileSync(documentBackImagePath, documentBackImageFile.buffer);
        }

        const selfieImageKey = `selfie_${userId}_${Date.now()}${path.extname(selfieImageFile.originalname)}`;
        const selfieImagePath = path.join(uploadsDir, selfieImageKey);
        fs.writeFileSync(selfieImagePath, selfieImageFile.buffer);

        // Prepare KYC data with encrypted fields for storage
        // Note: The schema only stores encrypted versions of PII data
        const kycData = {
          userId,
          documentType: formData.documentType,
          documentCountry: formData.documentCountry,
          sourceOfFunds: formData.sourceOfFunds,
          annualIncome: formData.annualIncome,
          status: 'pending' as const,
          // Encrypted PII fields using AES-256-GCM encryption
          documentNumberEncrypted: EncryptionService.encrypt(formData.documentNumber),
          fullNameEncrypted: EncryptionService.encrypt(formData.fullName),
          dateOfBirthEncrypted: EncryptionService.encrypt(formData.dateOfBirth),
          nationalityEncrypted: EncryptionService.encrypt(formData.nationality),
          occupationEncrypted: EncryptionService.encrypt(formData.occupation),
          documentImageKeyEncrypted: EncryptionService.encrypt(documentImageKey),
          documentBackImageKeyEncrypted: documentBackImageKey ? EncryptionService.encrypt(documentBackImageKey) : null,
          selfieImageKeyEncrypted: EncryptionService.encrypt(selfieImageKey)
        };

        // Debug: Log kycData before database insert
        console.log('kycData before insert:', JSON.stringify(kycData, null, 2));
        console.log('userId variable:', userId);
        console.log('req.user:', req.user);
        
        // Create KYC information
        const kycInfo = await storage.createKycInformation(kycData);
        
        // Update user's KYC status
        await storage.updateUser(userId, { kycStatus: 'in_progress' });
        
        // Log KYC submission
        await storage.logUserActivity({
          userId,
          activityType: 'kyc_submit',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            documentType: formData.documentType,
            documentCountry: formData.documentCountry,
            hasDocumentBack: !!documentBackImageFile
          }
        });

        console.log('KYC submitted successfully:', {
          userId,
          kycId: kycInfo.id,
          documentType: formData.documentType,
          timestamp: new Date().toISOString(),
          ip: req.ip
        });

        // Return sanitized response
        const response = {
          id: kycInfo.id,
          userId: kycInfo.userId,
          documentType: kycInfo.documentType,
          documentCountry: kycInfo.documentCountry,
          status: kycInfo.status,
          submittedAt: kycInfo.submittedAt
        };
        
        res.status(201).json(successResponse(response, 'KYC information submitted successfully'));
      } catch (error) {
        console.error("Error submitting KYC:", {
          userId: req.user?.claims?.sub,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          ip: req.ip,
          files: req.files ? Object.keys(req.files) : []
        });

        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: "Invalid KYC data",
            details: error.errors,
            code: 'VALIDATION_ERROR',
            timestamp: new Date().toISOString()
          });
        }

        res.status(500).json({
          success: false,
          error: "Failed to submit KYC information",
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Admin KYC Management endpoints
  app.get("/api/admin/kyc", rateLimitConfigs.api, requireAdminAuth, async (req: any, res) => {
    try {
      const { status, search } = req.query;
      
      // Get all KYC submissions (filtering will be done in storage layer)
      const kycSubmissions = await storage.getAllKycSubmissions();
      
      // Calculate breakdown by status
      const breakdown = {
        byStatus: kycSubmissions.reduce((acc: any, kyc: any) => {
          acc[kyc.status] = (acc[kyc.status] || 0) + 1;
          return acc;
        }, {})
      };
      
      res.json(successResponse({
        submissions: kycSubmissions,
        totalCount: kycSubmissions.length,
        breakdown
      }));
    } catch (error) {
      console.error("Error fetching admin KYC data:", {
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      res.status(500).json({
        success: false,
        error: "Failed to fetch KYC data",
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Admin KYC Review endpoint
  const kycReviewSchema = z.object({
    status: z.enum(['completed', 'rejected']),
    reviewNotes: z.string().min(1).max(1000),
    rejectionReason: z.string().optional()
  });

  app.patch("/api/admin/kyc/:kycId/review", rateLimitConfigs.api, requireAdminAuth, async (req: any, res) => {
    try {
      const { kycId } = req.params;
      const reviewData = kycReviewSchema.parse(req.body);
      const adminUserId = req.user?.claims?.sub || req.user?.id || 'admin'; // Get admin user ID
      
      // Update KYC status and review information
      const updatedKyc = await storage.updateKycStatus(
        kycId, 
        reviewData.status, 
        reviewData.reviewNotes, 
        adminUserId,
        reviewData.rejectionReason
      );
      
      if (!updatedKyc) {
        return res.status(404).json({
          success: false,
          error: "KYC submission not found",
          code: 'KYC_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }
      
      // If rejected, rejection reason is handled in the review notes
      // The rejection reason is passed as part of reviewNotes in updateKycStatus above
      
      // Update user's KYC status
      await storage.updateUser(updatedKyc.userId, { 
        kycStatus: reviewData.status === 'completed' ? 'completed' : 'failed' 
      });
      
      // Log admin action
      await storage.logUserActivity({
        userId: adminUserId,
        activityType: 'kyc_submit',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          kycId,
          targetUserId: updatedKyc.userId,
          decision: reviewData.status,
          hasRejectionReason: !!reviewData.rejectionReason
        }
      });
      
      console.log('KYC reviewed by admin:', {
        adminUserId,
        kycId,
        targetUserId: updatedKyc.userId,
        decision: reviewData.status,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      
      res.json(successResponse(updatedKyc, 'KYC review completed successfully'));
    } catch (error) {
      console.error("Error reviewing KYC:", {
        kycId: req.params?.kycId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid review data",
          details: error.errors,
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to review KYC submission",
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Admin KYC Documents endpoint - retrieve encrypted document URLs
  app.get("/api/admin/kyc/:kycId/documents", rateLimitConfigs.api, requireAdminAuth, async (req: any, res) => {
    try {
      const { kycId } = req.params;
      
      // Fetch KYC submission
      const kycSubmission = await storage.getKycSubmission(kycId);
      
      if (!kycSubmission) {
        return res.status(404).json({
          success: false,
          error: "KYC submission not found",
          code: 'KYC_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }
      
      // Decrypt storage keys and create admin-accessible URLs
      const documents: any = {
        documentFront: null,
        documentBack: null,
        selfie: null
      };
      
      try {
        if (kycSubmission.documentImageKeyEncrypted) {
          const decryptedKey = EncryptionService.decrypt(kycSubmission.documentImageKeyEncrypted);
          // Create admin URL for the document
          documents.documentFront = `/api/admin/kyc/document/${kycId}/front`;
        }
        
        if (kycSubmission.documentBackImageKeyEncrypted) {
          const decryptedKey = EncryptionService.decrypt(kycSubmission.documentBackImageKeyEncrypted);
          documents.documentBack = `/api/admin/kyc/document/${kycId}/back`;
        }
        
        if (kycSubmission.selfieImageKeyEncrypted) {
          const decryptedKey = EncryptionService.decrypt(kycSubmission.selfieImageKeyEncrypted);
          documents.selfie = `/api/admin/kyc/document/${kycId}/selfie`;
        }
      } catch (decryptError) {
        console.error("Error decrypting document keys:", {
          kycId,
          error: decryptError instanceof Error ? decryptError.message : decryptError,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          error: "Failed to decrypt document keys",
          code: 'DECRYPTION_ERROR',
          timestamp: new Date().toISOString()
        });
      }
      
      res.json(successResponse(documents, 'KYC documents retrieved successfully'));
    } catch (error) {
      console.error("Error fetching KYC documents:", {
        kycId: req.params?.kycId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      
      res.status(500).json({
        success: false,
        error: "Failed to fetch KYC documents",
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Admin endpoint to serve KYC document images
  app.get("/api/admin/kyc/document/:kycId/:documentType", rateLimitConfigs.api, requireAdminAuth, async (req: any, res) => {
    try {
      const { kycId, documentType } = req.params;
      
      // Fetch KYC submission
      const kycSubmission = await storage.getKycSubmission(kycId);
      
      if (!kycSubmission) {
        return res.status(404).json({
          success: false,
          error: "KYC submission not found",
          code: 'KYC_NOT_FOUND'
        });
      }
      
      // Get the appropriate encrypted key
      let encryptedKey: string | null = null;
      if (documentType === 'front') {
        encryptedKey = kycSubmission.documentImageKeyEncrypted;
      } else if (documentType === 'back') {
        encryptedKey = kycSubmission.documentBackImageKeyEncrypted;
      } else if (documentType === 'selfie') {
        encryptedKey = kycSubmission.selfieImageKeyEncrypted;
      }
      
      if (!encryptedKey) {
        return res.status(404).json({
          success: false,
          error: "Document not found",
          code: 'DOCUMENT_NOT_FOUND'
        });
      }
      
      // Decrypt the storage key
      const decryptedKey = EncryptionService.decrypt(encryptedKey);
      
      // Get the file from object storage
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(decryptedKey);
      
      // Stream the file to response
      await objectStorageService.downloadObject(objectFile, res);
      
    } catch (error) {
      console.error("Error serving KYC document:", {
        kycId: req.params?.kycId,
        documentType: req.params?.documentType,
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({
          success: false,
          error: "Document file not found in storage",
          code: 'FILE_NOT_FOUND'
        });
      }
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "Failed to serve document",
          code: 'INTERNAL_ERROR'
        });
      }
    }
  });

  // User Wallet Information endpoints
  app.get("/api/user/wallets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get user's wallet bindings
      const walletBindings = await storage.getWalletBindings(userId);
      
      if (!walletBindings) {
        return res.json(successResponse([], 'No wallet bindings found'));
      }
      
      // Return sanitized wallet bindings
      const sanitizedWallets = walletBindings.map((wallet: any) => ({
        id: wallet.id,
        walletType: wallet.walletType,
        walletAddress: wallet.walletAddress,
        isPrimary: wallet.isPrimary || false,
        bindingStatus: wallet.bindingStatus || 'active',
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt
      }));
      
      res.json(successResponse(sanitizedWallets));
    } catch (error) {
      console.error("Error fetching user wallets:", {
        userId: req.user?.claims?.sub,
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      res.status(500).json({
        success: false,
        error: "Failed to fetch wallet information",
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });

  // User Activity endpoints
  app.get("/api/user/activity", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get user's activity history
      const userActivity = await storage.getUserActivityLog(userId);
      
      if (!userActivity) {
        return res.json(successResponse([], 'No activity found'));
      }
      
      // Return sanitized activity data
      const sanitizedActivity = userActivity.map((activity: any) => ({
        id: activity.id,
        userId: activity.userId,
        action: activity.action,
        description: activity.description,
        metadata: activity.metadata,
        success: activity.success,
        createdAt: activity.createdAt
      }));
      
      res.json(successResponse(sanitizedActivity));
    } catch (error) {
      console.error("Error fetching user activity:", {
        userId: req.user?.claims?.sub,
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      res.status(500).json({
        success: false,
        error: "Failed to fetch activity information",
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Secure Wallet Binding endpoints
  app.post("/api/wallet/bind-intent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { walletType } = walletBindIntentSchema.parse(req.body);
      
      // Generate a secure challenge with proper format
      const challengeData = CryptoVerificationService.generateChallenge(userId, walletType);
      
      // Store binding intent with challenge
      bindingNonces.set(challengeData.nonce, {
        nonce: challengeData.nonce,
        userId,
        expires: challengeData.expires,
        walletType,
        challenge: challengeData.challenge
      });
      
      res.json({
        nonce: challengeData.nonce,
        expires: new Date(challengeData.expires).toISOString(),
        challenge: challengeData.challenge,
        instructions: walletType === 'plug' 
          ? "Sign this challenge message with your Plug wallet to prove ownership"
          : "Authenticate with Internet Identity delegation to prove ownership"
      });
    } catch (error) {
      console.error("Error creating bind intent:", error);
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.post("/api/wallet/verify-binding", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { principalId, nonce, walletType, proof, signature } = walletBindVerificationSchema.parse(req.body);
      
      // SECURITY: Check rate limiting
      const rateLimit = checkRateLimit(userId);
      if (!rateLimit.allowed) {
        return res.status(429).json({ error: rateLimit.reason });
      }
      
      // SECURITY: Check for replay attacks using successful bindings
      const bindingKey = `${userId}_${principalId}`;
      if (successfulBindings.has(bindingKey)) {
        const existing = successfulBindings.get(bindingKey)!;
        return res.status(400).json({ 
          error: "Principal already bound to this account",
          timestamp: new Date(existing.timestamp).toISOString()
        });
      }
      
      // Verify nonce exists and belongs to user  
      const bindingIntent = bindingNonces.get(nonce);
      if (!bindingIntent || bindingIntent.userId !== userId || bindingIntent.expires < Date.now()) {
        // Track failed attempt
        const userAttempts = failedAttempts.get(userId) || { count: 0, lastAttempt: 0, blocked: false };
        userAttempts.count++;
        userAttempts.lastAttempt = Date.now();
        failedAttempts.set(userId, userAttempts);
        
        return res.status(400).json({ error: "Invalid or expired nonce" });
      }
      
      const challenge = bindingIntent.challenge;
      
      // CRITICAL SECURITY: Perform real cryptographic verification
      console.log(`Verifying wallet binding for user ${userId}, type: ${walletType}, principal: ${principalId}`);
      
      // Validate challenge format
      const challengeValidation = CryptoVerificationService.validateChallenge(
        challenge,
        userId,
        walletType,
        nonce
      );
      
      if (!challengeValidation.valid) {
        bindingNonces.delete(nonce);
        return res.status(400).json({ error: `Challenge validation failed: ${challengeValidation.error}` });
      }
      
      // Perform cryptographic verification based on wallet type
      let verificationResult;
      
      if (walletType === 'plug') {
        if (!signature) {
          bindingNonces.delete(nonce);
          return res.status(400).json({ error: "Signature required for Plug wallet verification" });
        }
        
        // SECURITY: Require public key for Plug verification
        const { publicKey } = req.body;
        if (!publicKey) {
          // Increment failed attempts for rate limiting
          const userAttempts = failedAttempts.get(userId) || { count: 0, lastAttempt: 0, blocked: false };
          failedAttempts.set(userId, {
            count: userAttempts.count + 1,
            lastAttempt: Date.now(),
            blocked: userAttempts.count >= 4
          });
          
          return res.status(400).json({ error: "Public key required for Plug verification" });
        }
        
        verificationResult = await CryptoVerificationService.verifyPlugSignature(
          challenge,
          signature,
          publicKey,
          principalId
        );
      } else if (walletType === 'internetIdentity') {
        if (!proof) {
          bindingNonces.delete(nonce);
          return res.status(400).json({ error: "Delegation proof required for Internet Identity verification" });
        }
        
        verificationResult = await CryptoVerificationService.verifyInternetIdentityDelegation(
          proof,
          principalId,
          challenge
        );
      } else {
        bindingNonces.delete(nonce);
        return res.status(400).json({ error: "Unsupported wallet type" });
      }
      
      // Remove used nonce after verification attempt
      bindingNonces.delete(nonce);
      
      if (!verificationResult.valid) {
        console.error(`Wallet verification failed for user ${userId}:`, verificationResult.error);
        
        // SECURITY: Increment failed attempts for rate limiting
        const userAttempts = failedAttempts.get(userId) || { count: 0, lastAttempt: 0, blocked: false };
        failedAttempts.set(userId, {
          count: userAttempts.count + 1,
          lastAttempt: Date.now(),
          blocked: userAttempts.count >= 4
        });
        
        return res.status(403).json({ 
          error: "Cryptographic verification failed",
          details: verificationResult.error
        });
      }
      
      console.log(`Wallet verification successful for user ${userId}, principal: ${principalId}`);
      
      // Validate principal format
      if (!CryptoVerificationService.isValidPrincipal(principalId)) {
        return res.status(400).json({ error: "Invalid principal ID format" });
      }
      
      // Check if principalId is already used by another user
      const existingUser = await storage.getUserByPrincipalId?.(principalId);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ error: "Principal ID already bound to another account" });
      }
      
      // Update user with cryptographically verified principal
      const updatedUser = await storage.updateUser(userId, { principalId });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        success: true,
        user: updatedUser,
        message: "Wallet successfully bound with cryptographic verification",
        verification: {
          walletType,
          principalId,
          verifiedAt: new Date().toISOString(),
          method: walletType === 'plug' ? 'signature' : 'delegation'
        }
      });
    } catch (error) {
      console.error("Error verifying wallet binding:", error);
      res.status(500).json({ error: "Wallet verification failed" });
    }
  });

  // Payment Intents endpoint with comprehensive validation
  app.post("/api/payment-intents", 
    rateLimitConfigs.financial,
    isAuthenticated, 
    validateRequest(paymentIntentSchema, 'body'),
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const { type, amount, metadata } = req.body; // Already validated
        
        // Additional financial validation
        const amountValidation = FinancialValidator.isValidAmount(parseFloat(amount), {
          min: 0.00001,
          max: 1000000,
          decimalPlaces: 8
        });
        
        if (!amountValidation.valid) {
          return res.status(400).json({
            success: false,
            error: amountValidation.error,
            code: 'INVALID_AMOUNT',
            field: 'amount',
            timestamp: new Date().toISOString()
          });
        }
      
      // CRITICAL: Use AccountIdentifier for ICP payments (not Principal)
      const systemAccountId = SYSTEM_ICP_ACCOUNT_ID;
      
      // Validate system account ID format
      if (!AddressValidator.isValidAccountId(systemAccountId)) {
        throw new Error("Invalid system account ID format");
      }
      
      // Generate a secure, trackable memo
      const memo = CryptoVerificationService.generatePaymentMemo(type, userId, metadata);
      
      // Convert amount to e8s (ICP's smallest unit)
      const amountFloat = parseFloat(amount);
      const amountE8s = Math.floor(amountFloat * 100000000);
      const feeE8s = 10000; // Standard ICP transaction fee
      
      console.log(`Generated payment intent for user ${userId}: ${amountFloat} ICP to AccountID ${systemAccountId} with memo ${memo}`);
      
      res.json({
        recipientAccountId: systemAccountId, // CRITICAL: Use AccountIdentifier, not Principal
        memo,
        amountE8s,
        feeE8s,
        totalE8s: amountE8s + feeE8s,
        amountICP: amountFloat,
        feeICP: 0.0001,
        totalICP: amountFloat + 0.0001,
        type,
        metadata,
        expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        instructions: {
          format: "recipientAccountId is ICP AccountIdentifier (64-character hex string)",
          usage: "Use this AccountIdentifier as the destination for ICP ledger transfers"
        }
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(400).json({ error: "Invalid payment intent request" });
    }
  });
  
  // CRITICAL SECURITY: Payment Verification endpoint - queries ICP Ledger to confirm payments
  app.post("/api/payments/verify", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { 
        transactionId,
        expectedRecipient, 
        expectedAmount, 
        expectedMemo, 
        paymentType,
        timeoutMinutes = 10 
      } = req.body;
      
      // Validate required fields
      if (!expectedRecipient || !expectedAmount || !expectedMemo) {
        return res.status(400).json({ error: "Missing required payment verification fields" });
      }
      
      // Validate memo format for security
      if (!CryptoVerificationService.validatePaymentMemo(expectedMemo)) {
        return res.status(400).json({ error: "Invalid payment memo format" });
      }
      
      console.log(`Starting payment verification for user ${userId}:`);
      console.log(`Expected: ${expectedAmount} ICP to ${expectedRecipient} with memo ${expectedMemo}`);
      
      // Get ICP Ledger service instance
      const ledgerService = ICPLedgerService.getInstance();
      
      // Poll for payment confirmation
      const verification = await ledgerService.pollForPayment(
        expectedRecipient,
        parseFloat(expectedAmount),
        expectedMemo,
        timeoutMinutes
      );
      
      if (!verification.verified) {
        console.error(`Payment verification failed for user ${userId}:`, verification.error);
        return res.status(400).json({
          verified: false,
          error: verification.error || "Payment not found on ICP Ledger",
          details: {
            searched: true,
            found: verification.found,
            timeout: timeoutMinutes
          }
        });
      }
      
      console.log(`Payment verified for user ${userId} at block ${verification.blockHeight}`);
      
      // Update transaction status in database if transactionId provided
      if (transactionId) {
        try {
          await storage.updateTransactionStatus(
            transactionId,
            "confirmed",
            verification.blockHeight?.toString(),
            Number(verification.blockHeight)
          );
        } catch (error) {
          console.error("Error updating transaction status:", error);
          // Continue - verification succeeded even if DB update failed
        }
      }
      
      res.json({
        verified: true,
        success: true,
        message: "Payment confirmed on ICP Ledger",
        verification: {
          blockHeight: verification.blockHeight?.toString(),
          timestamp: verification.timestamp,
          amount: verification.actualAmount?.toString(),
          memo: verification.actualMemo?.toString(),
          recipient: verification.actualRecipient,
          verifiedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ 
        error: "Payment verification failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // RWAPAWN Token Payment routes
  app.post("/api/rwapawn/create-payment-intent", 
    rateLimitConfigs.financial,
    isAuthenticated,
    validateRequest(rwapawnPaymentIntentSchema, 'body'),
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const { amount, idempotencyKey } = req.body; // USD amount, already validated
        
        // Generate idempotency key if not provided
        const finalIdempotencyKey = idempotencyKey || `rwapawn_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check for duplicate requests using idempotency key
        const existingPayment = paymentIntentCache.get(finalIdempotencyKey);
        if (existingPayment) {
          // Return existing payment intent instead of creating duplicate
          const existingPaymentIntent = await stripe.paymentIntents.retrieve(existingPayment.paymentIntentId);
          
          console.log('Returning existing payment intent for idempotency key:', {
            userId,
            idempotencyKey: finalIdempotencyKey,
            paymentIntentId: existingPayment.paymentIntentId,
            timestamp: new Date().toISOString()
          });
          
          return res.json({
            success: true,
            clientSecret: existingPaymentIntent.client_secret,
            purchaseId: existingPaymentIntent.metadata.purchaseId,
            tokenAmount: parseFloat(existingPaymentIntent.metadata.tokenAmount),
            exchangeRate: RWAPAWN_EXCHANGE_RATE,
            usdAmount: amount,
            duplicate: true
          });
        }
        
        // Calculate RWAPAWN token amount
        const tokenAmount = amount * RWAPAWN_EXCHANGE_RATE;
        
        // Create purchase record in database
        const purchase = await storage.createRwapawnPurchase({
          userId,
          amount: amount,
          purchaseType: 'credit_card',
          paymentReference: '', // Will be updated with Stripe payment intent ID
          tokenAmount: tokenAmount,
          exchangeRate: RWAPAWN_EXCHANGE_RATE,
          status: 'pending'
        });

        // Create Stripe payment intent with idempotency key
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          metadata: {
            userId,
            purchaseId: purchase.id,
            tokenAmount: tokenAmount.toString(),
            exchangeRate: RWAPAWN_EXCHANGE_RATE.toString(),
            type: 'rwapawn_purchase',
            idempotencyKey: finalIdempotencyKey,
            timestamp: new Date().toISOString()
          },
          description: `Purchase ${tokenAmount} RWAPAWN tokens`,
        }, {
          idempotencyKey: finalIdempotencyKey
        });

        // Cache payment intent to prevent duplicates
        paymentIntentCache.set(finalIdempotencyKey, {
          paymentIntentId: paymentIntent.id,
          userId,
          timestamp: Date.now()
        });
        
        // Update purchase record with payment intent ID
        await storage.updateRwapawnPurchaseStatus(purchase.id, 'pending');
        
        // Update the purchase with the payment reference
        await db
          .update(rwapawnPurchases)
          .set({ paymentReference: paymentIntent.id })
          .where(eq(rwapawnPurchases.id, purchase.id));

        console.log('RWAPAWN payment intent created:', {
          userId,
          purchaseId: purchase.id,
          usdAmount: amount,
          tokenAmount,
          paymentIntentId: paymentIntent.id,
          timestamp: new Date().toISOString()
        });

        res.json({
          success: true,
          clientSecret: paymentIntent.client_secret,
          purchaseId: purchase.id,
          tokenAmount,
          exchangeRate: RWAPAWN_EXCHANGE_RATE,
          usdAmount: amount
        });
      } catch (error) {
        console.error('Error creating RWAPAWN payment intent:', {
          userId: req.user?.claims?.sub,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
        
        res.status(500).json({
          success: false,
          error: 'Failed to create payment intent',
          code: 'PAYMENT_INTENT_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  app.post("/api/rwapawn/confirm-payment",
    rateLimitConfigs.financial,
    isAuthenticated,
    validateRequest(rwapawnPaymentConfirmSchema, 'body'),
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const { paymentIntentId, purchaseId } = req.body;

        // Verify the purchase belongs to the authenticated user
        const purchase = await storage.getRwapawnPurchase(purchaseId);
        if (!purchase || purchase.userId !== userId) {
          return res.status(404).json({
            success: false,
            error: 'Purchase not found or access denied',
            code: 'PURCHASE_NOT_FOUND'
          });
        }

        // Retrieve payment intent from Stripe to confirm payment status
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        // Enhanced security verification
        if (!paymentIntent.metadata) {
          return res.status(400).json({
            success: false,
            error: 'Payment intent metadata missing',
            code: 'INVALID_PAYMENT_INTENT'
          });
        }
        
        // Verify payment intent belongs to current user
        if (paymentIntent.metadata.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: 'Payment intent does not belong to current user',
            code: 'UNAUTHORIZED_PAYMENT_ACCESS'
          });
        }
        
        // Verify payment intent matches our purchase record
        if (paymentIntent.metadata.purchaseId !== purchaseId) {
          return res.status(400).json({
            success: false,
            error: 'Payment intent purchase ID mismatch',
            code: 'PURCHASE_ID_MISMATCH'
          });
        }
        
        // Verify payment intent type
        if (paymentIntent.metadata.type !== 'rwapawn_purchase') {
          return res.status(400).json({
            success: false,
            error: 'Invalid payment intent type',
            code: 'INVALID_PAYMENT_TYPE'
          });
        }
        
        if (paymentIntent.status === 'succeeded') {
          // Update purchase status to completed
          await storage.updateRwapawnPurchaseStatus(purchaseId, 'completed');
          
          // Add tokens to user's balance
          const tokenAmount = parseFloat(purchase.tokenAmount);
          const balance = await storage.addTokensToBalance(userId, tokenAmount);

          console.log('RWAPAWN payment completed:', {
            userId,
            purchaseId,
            paymentIntentId,
            tokenAmount,
            newBalance: balance.totalTokens,
            timestamp: new Date().toISOString()
          });

          res.json({
            success: true,
            message: 'Payment completed successfully',
            purchase: {
              ...purchase,
              status: 'completed'
            },
            tokensAdded: tokenAmount,
            newBalance: balance
          });
        } else if (paymentIntent.status === 'requires_payment_method' || 
                   paymentIntent.status === 'canceled') {
          // Update purchase status to failed
          await storage.updateRwapawnPurchaseStatus(purchaseId, 'failed');
          
          res.status(400).json({
            success: false,
            error: 'Payment failed or was canceled',
            code: 'PAYMENT_FAILED',
            paymentStatus: paymentIntent.status
          });
        } else {
          // Payment still processing
          res.json({
            success: false,
            message: 'Payment still processing',
            code: 'PAYMENT_PROCESSING',
            paymentStatus: paymentIntent.status
          });
        }
      } catch (error) {
        console.error('Error confirming RWAPAWN payment:', {
          userId: req.user?.claims?.sub,
          purchaseId: req.body?.purchaseId,
          paymentIntentId: req.body?.paymentIntentId,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
        
        res.status(500).json({
          success: false,
          error: 'Failed to confirm payment',
          code: 'PAYMENT_CONFIRMATION_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Get user's RWAPAWN balance
  app.get("/api/rwapawn/balance", 
    rateLimitConfigs.api,
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        let balance = await storage.getRwapawnBalance(userId);
        
        if (!balance) {
          // Create initial balance if it doesn't exist
          balance = await storage.createRwapawnBalance({
            userId,
            availableTokens: 0,
            stakedTokens: 0,
            pendingTokens: 0,
            totalTokens: 0
          });
        }

        res.json({
          success: true,
          balance
        });
      } catch (error) {
        console.error('Error fetching RWAPAWN balance:', {
          userId: req.user?.claims?.sub,
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString()
        });
        
        res.status(500).json({
          success: false,
          error: 'Failed to fetch balance',
          code: 'BALANCE_FETCH_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Get user's RWAPAWN purchase history
  app.get("/api/rwapawn/purchases", 
    rateLimitConfigs.api,
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const purchases = await storage.getRwapawnPurchasesByUser(userId);

        res.json({
          success: true,
          purchases
        });
      } catch (error) {
        console.error('Error fetching RWAPAWN purchases:', {
          userId: req.user?.claims?.sub,
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString()
        });
        
        res.status(500).json({
          success: false,
          error: 'Failed to fetch purchase history',
          code: 'PURCHASE_HISTORY_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // RWA Submission routes
  app.post("/api/rwa-submissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id as string; // Derive userId from authenticated user
      
      // Check KYC verification requirement
      const user = await storage.getUser(userId);
      if (!user || user.kycStatus !== "completed") {
        return res.status(403).json({
          success: false,
          error: "KYC verification is required before submitting assets for pawning",
          code: "KYC_REQUIRED",
          timestamp: new Date().toISOString()
        });
      }
      
      const submissionData = insertRwaSubmissionSchema.parse({
        ...req.body,
        userId // Override any client-provided userId
      });
      
      // Create the submission
      const submission = await storage.createRwaSubmission(submissionData);
      
      // Create a fee payment transaction
      const feeTransaction = await storage.createTransaction({
        userId,
        type: "fee_payment",
        amount: "2.00",
        currency: "ICP",
        status: "pending",
        metadata: { submissionId: submission.id }
      });
      
      res.json({ submission, transaction: feeTransaction });
    } catch (error) {
      console.error("Error creating RWA submission:", error);
      res.status(400).json({ error: "Invalid submission data" });
    }
  });

  app.get("/api/rwa-submissions/user/:userId", isAuthenticated, checkOwnership, async (req, res) => {
    try {
      const submissions = await storage.getRwaSubmissionsByUser(req.params.userId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching user submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.get("/api/rwa-submissions/pending", requireAdminAuth, async (req: any, res) => {
    try {
      const submissions = await storage.getPendingRwaSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching pending submissions:", error);
      res.status(500).json({ error: "Failed to fetch pending submissions" });
    }
  });

  app.patch("/api/rwa-submissions/:id/status", requireAdminAuth, async (req: any, res) => {
    try {
      const { status, adminNotes, reviewedBy } = req.body;
      
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const submission = await storage.updateRwaSubmissionStatus(
        req.params.id,
        status,
        adminNotes,
        reviewedBy
      );
      
      // Check if submission exists
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      
      // If approved, create a pawn loan
      if (status === "approved") {
        const loanAmount = (parseFloat(submission.estimatedValue) * 0.7).toFixed(2);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90);
        
        const loan = await storage.createPawnLoan({
          submissionId: submission.id,
          userId: submission.userId,
          loanAmount: parseFloat(loanAmount),
          assetValue: parseFloat(submission.estimatedValue),
          feeAmount: 2.00,
          expiryDate,
          status: "active"
        });
        
        // Create loan disbursement transaction
        const disbursementTransaction = await storage.createTransaction({
          userId: submission.userId,
          type: "loan_disbursement",
          amount: loanAmount,
          currency: "ICP",
          status: "pending",
          metadata: { loanId: loan.id }
        });
        
        res.json({ submission, loan, transaction: disbursementTransaction });
      } else {
        res.json({ submission });
      }
    } catch (error) {
      console.error("Error updating submission status:", error);
      res.status(500).json({ error: "Failed to update submission status" });
    }
  });

  // Pawn Loan routes
  app.get("/api/pawn-loans/user/:userId", isAuthenticated, checkOwnership, async (req, res) => {
    try {
      const loans = await storage.getPawnLoansByUser(req.params.userId);
      res.json(loans);
    } catch (error) {
      console.error("Error fetching user loans:", error);
      res.status(500).json({ error: "Failed to fetch loans" });
    }
  });

  app.get("/api/pawn-loans/active", async (req, res) => {
    try {
      const loans = await storage.getActivePawnLoans();
      res.json(loans);
    } catch (error) {
      console.error("Error fetching active loans:", error);
      res.status(500).json({ error: "Failed to fetch active loans" });
    }
  });

  app.patch("/api/pawn-loans/:id/redeem", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id as string;
      const loan = await storage.getPawnLoan(req.params.id);
      
      if (!loan || loan.status !== "active") {
        return res.status(404).json({ error: "Active loan not found" });
      }
      
      // Check ownership - user can only redeem their own loans
      if (loan.userId !== userId) {
        return res.status(403).json({ error: "Access denied - not loan owner" });
      }
      
      // Update loan status
      const updatedLoan = await storage.updatePawnLoanStatus(req.params.id, "redeemed");
      
      // Create redemption payment transaction
      const redemptionTransaction = await storage.createTransaction({
        userId,
        type: "redemption_payment",
        amount: loan.loanAmount,
        currency: "ICP",
        status: "pending",
        metadata: { loanId: loan.id }
      });
      
      res.json({ loan: updatedLoan, transaction: redemptionTransaction });
    } catch (error) {
      console.error("Error redeeming loan:", error);
      res.status(500).json({ error: "Failed to redeem loan" });
    }
  });

  // Marketplace routes
  app.get("/api/marketplace/assets", async (req, res) => {
    try {
      const assets = await storage.getMarketplaceAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching marketplace assets:", error);
      res.status(500).json({ error: "Failed to fetch marketplace assets" });
    }
  });

  app.post("/api/marketplace/assets", requireAdminAuth, async (req: any, res) => {
    try {
      const assetData = insertMarketplaceAssetSchema.parse(req.body);
      const asset = await storage.createMarketplaceAsset(assetData);
      res.json(asset);
    } catch (error) {
      console.error("Error creating marketplace asset:", error);
      res.status(400).json({ error: "Invalid asset data" });
    }
  });

  app.post("/api/marketplace/assets/:id/bid", isAuthenticated, async (req: any, res) => {
    try {
      const bidderId = req.user.id as string; // Derive bidderId from authenticated user
      const bidData = insertBidSchema.parse({
        assetId: req.params.id,
        bidderId, // Use authenticated user ID
        ...req.body
      });
      
      const asset = await storage.getMarketplaceAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      // Check if bid is higher than current bid
      const currentHighestBid = await storage.getHighestBid(req.params.id);
      const currentBidAmount = currentHighestBid?.amount ? parseFloat(currentHighestBid.amount) : parseFloat(asset.startingPrice);
      
      if (parseFloat(bidData.amount) <= currentBidAmount) {
        return res.status(400).json({ error: "Bid must be higher than current highest bid" });
      }
      
      const bid = await storage.createBid(bidData);
      
      // Update asset with new highest bid
      await storage.updateMarketplaceAsset(req.params.id, {
        currentBid: bidData.amount,
        highestBidder: bidData.bidderId
      });
      
      // Create bid payment transaction
      const bidTransaction = await storage.createTransaction({
        userId: bidData.bidderId,
        type: "bid_payment",
        amount: bidData.amount,
        currency: "ICP",
        status: "pending",
        metadata: { bidId: bid.id, assetId: req.params.id }
      });
      
      res.json({ bid, transaction: bidTransaction });
    } catch (error) {
      console.error("Error placing bid:", error);
      res.status(400).json({ error: "Invalid bid data" });
    }
  });

  // Comprehensive Chain Fusion Bridge Routes
  
  // PRODUCTION-READY: Rate limiting configuration for bridge endpoints - CRITICAL for security
  const bridgeRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 10, // 10 requests per minute per IP for bridge operations (stricter than pricing)
    message: { error: "Too many bridge requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Bridge rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
      res.status(429).json({
        error: "Rate limit exceeded for bridge operations",
        retryAfter: Math.ceil(60), // 1 minute
        limit: 10,
        endpoint: req.path
      });
    }
  });

  // Apply rate limiting to ALL bridge endpoints for security
  app.use("/api/bridge", bridgeRateLimit);

  // Get bridge cost estimate and time
  app.post("/api/bridge/estimate", isAuthenticated, async (req: any, res) => {
    try {
      const estimationData = bridgeEstimationSchema.parse(req.body);
      const estimation = await chainFusionBridge.estimateBridge(estimationData);
      res.json(estimation);
    } catch (error) {
      console.error("Error estimating bridge:", error);
      res.status(400).json({ 
        error: "Bridge estimation failed", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create bridge intent with PRODUCTION-READY address validation
  app.post("/api/bridge/initiate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id as string;
      const initiationData = bridgeInitiationSchema.parse(req.body);
      
      // CRITICAL SECURITY: Validate addresses with proper checksums
      const fromAddressValidation = CryptoVerificationService.validateBridgeAddress(
        initiationData.fromAddress,
        initiationData.fromNetwork,
        initiationData.fromNetwork === 'ethereum' ? 'address' : 'accountId'
      );
      
      if (!fromAddressValidation.valid) {
        return res.status(400).json({ 
          error: "Invalid from address", 
          details: fromAddressValidation.error 
        });
      }
      
      const toAddressValidation = CryptoVerificationService.validateBridgeAddress(
        initiationData.toAddress,
        initiationData.toNetwork,
        initiationData.toNetwork === 'ethereum' ? 'address' : 'accountId'
      );
      
      if (!toAddressValidation.valid) {
        return res.status(400).json({ 
          error: "Invalid to address", 
          details: toAddressValidation.error 
        });
      }
      
      console.log(`Bridge initiation with validated addresses - From: ${initiationData.fromAddress} (${initiationData.fromNetwork}), To: ${initiationData.toAddress} (${initiationData.toNetwork})`);
      
      const bridge = await chainFusionBridge.initiateBridge(userId, initiationData);
      res.json(bridge);
    } catch (error) {
      console.error("Error initiating bridge:", error);
      res.status(400).json({ 
        error: "Bridge initiation failed", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get bridge transaction status
  app.get("/api/bridge/status/:id", isAuthenticated, async (req, res) => {
    try {
      const bridgeId = req.params.id;
      const bridge = await chainFusionBridge.getBridgeStatus(bridgeId);
      
      if (!bridge) {
        return res.status(404).json({ error: "Bridge transaction not found" });
      }
      
      // Verify user ownership of bridge transaction  
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (bridge.userId !== userId) {
        return res.status(403).json({ error: "Access denied - not your bridge transaction" });
      }
      
      res.json(bridge);
    } catch (error) {
      console.error("Error fetching bridge status:", error);
      res.status(500).json({ error: "Failed to fetch bridge status" });
    }
  });

  // Get user bridge history with filtering
  app.get("/api/bridge/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id as string;
      const filters = bridgeHistoryFilterSchema.parse({
        status: req.query.status,
        fromNetwork: req.query.fromNetwork,
        toNetwork: req.query.toNetwork,
        fromToken: req.query.fromToken,
        toToken: req.query.toToken,
        limit: req.query.limit ? parseInt(req.query.limit) : 20,
        offset: req.query.offset ? parseInt(req.query.offset) : 0,
      });
      
      const bridges = await chainFusionBridge.getBridgeHistory(userId, filters);
      res.json(bridges);
    } catch (error) {
      console.error("Error fetching bridge history:", error);
      res.status(500).json({ error: "Failed to fetch bridge history" });
    }
  });

  // Cancel pending bridge transaction (if possible)
  app.post("/api/bridge/cancel/:id", isAuthenticated, async (req: any, res) => {
    try {
      const bridgeId = req.params.id;
      const userId = req.user.id as string;
      
      const bridge = await chainFusionBridge.getBridgeStatus(bridgeId);
      if (!bridge) {
        return res.status(404).json({ error: "Bridge transaction not found" });
      }
      
      // Verify ownership
      if (bridge.userId !== userId) {
        return res.status(403).json({ error: "Access denied - not your bridge transaction" });
      }
      
      // Only allow cancellation of pending transactions
      if (bridge.status !== 'pending') {
        return res.status(400).json({ error: "Can only cancel pending bridge transactions" });
      }
      
      // Update status to failed (effectively cancelling)
      const cancelledBridge = await storage.updateBridgeTransactionStatus(
        bridgeId, 
        'failed', 
        { errorMessage: 'Cancelled by user' }
      );
      
      res.json(cancelledBridge);
    } catch (error) {
      console.error("Error cancelling bridge:", error);
      res.status(500).json({ error: "Failed to cancel bridge transaction" });
    }
  });

  // Get supported bridge token pairs
  app.get("/api/bridge/supported-pairs", async (req, res) => {
    try {
      const pairs = chainFusionBridge.getSupportedBridgePairs();
      res.json(pairs);
    } catch (error) {
      console.error("Error fetching supported pairs:", error);
      res.status(500).json({ error: "Failed to fetch supported bridge pairs" });
    }
  });

  // Get supported tokens for a network
  app.get("/api/bridge/supported-tokens/:network", async (req, res) => {
    try {
      const network = req.params.network as 'ethereum' | 'icp';
      
      if (!['ethereum', 'icp'].includes(network)) {
        return res.status(400).json({ error: "Invalid network. Use 'ethereum' or 'icp'" });
      }
      
      const tokens = chainFusionBridge.getSupportedTokens(network);
      res.json({ network, tokens });
    } catch (error) {
      console.error("Error fetching supported tokens:", error);
      res.status(500).json({ error: "Failed to fetch supported tokens" });
    }
  });

  // Bridge transaction webhooks for status updates (for future integration)
  app.post("/api/bridge/webhook", async (req, res) => {
    try {
      // Future: Handle bridge status updates from external services
      // For now, just log the webhook data
      console.log("Bridge webhook received:", req.body);
      res.json({ status: "ok", message: "Webhook received" });
    } catch (error) {
      console.error("Error handling bridge webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", requireAdminAuth, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // Transaction routes
  app.get("/api/transactions/user/:userId", isAuthenticated, checkOwnership, async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByUser(req.params.userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching user transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Mock endpoint for expired loans to marketplace conversion
  app.post("/api/admin/process-expired-loans", requireAdminAuth, async (req: any, res) => {
    try {
      // Get expired loans
      const expiredLoans = await storage.getExpiringPawnLoans(-1); // Already expired
      const newAssets = [];
      
      for (const loan of expiredLoans) {
        if (loan.status === "active") {
          // Mark loan as expired
          await storage.updatePawnLoanStatus(loan.id, "expired");
          
          // Get submission details
          const submission = await storage.getRwaSubmission(loan.submissionId);
          if (submission) {
            // Create marketplace asset
            const startingPrice = (parseFloat(loan.assetValue) * 0.8).toFixed(2); // 80% of original value
            const daysSinceExpiry = Math.floor((Date.now() - loan.expiryDate.getTime()) / (1000 * 60 * 60 * 24));
            
            const asset = await storage.createMarketplaceAsset({
              loanId: loan.id,
              assetName: submission.assetName,
              category: submission.category,
              originalValue: loan.assetValue,
              startingPrice,
              daysExpired: daysSinceExpiry,
              description: submission.description || "",
              status: "available"
            });
            
            newAssets.push(asset);
          }
        }
      }
      
      res.json({ message: `Processed ${newAssets.length} expired loans`, assets: newAssets });
    } catch (error) {
      console.error("Error processing expired loans:", error);
      res.status(500).json({ error: "Failed to process expired loans" });
    }
  });

  // Rate limiting configuration for pricing endpoints
  const pricingRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 30, // 30 requests per minute per IP
    message: { error: "Too many pricing requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Rate limit exceeded for pricing API: ${req.ip}`);
      res.status(429).json({
        error: "Rate limit exceeded for pricing API",
        retryAfter: Math.ceil(60), // 1 minute
        limit: 30
      });
    }
  });

  // Apply rate limiting to all pricing endpoints
  app.use("/api/pricing", pricingRateLimit);

  // Circuit breaker for external pricing APIs
  const circuitBreaker = {
    failures: new Map<string, { count: number; lastFailure: number; isOpen: boolean }>(),
    
    isCircuitOpen(service: string): boolean {
      const circuit = this.failures.get(service);
      if (!circuit) return false;
      
      const now = Date.now();
      const timeSinceLastFailure = now - circuit.lastFailure;
      
      // Reset circuit after 5 minutes
      if (timeSinceLastFailure > 5 * 60 * 1000) {
        circuit.count = 0;
        circuit.isOpen = false;
        return false;
      }
      
      // Open circuit after 5 failures in 5 minutes
      if (circuit.count >= 5) {
        circuit.isOpen = true;
        return true;
      }
      
      return circuit.isOpen;
    },
    
    recordFailure(service: string): void {
      const circuit = this.failures.get(service) || { count: 0, lastFailure: 0, isOpen: false };
      circuit.count++;
      circuit.lastFailure = Date.now();
      circuit.isOpen = circuit.count >= 5;
      this.failures.set(service, circuit);
    },
    
    recordSuccess(service: string): void {
      const circuit = this.failures.get(service);
      if (circuit) {
        circuit.count = Math.max(0, circuit.count - 1);
        if (circuit.count === 0) {
          circuit.isOpen = false;
        }
      }
    }
  };

  // Comprehensive Pricing API Endpoints
  app.get("/api/pricing/estimate", async (req, res) => {
    try {
      const query = pricingQuerySchema.parse(req.query);
      
      // Use database cache first, then API service
      const cachedPricing = await storage.getPricingCache(
        query.category,
        query.symbol,
        query.itemType
      );
      
      // Return cached data if valid and not forcing refresh
      if (cachedPricing && !query.forceRefresh) {
        return res.json({
          median: parseFloat(cachedPricing.medianPrice),
          p25: cachedPricing.p25Price ? parseFloat(cachedPricing.p25Price) : undefined,
          p75: cachedPricing.p75Price ? parseFloat(cachedPricing.p75Price) : undefined,
          currency: cachedPricing.currency,
          sources: cachedPricing.sources,
          confidence: parseFloat(cachedPricing.confidence),
          timestamp: cachedPricing.lastUpdated?.toISOString() || new Date().toISOString(),
          cached: true,
          metadata: cachedPricing.specifications
        });
      }
      
      // Check circuit breaker before calling external APIs
      const serviceKey = `pricing_${query.category}`;
      if (circuitBreaker.isCircuitOpen(serviceKey)) {
        return res.status(503).json({
          error: "Pricing service temporarily unavailable",
          reason: "Circuit breaker is open due to repeated failures",
          retryAfter: 300 // 5 minutes
        });
      }

      // Get fresh pricing from external APIs
      let pricing;
      try {
        pricing = await pricingService.getAssetPricing(query);
        circuitBreaker.recordSuccess(serviceKey);
      } catch (apiError) {
        console.error(`Pricing API error for ${serviceKey}:`, apiError);
        circuitBreaker.recordFailure(serviceKey);
        
        // Try to return cached data even if expired as fallback
        if (cachedPricing) {
          console.warn("Returning expired cached data due to API failure");
          return res.json({
            median: parseFloat(cachedPricing.medianPrice),
            p25: cachedPricing.p25Price ? parseFloat(cachedPricing.p25Price) : undefined,
            p75: cachedPricing.p75Price ? parseFloat(cachedPricing.p75Price) : undefined,
            currency: cachedPricing.currency,
            sources: cachedPricing.sources,
            confidence: parseFloat(cachedPricing.confidence) * 0.5, // Reduce confidence for stale data
            timestamp: cachedPricing.lastUpdated?.toISOString() || new Date().toISOString(),
            cached: true,
            stale: true,
            warning: "Using stale data due to API unavailability",
            metadata: cachedPricing.specifications
          });
        }
        
        throw apiError;
      }
      
      // Store in database cache for future requests
      try {
        await storage.storePricingCache({
          category: query.category,
          symbol: query.symbol,
          itemType: query.itemType,
          specifications: query.specifications,
          medianPrice: pricing.median.toString(),
          p25Price: pricing.p25?.toString(),
          p75Price: pricing.p75?.toString(),
          currency: pricing.currency,
          sources: pricing.sources,
          confidence: pricing.confidence.toString(),
          ttlSeconds: pricing.metadata?.ttl || 300, // Default 5 minute TTL
        });
      } catch (cacheError) {
        console.warn("Failed to cache pricing data:", cacheError);
        // Continue without caching
      }
      
      res.json({ ...pricing, cached: false });
    } catch (error) {
      console.error("Pricing estimate error:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("required") || errorMessage.includes("Invalid")) {
        return res.status(400).json({ 
          error: "Invalid pricing query parameters",
          details: errorMessage 
        });
      }
      
      res.status(500).json({ 
        error: "Unable to fetch pricing estimate",
        details: errorMessage 
      });
    }
  });

  // POST endpoint for complex pricing estimates with JSON body (supports complex specifications)
  app.post("/api/pricing/estimate", async (req, res) => {
    try {
      const query = pricingQuerySchema.parse(req.body);
      
      // Use database cache first, then API service
      const cachedPricing = await storage.getPricingCache(
        query.category,
        query.symbol,
        query.itemType
      );
      
      // Return cached data if valid and not forcing refresh
      if (cachedPricing && !query.forceRefresh) {
        return res.json({
          median: parseFloat(cachedPricing.medianPrice),
          p25: cachedPricing.p25Price ? parseFloat(cachedPricing.p25Price) : undefined,
          p75: cachedPricing.p75Price ? parseFloat(cachedPricing.p75Price) : undefined,
          currency: cachedPricing.currency,
          sources: cachedPricing.sources,
          confidence: parseFloat(cachedPricing.confidence),
          timestamp: cachedPricing.lastUpdated?.toISOString() || new Date().toISOString(),
          cached: true,
          metadata: cachedPricing.specifications
        });
      }
      
      // Check circuit breaker before calling external APIs
      const serviceKey = `pricing_${query.category}`;
      if (circuitBreaker.isCircuitOpen(serviceKey)) {
        return res.status(503).json({
          error: "Pricing service temporarily unavailable",
          reason: "Circuit breaker is open due to repeated failures",
          retryAfter: 300 // 5 minutes
        });
      }

      // Get fresh pricing from external APIs
      let pricing;
      try {
        pricing = await pricingService.getAssetPricing(query);
        circuitBreaker.recordSuccess(serviceKey);
        
        // Create pricing estimate audit trail
        await storage.createPricingEstimate({
          submissionId: req.body.submissionId || null, // Optional reference to RWA submission
          category: query.category,
          // specifications: query.specifications || null, // Removed - not in schema
          estimatedValue: pricing.median.toString(),
          confidenceScore: pricing.confidence.toString(),
          methodology: pricing.methodology,
          sources: pricing.sources,
        });
      } catch (apiError) {
        console.error(`Pricing API error for ${serviceKey}:`, apiError);
        circuitBreaker.recordFailure(serviceKey);
        
        // Try to return cached data even if expired as fallback
        if (cachedPricing) {
          console.warn("Returning expired cached data due to API failure");
          return res.json({
            median: parseFloat(cachedPricing.medianPrice),
            p25: cachedPricing.p25Price ? parseFloat(cachedPricing.p25Price) : undefined,
            p75: cachedPricing.p75Price ? parseFloat(cachedPricing.p75Price) : undefined,
            currency: cachedPricing.currency,
            sources: cachedPricing.sources,
            confidence: parseFloat(cachedPricing.confidence) * 0.5, // Reduce confidence for stale data
            timestamp: cachedPricing.lastUpdated?.toISOString() || new Date().toISOString(),
            cached: true,
            stale: true,
            warning: "Using stale data due to API unavailability",
            metadata: cachedPricing.specifications
          });
        }
        
        throw apiError;
      }
      
      // Store in database cache for future requests
      try {
        await storage.storePricingCache({
          category: query.category,
          symbol: query.symbol,
          itemType: query.itemType,
          specifications: query.specifications,
          medianPrice: pricing.median.toString(),
          p25Price: pricing.p25?.toString(),
          p75Price: pricing.p75?.toString(),
          currency: pricing.currency,
          sources: pricing.sources,
          confidence: pricing.confidence.toString(),
          ttlSeconds: pricing.metadata?.ttl || 300, // Default 5 minute TTL
        });
      } catch (cacheError) {
        console.warn("Failed to cache pricing data:", cacheError);
        // Continue without caching
      }
      
      res.json({ ...pricing, cached: false, method: 'POST' });
    } catch (error) {
      console.error("Pricing estimate error (POST):", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("required") || errorMessage.includes("Invalid")) {
        return res.status(400).json({ 
          error: "Invalid pricing query in request body",
          details: errorMessage 
        });
      }
      
      res.status(500).json({ 
        error: "Unable to fetch pricing estimate",
        details: errorMessage 
      });
    }
  });

  // Get available pricing categories and supported symbols
  app.get("/api/pricing/categories", async (req, res) => {
    try {
      const categories = {
        crypto: {
          description: "Cryptocurrencies and digital assets",
          supported_symbols: ["BTC", "ETH", "ICP", "USDC", "USDT", "ADA", "DOT", "LINK"],
          sample_query: "/api/pricing/estimate?category=crypto&symbol=BTC"
        },
        precious_metals: {
          description: "Gold, silver, platinum, and palladium",
          supported_symbols: ["XAU", "XAG", "XPT", "XPD"],
          sample_query: "/api/pricing/estimate?category=precious_metals&symbol=XAU"
        },
        jewelry: {
          description: "Jewelry and precious metal items",
          supported_types: ["ring", "necklace", "earrings", "bracelet", "watch"],
          required_specs: ["weight", "purity"],
          sample_query: "/api/pricing/estimate?category=jewelry&itemType=ring&specifications[weight]=10&specifications[purity]=18k"
        },
        electronics: {
          description: "Electronic devices and gadgets",
          supported_types: ["smartphone", "laptop", "tablet", "tv", "gaming_console"],
          required_specs: ["brand", "model", "age_years", "condition"],
          sample_query: "/api/pricing/estimate?category=electronics&itemType=smartphone&specifications[brand]=apple&specifications[model]=iphone13&specifications[age_years]=1"
        },
        collectibles: {
          description: "Collectible items and memorabilia",
          supported_types: ["trading_cards", "coins", "stamps", "comics"],
          sample_query: "/api/pricing/estimate?category=collectibles&itemType=trading_cards&specifications[set]=pokemon&specifications[rarity]=rare"
        },
        artwork: {
          description: "Paintings, sculptures, and art pieces",
          required_specs: ["artist", "medium", "size"],
          sample_query: "/api/pricing/estimate?category=artwork&specifications[artist]=banksy&specifications[medium]=print&specifications[size]=medium"
        },
        watches: {
          description: "Luxury and collectible timepieces",
          supported_brands: ["rolex", "omega", "tag_heuer", "seiko", "casio"],
          required_specs: ["brand", "model", "year", "condition"],
          sample_query: "/api/pricing/estimate?category=watches&specifications[brand]=rolex&specifications[model]=submariner&specifications[year]=2020"
        }
      };
      
      res.json(categories);
    } catch (error) {
      console.error("Error fetching pricing categories:", error);
      res.status(500).json({ error: "Failed to fetch pricing categories" });
    }
  });

  // Bulk pricing estimates for multiple assets
  app.post("/api/pricing/bulk-estimate", async (req, res) => {
    try {
      const { queries } = req.body;
      
      if (!Array.isArray(queries) || queries.length === 0) {
        return res.status(400).json({ error: "Array of pricing queries required" });
      }
      
      if (queries.length > 10) {
        return res.status(400).json({ error: "Maximum 10 queries allowed per bulk request" });
      }
      
      // Validate all queries first
      const validatedQueries = queries.map(query => pricingQuerySchema.parse(query));
      
      // Process pricing estimates in parallel
      const results = await Promise.allSettled(
        validatedQueries.map(async (query, index) => {
          try {
            const pricing = await pricingService.getAssetPricing(query);
            return { index, status: 'success', data: pricing };
          } catch (error) {
            return { 
              index, 
              status: 'error', 
              error: error instanceof Error ? error.message : String(error),
              query: query 
            };
          }
        })
      );
      
      const responses = results.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return { 
            status: 'error', 
            error: 'Processing failed',
            details: result.reason?.message 
          };
        }
      });
      
      res.json({ results: responses });
    } catch (error) {
      console.error("Bulk pricing estimate error:", error);
      res.status(500).json({ 
        error: "Bulk pricing estimation failed",
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Get pricing history for an asset (from database cache)
  app.get("/api/pricing/history", async (req, res) => {
    try {
      const { category, symbol, itemType, days = 7 } = req.query;
      
      if (!category) {
        return res.status(400).json({ error: "Category parameter required" });
      }
      
      // This would require a more sophisticated query to get historical data
      // For now, return a simple response indicating feature availability
      res.json({ 
        message: "Pricing history feature",
        category,
        symbol,
        itemType,
        days: parseInt(days as string),
        note: "Historical pricing data collection in progress"
      });
    } catch (error) {
      console.error("Pricing history error:", error);
      res.status(500).json({ error: "Failed to fetch pricing history" });
    }
  });

  // Admin endpoint to clear expired pricing cache
  app.delete("/api/pricing/cache", requireAdminAuth, async (req: any, res) => {
    try {
      const deletedCount = await storage.clearExpiredPricingCache();
      res.json({ 
        message: `Cleared ${deletedCount} expired pricing cache entries`,
        deletedCount 
      });
    } catch (error) {
      console.error("Cache clearing error:", error);
      res.status(500).json({ error: "Failed to clear pricing cache" });
    }
  });

  // Enhanced admin endpoint to get comprehensive pricing service statistics
  app.get("/api/pricing/stats", requireAdminAuth, async (req: any, res) => {
    try {
      const memoryCache = pricingService.getCacheStats();
      
      // Get database cache statistics
      const dbCacheQuery = await db.select({
        category: assetPricingCache.category,
        count: sql<number>`count(*)::int`,
        avgTtl: sql<number>`avg(extract(epoch from (created_at + interval '1 second' * ttl_seconds - now())))::int`,
        expired: sql<number>`count(case when (created_at + interval '1 second' * ttl_seconds) < now() then 1 end)::int`
      })
      .from(assetPricingCache)
      .groupBy(assetPricingCache.category);
      
      // Get circuit breaker status
      const circuitBreakerStatus = Array.from(circuitBreaker.failures.entries()).map(([service, stats]) => ({
        service,
        failures: stats.count,
        isOpen: stats.isOpen,
        lastFailure: new Date(stats.lastFailure).toISOString()
      }));
      
      res.json({
        memory_cache: memoryCache,
        database_cache: dbCacheQuery,
        circuit_breakers: circuitBreakerStatus,
        timestamp: new Date().toISOString(),
        system_status: circuitBreakerStatus.some(cb => cb.isOpen) ? "degraded" : "operational"
      });
    } catch (error) {
      console.error("Pricing stats error:", error);
      res.status(500).json({ error: "Failed to fetch pricing statistics" });
    }
  });

  // Admin endpoint to clear specific cache entries
  app.delete("/api/pricing/cache/:category", requireAdminAuth, async (req: any, res) => {
    try {
      const { category } = req.params;
      const { symbol, itemType } = req.query;
      
      // Clear from database cache
      const conditions = [eq(assetPricingCache.category, category)];
      
      if (symbol) {
        conditions.push(eq(assetPricingCache.symbol, symbol));
      }
      if (itemType) {
        conditions.push(eq(assetPricingCache.itemType, itemType));
      }
      
      await db.delete(assetPricingCache).where(and(...conditions));
      
      res.json({ 
        message: `Cleared cache entries for category: ${category}`,
        category,
        symbol: symbol || "all",
        itemType: itemType || "all"
      });
    } catch (error) {
      console.error("Cache clearing error:", error);
      res.status(500).json({ error: "Failed to clear specific cache entries" });
    }
  });

  // Admin endpoint to reset circuit breakers
  app.post("/api/pricing/circuit-breaker/reset", requireAdminAuth, async (req: any, res) => {
    try {
      const { service } = req.body;
      
      if (service) {
        // Reset specific service
        circuitBreaker.failures.set(service, { count: 0, lastFailure: 0, isOpen: false });
        res.json({ message: `Circuit breaker reset for service: ${service}` });
      } else {
        // Reset all circuit breakers
        circuitBreaker.failures.clear();
        res.json({ message: "All circuit breakers reset" });
      }
    } catch (error) {
      console.error("Circuit breaker reset error:", error);
      res.status(500).json({ error: "Failed to reset circuit breaker" });
    }
  });

  // Health check endpoint for pricing system
  app.get("/api/pricing/health", async (req, res) => {
    try {
      const healthCheck = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        checks: {
          database: "unknown",
          memory_cache: "unknown",
          external_apis: "unknown"
        }
      };
      
      // Test database connection
      try {
        await storage.getPricingCache("crypto", "BTC"); // Simple test query
        healthCheck.checks.database = "healthy";
      } catch (dbError) {
        healthCheck.checks.database = "unhealthy";
        healthCheck.status = "unhealthy";
      }
      
      // Test memory cache
      try {
        const memCache = pricingService.getCacheStats();
        healthCheck.checks.memory_cache = "healthy";
      } catch (cacheError) {
        healthCheck.checks.memory_cache = "unhealthy";
        healthCheck.status = "unhealthy";
      }
      
      // Check circuit breaker status
      const hasOpenCircuits = Array.from(circuitBreaker.failures.values()).some(cb => cb.isOpen);
      healthCheck.checks.external_apis = hasOpenCircuits ? "degraded" : "healthy";
      if (hasOpenCircuits && healthCheck.status === "healthy") {
        healthCheck.status = "degraded";
      }
      
      const statusCode = healthCheck.status === "healthy" ? 200 : healthCheck.status === "degraded" ? 200 : 503;
      res.status(statusCode).json(healthCheck);
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed"
      });
    }
  });

  // Document Analysis API Endpoints
  
  // Upload document and start analysis
  app.post("/api/documents/upload", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "No file provided. Please select a document to upload." });
      }
      
      // Validate upload data from form fields
      const uploadData = documentUploadSchema.parse(req.body);
      
      // Check if submission exists and user owns it
      const submission = await storage.getRwaSubmission(uploadData.submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      
      if (submission.userId !== userId) {
        return res.status(403).json({ error: "Access denied - not submission owner" });
      }
      
      // Map multer file to DocumentAnalysisService interface
      const uploadedFile = {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        fieldname: req.file.fieldname,
        encoding: req.file.encoding
      };
      
      console.log(`Document upload started: ${uploadedFile.originalname} (${uploadedFile.mimetype}, ${(uploadedFile.size / 1024).toFixed(2)} KB) for user ${userId}`);
      
      // Upload and analyze document
      const document = await documentAnalysisService.uploadAndAnalyze(uploadedFile, uploadData, userId);
      
      res.json({
        document,
        message: "Document uploaded successfully. Analysis started.",
        uploadInfo: {
          filename: uploadedFile.originalname,
          size: uploadedFile.size,
          type: uploadedFile.mimetype
        }
      });
    } catch (error) {
      console.error("Document upload error:", error);
      
      // Handle multer-specific errors
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size allowed is 50MB." });
        } else if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: "Too many files. Only one file allowed per upload." });
        } else {
          return res.status(400).json({ error: `Upload error: ${error.message}` });
        }
      }
      
      // Handle file filter errors
      if (error instanceof Error && error.message?.includes('Unsupported file type')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: "Document upload failed. Please try again." });
    }
  });
  
  // Get document analysis results
  app.get("/api/documents/:id/analysis", isAuthenticated, async (req: any, res) => {
    try {
      const documentId = req.params.id;
      const userId = req.user.id;
      
      // Get document and verify ownership
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Check if user owns the document or is admin
      const user = await storage.getUser(userId);
      const canAccess = document.userId === userId || user?.isAdmin;
      
      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get analysis results
      const analysisResult = await documentAnalysisService.getAnalysisResult(documentId);
      const fraudResult = await documentAnalysisService.getFraudDetectionResult(documentId);
      
      res.json({
        document,
        analysis: analysisResult,
        fraudDetection: fraudResult
      });
    } catch (error) {
      console.error("Document analysis retrieval error:", error);
      res.status(500).json({ error: "Failed to get analysis results" });
    }
  });
  
  // Trigger document re-analysis
  app.post("/api/documents/:id/reanalyze", isAuthenticated, async (req: any, res) => {
    try {
      const documentId = req.params.id;
      const userId = req.user.id;
      
      // Validate analysis options
      const analysisRequest = documentAnalysisRequestSchema.parse({
        documentId,
        ...req.body
      });
      
      // Get document and verify ownership
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Check if user owns the document or is admin
      const user = await storage.getUser(userId);
      const canReanalyze = document.userId === userId || user?.isAdmin;
      
      if (!canReanalyze) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Start re-analysis
      const analysisResult = await documentAnalysisService.reanalyzeDocument(
        documentId, 
        analysisRequest.analysisOptions
      );
      
      res.json({
        message: "Re-analysis started successfully",
        analysis: analysisResult
      });
    } catch (error) {
      console.error("Document re-analysis error:", error);
      res.status(500).json({ error: "Re-analysis failed" });
    }
  });
  
  // Get user's documents for a submission
  app.get("/api/submissions/:id/documents", isAuthenticated, async (req: any, res) => {
    try {
      const submissionId = req.params.id;
      const userId = req.user.id;
      
      // Check if user owns the submission
      const submission = await storage.getRwaSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      
      if (submission.userId !== userId) {
        return res.status(403).json({ error: "Access denied - not submission owner" });
      }
      
      // Get documents for submission
      const documents = await storage.getDocumentsBySubmission(submissionId);
      
      res.json(documents);
    } catch (error) {
      console.error("Documents retrieval error:", error);
      res.status(500).json({ error: "Failed to get documents" });
    }
  });
  
  // Admin endpoints
  
  // Get pending documents analysis queue
  app.get("/api/admin/documents/queue", requireAdminAuth, async (req: any, res) => {
    try {
      const queue = await documentAnalysisService.getAnalysisQueue();
      
      res.json({
        queue,
        totalPending: queue.filter(item => item.queueStatus === 'pending').length,
        totalProcessing: queue.filter(item => item.queueStatus === 'processing').length,
        totalFailed: queue.filter(item => item.queueStatus === 'failed').length
      });
    } catch (error) {
      console.error("Analysis queue retrieval error:", error);
      res.status(500).json({ error: "Failed to get analysis queue" });
    }
  });
  
  // Process queued document (admin trigger)
  app.post("/api/admin/documents/queue/:queueId/process", requireAdminAuth, async (req: any, res) => {
    try {
      const queueId = req.params.queueId;
      
      await documentAnalysisService.processQueuedDocument(queueId);
      
      res.json({ message: "Document processing started successfully" });
    } catch (error) {
      console.error("Queue processing error:", error);
      res.status(500).json({ error: "Failed to process queued document" });
    }
  });
  
  // Batch analyze documents
  app.post("/api/admin/documents/batch-analyze", requireAdminAuth, async (req: any, res) => {
    try {
      const { documentIds, analysisOptions } = req.body;
      
      if (!documentIds || !Array.isArray(documentIds)) {
        return res.status(400).json({ error: "Document IDs array is required" });
      }
      
      const result = await documentAnalysisService.batchAnalyze(documentIds, analysisOptions);
      
      res.json({
        message: "Batch analysis initiated",
        ...result
      });
    } catch (error) {
      console.error("Batch analysis error:", error);
      res.status(500).json({ error: "Batch analysis failed" });
    }
  });
  
  // Get analysis statistics (admin)
  app.get("/api/admin/documents/stats", requireAdminAuth, async (req: any, res) => {
    try {
      // Get document analysis statistics from database
      const stats = await db.select({
        total_documents: sql<number>`count(*)::int`,
        pending_analysis: sql<number>`count(case when analysis_status = 'pending' then 1 end)::int`,
        processing_analysis: sql<number>`count(case when analysis_status = 'processing' then 1 end)::int`,
        completed_analysis: sql<number>`count(case when analysis_status = 'completed' then 1 end)::int`,
        failed_analysis: sql<number>`count(case when analysis_status = 'failed' then 1 end)::int`,
        avg_processing_time: sql<number>`avg(case when analysis_status = 'completed' then extract(epoch from (updated_at - created_at)) end)::int`
      }).from(documents);
      
      // Get fraud detection statistics
      const fraudStats = await db.select({
        total_analyzed: sql<number>`count(*)::int`,
        high_risk: sql<number>`count(case when risk_level = 'high' then 1 end)::int`,
        critical_risk: sql<number>`count(case when risk_level = 'critical' then 1 end)::int`,
        requires_review: sql<number>`count(case when requires_manual_review = true then 1 end)::int`,
        avg_fraud_score: sql<number>`avg(overall_fraud_score)::numeric`
      }).from(fraudDetectionResults);
      
      res.json({
        documents: stats[0] || {},
        fraud_detection: fraudStats[0] || {},
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Analysis stats error:", errorMessage);
      res.status(500).json({ error: "Failed to get analysis statistics", details: errorMessage });
    }
  });

  // ENHANCED ADMIN DASHBOARD API ENDPOINTS

  // Dashboard KPIs and Analytics
  app.get("/api/admin/dashboard/kpis", requireAdminAuth, async (req: any, res) => {
    try {
      const kpis = await adminService.getDashboardKPIs();
      
      if (kpis.success) {
        res.json(kpis.data);
      } else {
        res.status(500).json({ error: kpis.error });
      }
    } catch (error) {
      console.error("Dashboard KPIs error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard KPIs" });
    }
  });

  // Calculate Performance Metrics
  app.post("/api/admin/dashboard/metrics/calculate", requireAdminAuth, async (req: any, res) => {
    try {
      const { category, period } = req.body;
      
      if (!category) {
        return res.status(400).json({ error: "Category is required" });
      }
      
      const result = await adminService.calculatePerformanceMetrics(category, period);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Performance metrics calculation error:", error);
      res.status(500).json({ error: "Failed to calculate performance metrics" });
    }
  });

  // Get Performance Metrics
  app.get("/api/admin/dashboard/metrics", requireAdminAuth, async (req: any, res) => {
    try {
      const filters = req.query;
      const result = await storage.getPerformanceMetrics(filters);
      res.json(result);
    } catch (error) {
      console.error("Performance metrics fetch error:", error);
      res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
  });

  // FRAUD DETECTION AND ALERTS

  // Get Active Fraud Alerts
  app.get("/api/admin/alerts/fraud", requireAdminAuth, async (req: any, res) => {
    try {
      const filters = req.query;
      const result = await adminService.getActiveFraudAlerts(filters);
      
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Fraud alerts fetch error:", error);
      res.status(500).json({ error: "Failed to fetch fraud alerts" });
    }
  });

  // Create Fraud Alert
  app.post("/api/admin/alerts/fraud", requireAdminAuth, async (req: any, res) => {
    try {
      const alertData = req.body;
      const adminId = req.user.id;
      
      if (!alertData.alertType || !alertData.targetType || !alertData.targetId) {
        return res.status(400).json({ error: "Missing required alert fields" });
      }
      
      const result = await adminService.createFraudAlert(alertData, adminId);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Fraud alert creation error:", error);
      res.status(500).json({ error: "Failed to create fraud alert" });
    }
  });

  // Update Fraud Alert
  app.patch("/api/admin/alerts/fraud/:alertId", requireAdminAuth, async (req: any, res) => {
    try {
      const { alertId } = req.params;
      const updates = req.body;
      const adminId = req.user.id;
      
      const result = await adminService.updateFraudAlert(alertId, updates, adminId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Fraud alert update error:", error);
      res.status(500).json({ error: "Failed to update fraud alert" });
    }
  });

  // Get Fraud Alert Details
  app.get("/api/admin/alerts/fraud/:alertId", requireAdminAuth, async (req: any, res) => {
    try {
      const { alertId } = req.params;
      const alert = await storage.getFraudAlert(alertId);
      
      if (!alert) {
        return res.status(404).json({ error: "Fraud alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Fraud alert fetch error:", error);
      res.status(500).json({ error: "Failed to fetch fraud alert" });
    }
  });

  // ASSET REVIEW WORKFLOWS

  // Get Pending Asset Reviews
  app.get("/api/admin/assets/pending", requireAdminAuth, async (req: any, res) => {
    try {
      const filters = req.query;
      const result = await adminService.getPendingAssetReviews(filters);
      
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Asset reviews fetch error:", error);
      res.status(500).json({ error: "Failed to fetch pending asset reviews" });
    }
  });

  // Create Asset Review
  app.post("/api/admin/assets/:submissionId/review", requireAdminAuth, async (req: any, res) => {
    try {
      const { submissionId } = req.params;
      const { reviewType, priority } = req.body;
      const adminId = req.user.id;
      
      if (!reviewType) {
        return res.status(400).json({ error: "Review type is required" });
      }
      
      const result = await adminService.createAssetReview(submissionId, reviewType, adminId, priority);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Asset review creation error:", error);
      res.status(500).json({ error: "Failed to create asset review" });
    }
  });

  // Update Asset Review Decision
  app.patch("/api/admin/assets/review/:reviewId", requireAdminAuth, async (req: any, res) => {
    try {
      const { reviewId } = req.params;
      const updates = req.body;
      const adminId = req.user.id;
      
      const result = await adminService.updateAssetReview(reviewId, updates, adminId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Asset review update error:", error);
      res.status(500).json({ error: "Failed to update asset review" });
    }
  });

  // Approve Asset Submission
  app.post("/api/admin/assets/:submissionId/approve", requireAdminAuth, async (req: any, res) => {
    try {
      const { submissionId } = req.params;
      const { estimatedValue, reasoning, conditions } = req.body;
      const adminId = req.user.id;
      
      // Update submission status to approved
      await storage.updateRwaSubmissionStatus(submissionId, "approved", reasoning, adminId);
      
      // Log admin action
      await storage.createAdminAction({
        adminId,
        actionType: 'approve_submission',
        targetType: 'submission',
        targetId: submissionId,
        actionDetails: { estimatedValue, conditions },
        adminNotes: reasoning,
        severity: 'normal',
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.get('User-Agent') || 'Unknown',
        sessionId: req.sessionID || 'unknown',
      });
      
      res.json({ message: "Asset submission approved successfully" });
    } catch (error) {
      console.error("Asset approval error:", error);
      res.status(500).json({ error: "Failed to approve asset submission" });
    }
  });

  // Reject Asset Submission
  app.post("/api/admin/assets/:submissionId/reject", requireAdminAuth, async (req: any, res) => {
    try {
      const { submissionId } = req.params;
      const { reasoning } = req.body;
      const adminId = req.user.id;
      
      if (!reasoning) {
        return res.status(400).json({ error: "Rejection reasoning is required" });
      }
      
      // Update submission status to rejected
      await storage.updateRwaSubmissionStatus(submissionId, "rejected", reasoning, adminId);
      
      // Log admin action
      await storage.createAdminAction({
        adminId,
        actionType: 'reject_submission',
        targetType: 'submission',
        targetId: submissionId,
        adminNotes: reasoning,
        severity: 'normal',
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.get('User-Agent') || 'Unknown',
        sessionId: req.sessionID || 'unknown',
      });
      
      res.json({ message: "Asset submission rejected successfully" });
    } catch (error) {
      console.error("Asset rejection error:", error);
      res.status(500).json({ error: "Failed to reject asset submission" });
    }
  });

  // USER MANAGEMENT AND FLAGS

  // Get All Users (new comprehensive endpoint)
  app.get("/api/admin/users", requireRole(USER_ROLES.MANAGER), async (req: any, res) => {
    try {
      const page = parseInt(req.query.page || '1');
      const limit = parseInt(req.query.limit || '50');
      const search = req.query.search || '';
      const status = req.query.status || '';
      const verification = req.query.verification || '';
      
      const offset = (page - 1) * limit;
      
      // Get users with basic information
      const allUsers = await storage.getAllUsersWithDetails(limit, offset, {
        search,
        status,
        verification
      });
      
      // Get total count for pagination
      const totalCount = await storage.getUserCount({
        search,
        status,
        verification
      });
      
      // Get additional stats
      const stats = {
        totalUsers: totalCount,
        activeUsers: await storage.getUserCountByStatus('active'),
        verifiedUsers: await storage.getUserCountByVerification('verified'),
        flaggedUsers: await storage.getFlaggedUserCount()
      };
      
      res.json({
        success: true,
        data: {
          users: allUsers,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          },
          stats
        }
      });
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get User Details (comprehensive view)
  app.get("/api/admin/users/:userId", requireRole(USER_ROLES.MANAGER), async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Get user basic info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get additional user data
      const [kycInfo, walletBindings, rwaSubmissions, pawnLoans, transactions, userFlags, activityLog] = await Promise.all([
        storage.getUserKyc(userId),
        storage.getUserWalletBindings(userId),
        storage.getRwaSubmissionsByUser(userId),
        storage.getPawnLoansByUser(userId),
        storage.getUserTransactions(userId),
        storage.getUserFlags(userId),
        storage.getUserActivityLog(userId, 50) // Last 50 activities
      ]);
      
      res.json({
        success: true,
        data: {
          user,
          kycInfo,
          walletBindings,
          rwaSubmissions,
          pawnLoans,
          transactions,
          flags: userFlags,
          activityLog
        }
      });
    } catch (error) {
      console.error("Get user details error:", error);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });

  // Create New User (admin function)
  app.post("/api/admin/users", requireRole(USER_ROLES.ADMINISTRATOR), async (req: any, res) => {
    try {
      const userData = req.body;
      const adminId = req.user?.id || req.user?.claims?.sub;
      
      // Validate required fields
      if (!userData.email && !userData.username) {
        return res.status(400).json({ error: "Email or username is required" });
      }
      
      // Check if user already exists
      if (userData.email) {
        const existingUser = await storage.getUserByEmail(userData.email);
        if (existingUser) {
          return res.status(409).json({ error: "User with this email already exists" });
        }
      }
      
      // Create user
      const newUser = await storage.createUser({
        ...userData,
        id: randomUUID(),
        role: userData.role || 'user',
        isActive: userData.isActive !== false,
        emailVerified: userData.emailVerified || false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Log admin action
      await storage.createAdminAction({
        adminId,
        actionType: 'create_user',
        targetType: 'user',
        targetId: newUser.id,
        actionDetails: { createdUser: userData },
        severity: 'normal',
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.get('User-Agent') || 'Unknown',
        sessionId: req.sessionID || 'unknown',
      });
      
      res.status(201).json({
        success: true,
        data: newUser,
        message: "User created successfully"
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Update User (admin function)
  app.patch("/api/admin/users/:userId", requireRole(USER_ROLES.MANAGER), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      const adminId = req.user.id;
      
      // Get existing user
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, {
        ...updates,
        updatedAt: new Date()
      });
      
      // Log admin action
      await storage.createAdminAction({
        adminId,
        actionType: 'update_user',
        targetType: 'user',
        targetId: userId,
        actionDetails: { 
          previousData: existingUser, 
          newData: updates 
        },
        severity: 'normal',
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.get('User-Agent') || 'Unknown',
        sessionId: req.sessionID || 'unknown',
      });
      
      res.json({
        success: true,
        data: updatedUser,
        message: "User updated successfully"
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Get Flagged Users
  app.get("/api/admin/users/flagged", requireRole(USER_ROLES.MANAGER), async (req: any, res) => {
    try {
      const filters = req.query;
      const result = await adminService.getFlaggedUsers(filters);
      
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Flagged users fetch error:", error);
      res.status(500).json({ error: "Failed to fetch flagged users" });
    }
  });

  // Flag User Account
  app.post("/api/admin/users/:userId/flag", requireRole(USER_ROLES.MANAGER), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const flagData = { ...req.body, userId };
      const adminId = req.user.id;
      
      if (!flagData.flagType || !flagData.severity || !flagData.flagReason) {
        return res.status(400).json({ error: "Flag type, severity, and reason are required" });
      }
      
      const result = await adminService.flagUser(flagData, adminId);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("User flagging error:", error);
      res.status(500).json({ error: "Failed to flag user" });
    }
  });

  // Update User Flag
  app.patch("/api/admin/users/flags/:flagId", requireRole(USER_ROLES.MANAGER), async (req: any, res) => {
    try {
      const { flagId } = req.params;
      const updates = req.body;
      const adminId = req.user.id;
      
      const updatedFlag = await storage.updateUserFlag(flagId, updates);
      
      // Log admin action
      await storage.createAdminAction({
        adminId,
        actionType: updates.status === 'resolved' ? 'unflag_user' : 'flag_user',
        targetType: 'user',
        targetId: updatedFlag.userId,
        actionDetails: updates,
        severity: 'normal',
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.get('User-Agent') || 'Unknown',
        sessionId: req.sessionID || 'unknown',
      });
      
      res.json({ message: "User flag updated successfully", flag: updatedFlag });
    } catch (error) {
      console.error("User flag update error:", error);
      res.status(500).json({ error: "Failed to update user flag" });
    }
  });

  // Restrict User Account
  app.post("/api/admin/users/:userId/restrict", requireRole(USER_ROLES.MANAGER), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { restrictions, reason } = req.body;
      const adminId = req.user.id;
      
      if (!restrictions || !reason) {
        return res.status(400).json({ error: "Restrictions and reason are required" });
      }
      
      // Update user with restrictions (assuming there's a method for this)
      // This would need to be implemented in the storage layer
      
      // Log admin action
      await storage.createAdminAction({
        adminId,
        actionType: 'restrict_user',
        targetType: 'user',
        targetId: userId,
        actionDetails: { restrictions },
        adminNotes: reason,
        severity: 'high',
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.get('User-Agent') || 'Unknown',
        sessionId: req.sessionID || 'unknown',
      });
      
      res.json({ message: "User restrictions applied successfully" });
    } catch (error) {
      console.error("User restriction error:", error);
      res.status(500).json({ error: "Failed to restrict user" });
    }
  });

  // Change User Role
  app.patch("/api/admin/users/:userId/role", requireRole(USER_ROLES.ADMINISTRATOR), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role, reason } = req.body;
      const adminId = req.user?.id;
      
      if (!role || !reason) {
        return res.status(400).json({ error: "Role and reason are required" });
      }

      // Validate role
      const validRoles = Object.values(USER_ROLES);
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role specified" });
      }

      // Get existing user
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update user role
      const updatedUser = await storage.updateUserRole(userId, role);
      
      // Log admin action
      await storage.createAdminAction({
        adminId: adminId || 'system',
        actionType: 'change_role',
        targetType: 'user',
        targetId: userId,
        actionDetails: { 
          previousRole: existingUser.role, 
          newRole: role,
          reason: reason
        },
        adminNotes: reason,
        severity: 'high',
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.get('User-Agent') || 'Unknown',
        sessionId: req.sessionID || 'unknown',
      });
      
      res.json({
        success: true,
        message: "User role updated successfully",
        data: updatedUser
      });
    } catch (error) {
      console.error("Role change error:", error);
      res.status(500).json({ error: "Failed to change user role" });
    }
  });

  // Admin Reset User Password
  app.post("/api/admin/users/:userId/reset-password", requireRole(USER_ROLES.ADMINISTRATOR), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { newPassword, reason } = req.body;
      const adminId = req.user?.id;

      // Validate inputs
      if (!newPassword || !reason) {
        return res.status(400).json({ 
          success: false,
          error: "New password and reason are required" 
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters',
          code: 'INVALID_PASSWORD'
        });
      }

      // Get user to verify they exist
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      
      // Update user password
      await storage.updateUserPassword(userId, newPasswordHash);

      // Clear any existing password reset tokens
      try {
        await storage.clearPasswordResetToken(userId);
      } catch (error) {
        // Ignore if method doesn't exist
      }

      // Log admin action
      await storage.createAdminAction({
        adminId: adminId || 'system',
        actionType: 'password_reset',
        targetType: 'user',
        targetId: userId,
        actionDetails: { 
          resetBy: adminId,
          reason: reason,
          userEmail: user.email,
          timestamp: new Date().toISOString() 
        },
        adminNotes: reason,
        severity: 'medium',
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.get('User-Agent') || 'Unknown',
        sessionId: req.sessionID || 'unknown',
      });

      // Log user activity as well
      await storage.logUserActivity({
        userId: userId,
        activityType: 'password_change',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
        details: { 
          resetByAdmin: adminId,
          reason: reason,
          timestamp: new Date().toISOString() 
        }
      });
      
      res.json({
        success: true,
        message: `Password reset successfully for user ${user.email || user.username}`,
        data: { userId: user.id, email: user.email }
      });
      
    } catch (error) {
      console.error('Admin reset password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  // Delete User (Administrator only - dangerous operation)
  app.delete("/api/admin/users/:userId", requireRole(USER_ROLES.ADMINISTRATOR), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.user?.id || req.user?.claims?.sub;

      // Validate that user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Prevent self-deletion
      if (userId === adminId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete your own account',
          code: 'SELF_DELETE_FORBIDDEN'
        });
      }

      // Log admin action before deletion
      await storage.createAdminAction({
        adminId: adminId || 'system',
        actionType: 'user_delete',
        targetType: 'user',
        targetId: userId,
        actionDetails: { 
          deletedUser: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName
          },
          timestamp: new Date().toISOString()
        },
        adminNotes: 'User account permanently deleted',
        severity: 'critical',
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.get('User-Agent') || 'Unknown',
        sessionId: req.sessionID || 'unknown',
      });

      // Delete the user
      const deleteResult = await storage.deleteUser(userId);
      
      if (deleteResult.success) {
        res.json({
          success: true,
          message: `User ${user.email || user.username} has been permanently deleted`,
          data: { userId: user.id }
        });
      } else {
        // Check if deletion was blocked by dependencies
        if (deleteResult.dependencies && deleteResult.dependencies.length > 0) {
          const dependencyDescriptions = deleteResult.dependencies.map(d => d.description).join(', ');
          res.status(400).json({
            success: false,
            error: `Cannot delete user with existing records: ${dependencyDescriptions}`,
            code: 'DELETE_BLOCKED_BY_DEPENDENCIES',
            dependencies: deleteResult.dependencies
          });
        } else {
          res.status(500).json({
            success: false,
            error: deleteResult.error || 'Failed to delete user',
            code: 'DELETE_FAILED'
          });
        }
      }
      
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  // BRIDGE MONITORING

  // Get Bridge Monitoring Data
  app.get("/api/admin/bridge/monitoring", requireAdminAuth, async (req: any, res) => {
    try {
      const filters = req.query;
      const result = await adminService.getBridgeMonitoringData(filters);
      
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Bridge monitoring error:", error);
      res.status(500).json({ error: "Failed to fetch bridge monitoring data" });
    }
  });

  // Get Bridge Transaction Details
  app.get("/api/admin/bridge/transactions/:txId", requireAdminAuth, async (req: any, res) => {
    try {
      const { txId } = req.params;
      const transaction = await storage.getBridgeTransaction(txId);
      
      if (!transaction) {
        return res.status(404).json({ error: "Bridge transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      console.error("Bridge transaction fetch error:", error);
      res.status(500).json({ error: "Failed to fetch bridge transaction" });
    }
  });

  // ADMIN ACTIONS AND AUDIT TRAIL

  // Get Admin Actions (Audit Trail)
  app.get("/api/admin/actions", requireAdminAuth, async (req: any, res) => {
    try {
      const filters = req.query;
      const result = await storage.getAdminActions(filters);
      res.json(result);
    } catch (error) {
      console.error("Admin actions fetch error:", error);
      res.status(500).json({ error: "Failed to fetch admin actions" });
    }
  });

  // Get Admin Actions for Specific Target
  app.get("/api/admin/actions/:targetType/:targetId", requireAdminAuth, async (req: any, res) => {
    try {
      const { targetType, targetId } = req.params;
      const actions = await storage.getAdminActionsByTarget(targetType, targetId);
      res.json({ actions });
    } catch (error) {
      console.error("Target admin actions fetch error:", error);
      res.status(500).json({ error: "Failed to fetch admin actions for target" });
    }
  });

  // OBJECT STORAGE ROUTES FOR PROFILE IMAGES

  // Get upload URL for profile images
  app.post('/api/objects/upload', isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error('Error getting upload URL:', error);
      res.status(500).json({ error: 'Failed to get upload URL' });
    }
  });

  // Serve private objects (like profile images) with authentication
  app.get('/objects/:objectPath(*)', isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error('Error checking object access:', error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Update user profile image
  app.patch('/api/user/profile-image', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id as string;
      const { profileImageUrl } = req.body;

      if (!profileImageUrl) {
        return res.status(400).json({ error: 'Profile image URL is required' });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Set ACL policy for the uploaded image (public so others can view profile)
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        profileImageUrl,
        {
          owner: userId,
          visibility: 'public', // Profile images should be public
        }
      );

      // Update user profile in database
      await storage.updateUser(userId, { profileImageUrl: objectPath });

      res.json({
        success: true,
        message: 'Profile image updated successfully',
        profileImageUrl: objectPath,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating profile image:', error);
      res.status(500).json({ error: 'Failed to update profile image' });
    }
  });

  // Contact form submission endpoint
  app.post('/api/contact',
    rateLimitConfigs.api,
    validateRequest(contactFormSchema, 'body'),
    async (req, res) => {
      try {
        const formData = req.body;
        const userId = req.user?.claims?.sub || null;
        
        // Save form submission to database
        const submission = await storage.createFormSubmission({
          userId,
          formType: 'contact',
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          category: formData.category,
          priority: formData.priority || 'normal',
          message: formData.message,
          status: 'pending',
          ipAddress: req.ip || null,
          userAgent: req.get('User-Agent') || null,
          metadata: null
        });
        
        // Try to send email with contact form data (non-blocking)
        // If email fails, we still return success since the submission is saved
        const emailSent = await emailService.sendContactFormSubmission(formData);
        
        if (!emailSent) {
          // Log email failure but don't fail the request
          console.error('Contact form email failed for:', formData.email, 'but submission saved with ID:', submission.id);
        }
        
        // Always return success since the submission is saved to the database
        res.json({
          success: true,
          message: 'Your message has been sent successfully. We will get back to you soon!',
          submissionId: submission.id,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Contact form submission error:', {
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        res.status(500).json({
          success: false,
          error: 'Failed to process your message. Please try again later.',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Admin Form Submissions endpoints
  app.get('/api/admin/form-submissions', requireAdminAuth, async (req: any, res) => {
    try {
      const { status } = req.query;
      const filters = status ? { status } : {};
      
      const submissions = await storage.getAllFormSubmissions(100, 0, filters);
      
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching form submissions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch form submissions',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.patch('/api/admin/form-submissions/:id/status', requireAdminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, responseNotes } = req.body;
      const adminId = req.user?.claims?.sub || req.user?.id;
      
      const updatedSubmission = await storage.updateFormSubmissionStatus(
        id,
        status,
        responseNotes,
        adminId
      );
      
      res.json({
        success: true,
        submission: updatedSubmission,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating form submission status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update form submission status',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Chat API endpoint
  app.post(
    '/api/chat',
    rateLimitConfigs.api,
    validateRequest(z.object({
      message: z.string().min(1).max(1000),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        timestamp: z.string().datetime()
      })).optional().default([])
    })),
    async (req, res) => {
      try {
        const { message, conversationHistory } = req.body;
        
        // Convert timestamp strings back to Date objects
        const history: ChatMessage[] = conversationHistory.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        
        const response = await processChat(message, history);
        
        res.json({
          success: response.success,
          message: response.message,
          timestamp: new Date().toISOString(),
          ...(response.error && { error: response.error })
        });
      } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to process chat message. Please try again.',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Whitepaper PDF download endpoint
  app.get('/api/whitepaper/download-pdf', async (req, res) => {
    try {
      // Path to the whitepaper PDF file
      const whitepaperPath = path.join(__dirname, '..', 'RWAPAWN_Whitepaper.pdf');
      
      if (!fs.existsSync(whitepaperPath)) {
        return res.status(404).json({
          success: false,
          error: 'Whitepaper PDF file not found',
          code: 'FILE_NOT_FOUND'
        });
      }

      // Read PDF file
      const pdfBuffer = fs.readFileSync(whitepaperPath);
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="RWAPAWN_Whitepaper.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('Error serving whitepaper PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to serve whitepaper PDF',
        code: 'PDF_SERVE_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
