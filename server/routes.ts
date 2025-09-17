import type { Express } from "express";
import { createServer, type Server } from "http";
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
  paymentIntentSchema
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

  // Bridge routes
  app.post("/api/bridge/transfer", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub as string; // Derive userId from authenticated user
      const bridgeData = insertBridgeTransactionSchema.parse({
        ...req.body,
        userId // Override any client-provided userId
      });
      const bridge = await storage.createBridgeTransaction(bridgeData);
      
      // Simulate bridge processing
      setTimeout(async () => {
        await storage.updateBridgeTransactionStatus(
          bridge.id,
          "completed",
          `icp_${randomUUID()}`
        );
      }, 5000);
      
      res.json(bridge);
    } catch (error) {
      console.error("Error creating bridge transfer:", error);
      res.status(400).json({ error: "Invalid bridge data" });
    }
  });

  app.get("/api/bridge/user/:userId", isAuthenticated, checkOwnership, async (req, res) => {
    try {
      const bridges = await storage.getBridgeTransactionsByUser(req.params.userId);
      res.json(bridges);
    } catch (error) {
      console.error("Error fetching bridge transactions:", error);
      res.status(500).json({ error: "Failed to fetch bridge transactions" });
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

  const httpServer = createServer(app);
  return httpServer;
}
