import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from 'express-rate-limit';
import multer from 'multer';
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
  paymentIntentSchema,
  assetPricingCache,
  bridgeEstimationSchema,
  bridgeInitiationSchema,
  bridgeHistoryFilterSchema,
  insertDocumentSchema,
  documentUploadSchema,
  documentAnalysisRequestSchema
} from "@shared/schema";
import { randomUUID } from "crypto";

// System wallet configuration - CRITICAL: These are AccountIdentifiers, not Principals
const SYSTEM_ICP_ACCOUNT_ID = "1ef008c2d7e445954e12ec2033b202888723046fde489be3a250cacf01d65963";
const SYSTEM_ETH_ADDRESS = "0x00f3C42833C3170159af4E92dbb451Fb3F708917";

// Helper function to validate ICP AccountIdentifier format (64 hex chars)
const isValidAccountId = (accountId: string): boolean => {
  return /^[0-9a-fA-F]{64}$/.test(accountId);
};
import { CryptoVerificationService } from "./crypto-utils";
import { ICPLedgerService } from "./icp-ledger-service";
import { pricingService } from "./services/pricing-service";
import { chainFusionBridge } from "./services/chain-fusion-bridge";
import documentAnalysisService from "./services/document-analysis";
import { adminService } from "./services/admin-service";
import { pricingQuerySchema } from "@shared/schema";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";

// In-memory storage for wallet binding nonces (in production, use Redis)
const bindingNonces = new Map<string, { nonce: string; userId: string; expires: number; walletType: string; challenge: string }>();

