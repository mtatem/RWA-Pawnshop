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
  insertUserSchema
} from "@shared/schema";
import { randomUUID } from "crypto";

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
      const existingUser = await storage.getUserByWallet(userData.walletAddress);
      
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

  // RWA Submission routes
  app.post("/api/rwa-submissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub; // Derive userId from authenticated user
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
        txHash: `icp_${randomUUID()}`,
        status: "confirmed",
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
          txHash: `icp_${randomUUID()}`,
          status: "confirmed",
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
      const userId = req.user.claims.sub;
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
        txHash: `icp_${randomUUID()}`,
        status: "confirmed",
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
      const bidderId = req.user.claims.sub; // Derive bidderId from authenticated user
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
        txHash: `icp_${randomUUID()}`,
        status: "confirmed",
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
      const userId = req.user.claims.sub; // Derive userId from authenticated user
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