// Track successful bindings to prevent replay attacks (in production, use Redis with TTL)
const successfulBindings = new Map<string, { userId: string; principalId: string; timestamp: number }>();

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
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(req.user.claims.sub);
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
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = req.params.userId || req.body.userId;
    if (req.user.claims.sub !== userId) {
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
  // Auth middleware setup
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByWallet(userData.walletAddress!);
      
      if (existingUser) {
        return res.json(existingUser);
      }
      
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.get("/api/users/wallet/:address", async (req, res) => {
    try {
      const user = await storage.getUserByWallet(req.params.address);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user by wallet:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      
      // Check if user is updating their own profile
      if (req.user.claims.sub !== userId) {
        return res.status(403).json({ error: "Access denied - not owner" });
      }

      // Use Zod validation for secure input handling
      const updateData = userUpdateSchema.parse(req.body);
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      // SECURITY: Block principalId updates - require wallet binding verification
      if (updateData.principalId) {
        return res.status(403).json({ 
          error: "Direct principalId updates not allowed. Use /api/wallet/verify-binding endpoint." 
        });
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Secure Wallet Binding endpoints
  app.post("/api/wallet/bind-intent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Payment Intents endpoint - generates secure payment intents
  app.post("/api/payment-intents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type, amount, metadata } = paymentIntentSchema.parse(req.body);
      
      // CRITICAL: Use AccountIdentifier for ICP payments (not Principal)
      const systemAccountId = SYSTEM_ICP_ACCOUNT_ID;
      
      // Validate system account ID format
      if (!isValidAccountId(systemAccountId)) {
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
      const userId = req.user.claims.sub;
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

  // RWA Submission routes
  app.post("/api/rwa-submissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub as string; // Derive userId from authenticated user
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

  app.get("/api/rwa-submissions/pending", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const submissions = await storage.getPendingRwaSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching pending submissions:", error);
      res.status(500).json({ error: "Failed to fetch pending submissions" });
    }
  });

  app.patch("/api/rwa-submissions/:id/status", isAuthenticated, isAdmin, async (req, res) => {
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
      
      // If approved, create a pawn loan
      if (status === "approved") {
        const loanAmount = (parseFloat(submission.estimatedValue) * 0.7).toFixed(2);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90);
        
        const loan = await storage.createPawnLoan({
          submissionId: submission.id,
          userId: submission.userId,
          loanAmount,
          assetValue: submission.estimatedValue,
          feeAmount: "2.00",
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
      const userId = req.user.claims.sub as string;
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

  app.post("/api/marketplace/assets", isAuthenticated, isAdmin, async (req, res) => {
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
      const bidderId = req.user.claims.sub as string; // Derive bidderId from authenticated user
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
      const userId = req.user.claims.sub as string;
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
      const userId = req.user?.claims?.sub;
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
      const userId = req.user.claims.sub as string;
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
      const userId = req.user.claims.sub as string;
      
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
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req, res) => {
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
  app.post("/api/admin/process-expired-loans", isAuthenticated, isAdmin, async (req, res) => {
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
          timestamp: cachedPricing.lastUpdated.toISOString(),
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
            timestamp: cachedPricing.lastUpdated.toISOString(),
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
      
      if (error.message.includes("required") || error.message.includes("Invalid")) {
        return res.status(400).json({ 
          error: "Invalid pricing query parameters",
          details: error.message 
        });
      }
      
      res.status(500).json({ 
        error: "Unable to fetch pricing estimate",
        details: error.message 
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
          timestamp: cachedPricing.lastUpdated.toISOString(),
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
          symbol: query.symbol || null,
          itemType: query.itemType || null,
          specifications: query.specifications || null,
          estimatedValue: pricing.median.toString(),
          confidence: pricing.confidence.toString(),
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
            timestamp: cachedPricing.lastUpdated.toISOString(),
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
      
      if (error.message.includes("required") || error.message.includes("Invalid")) {
        return res.status(400).json({ 
          error: "Invalid pricing query in request body",
          details: error.message 
        });
      }
      
      res.status(500).json({ 
        error: "Unable to fetch pricing estimate",
        details: error.message 
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
              error: error.message,
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
        details: error.message 
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
  app.delete("/api/pricing/cache", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.get("/api/pricing/stats", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.delete("/api/pricing/cache/:category", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { category } = req.params;
      const { symbol, itemType } = req.query;
      
      // Clear from database cache
      let query = db.delete(assetPricingCache).where(eq(assetPricingCache.category, category));
      
      if (symbol) {
        query = query.where(eq(assetPricingCache.symbol, symbol));
      }
      if (itemType) {
        query = query.where(eq(assetPricingCache.itemType, itemType));
      }
      
      await query;
      
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
  app.post("/api/pricing/circuit-breaker/reset", isAuthenticated, isAdmin, async (req: any, res) => {
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
      const userId = req.user.claims.sub;
      
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
      if (error.message?.includes('Unsupported file type')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: "Document upload failed. Please try again." });
    }
  });
  
  // Get document analysis results
  app.get("/api/documents/:id/analysis", isAuthenticated, async (req: any, res) => {
    try {
      const documentId = req.params.id;
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
      
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
  app.get("/api/admin/documents/queue", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const queue = await documentAnalysisService.getAnalysisQueue();
      
      res.json({
        queue,
        totalPending: queue.filter(item => item.status === 'pending').length,
        totalProcessing: queue.filter(item => item.status === 'processing').length,
        totalFailed: queue.filter(item => item.status === 'failed').length
      });
    } catch (error) {
      console.error("Analysis queue retrieval error:", error);
      res.status(500).json({ error: "Failed to get analysis queue" });
    }
  });
  
  // Process queued document (admin trigger)
  app.post("/api/admin/documents/queue/:queueId/process", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.post("/api/admin/documents/batch-analyze", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.get("/api/admin/documents/stats", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Get document analysis statistics from database
      const stats = await db.select({
        total_documents: sql<number>`count(*)::int`,
        pending_analysis: sql<number>`count(case when analysis_status = 'pending' then 1 end)::int`,
        processing_analysis: sql<number>`count(case when analysis_status = 'processing' then 1 end)::int`,
        completed_analysis: sql<number>`count(case when analysis_status = 'completed' then 1 end)::int`,
        failed_analysis: sql<number>`count(case when analysis_status = 'failed' then 1 end)::int`,
        avg_processing_time: sql<number>`avg(case when analysis_status = 'completed' then extract(epoch from (updated_at - created_at)) end)::int`
      }).from(db.documents);
      
      // Get fraud detection statistics
      const fraudStats = await db.select({
        total_analyzed: sql<number>`count(*)::int`,
        high_risk: sql<number>`count(case when risk_level = 'high' then 1 end)::int`,
        critical_risk: sql<number>`count(case when risk_level = 'critical' then 1 end)::int`,
        requires_review: sql<number>`count(case when requires_manual_review = true then 1 end)::int`,
        avg_fraud_score: sql<number>`avg(overall_fraud_score)::numeric`
      }).from(db.fraudDetectionResults);
      
      res.json({
        documents: stats[0] || {},
        fraud_detection: fraudStats[0] || {},
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Analysis stats error:", error);
      res.status(500).json({ error: "Failed to get analysis statistics" });
    }
  });

  // ENHANCED ADMIN DASHBOARD API ENDPOINTS

  // Dashboard KPIs and Analytics
  app.get("/api/admin/dashboard/kpis", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.post("/api/admin/dashboard/metrics/calculate", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.get("/api/admin/dashboard/metrics", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.get("/api/admin/alerts/fraud", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.post("/api/admin/alerts/fraud", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const alertData = req.body;
      const adminId = req.user.claims.sub;
      
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
  app.patch("/api/admin/alerts/fraud/:alertId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { alertId } = req.params;
      const updates = req.body;
      const adminId = req.user.claims.sub;
      
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
  app.get("/api/admin/alerts/fraud/:alertId", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.get("/api/admin/assets/pending", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.post("/api/admin/assets/:submissionId/review", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { submissionId } = req.params;
      const { reviewType, priority } = req.body;
      const adminId = req.user.claims.sub;
      
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
  app.patch("/api/admin/assets/review/:reviewId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { reviewId } = req.params;
      const updates = req.body;
      const adminId = req.user.claims.sub;
      
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
  app.post("/api/admin/assets/:submissionId/approve", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { submissionId } = req.params;
      const { estimatedValue, reasoning, conditions } = req.body;
      const adminId = req.user.claims.sub;
      
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
  app.post("/api/admin/assets/:submissionId/reject", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { submissionId } = req.params;
      const { reasoning } = req.body;
      const adminId = req.user.claims.sub;
      
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

  // Get Flagged Users
  app.get("/api/admin/users/flagged", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.post("/api/admin/users/:userId/flag", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const flagData = { ...req.body, userId };
      const adminId = req.user.claims.sub;
      
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
  app.patch("/api/admin/users/flags/:flagId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { flagId } = req.params;
      const updates = req.body;
      const adminId = req.user.claims.sub;
      
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
  app.post("/api/admin/users/:userId/restrict", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { restrictions, reason } = req.body;
      const adminId = req.user.claims.sub;
      
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

  // BRIDGE MONITORING

  // Get Bridge Monitoring Data
  app.get("/api/admin/bridge/monitoring", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.get("/api/admin/bridge/transactions/:txId", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.get("/api/admin/actions", isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.get("/api/admin/actions/:targetType/:targetId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { targetType, targetId } = req.params;
      const actions = await storage.getAdminActionsByTarget(targetType, targetId);
      res.json({ actions });
    } catch (error) {
      console.error("Target admin actions fetch error:", error);
      res.status(500).json({ error: "Failed to fetch admin actions for target" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
