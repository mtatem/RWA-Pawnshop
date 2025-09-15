import {
  users,
  rwaSubmissions,
  pawnLoans,
  marketplaceAssets,
  bids,
  transactions,
  bridgeTransactions,
  type User,
  type InsertUser,
  type RwaSubmission,
  type InsertRwaSubmission,
  type PawnLoan,
  type InsertPawnLoan,
  type MarketplaceAsset,
  type InsertMarketplaceAsset,
  type Bid,
  type InsertBid,
  type Transaction,
  type InsertTransaction,
  type BridgeTransaction,
  type InsertBridgeTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lt, gte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: any): Promise<User>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;

  // RWA Submission operations
  createRwaSubmission(submission: InsertRwaSubmission): Promise<RwaSubmission>;
  getRwaSubmission(id: string): Promise<RwaSubmission | undefined>;
  getRwaSubmissionsByUser(userId: string): Promise<RwaSubmission[]>;
  getPendingRwaSubmissions(): Promise<RwaSubmission[]>;
  updateRwaSubmissionStatus(id: string, status: string, adminNotes?: string, reviewedBy?: string): Promise<RwaSubmission>;

  // Pawn Loan operations
  createPawnLoan(loan: InsertPawnLoan): Promise<PawnLoan>;
  getPawnLoan(id: string): Promise<PawnLoan | undefined>;
  getPawnLoansByUser(userId: string): Promise<PawnLoan[]>;
  getActivePawnLoans(): Promise<PawnLoan[]>;
  getExpiringPawnLoans(days: number): Promise<PawnLoan[]>;
  updatePawnLoanStatus(id: string, status: string): Promise<PawnLoan>;

  // Marketplace operations
  createMarketplaceAsset(asset: InsertMarketplaceAsset): Promise<MarketplaceAsset>;
  getMarketplaceAssets(): Promise<MarketplaceAsset[]>;
  getMarketplaceAsset(id: string): Promise<MarketplaceAsset | undefined>;
  updateMarketplaceAsset(id: string, updates: Partial<InsertMarketplaceAsset>): Promise<MarketplaceAsset>;

  // Bid operations
  createBid(bid: InsertBid): Promise<Bid>;
  getBidsByAsset(assetId: string): Promise<Bid[]>;
  getHighestBid(assetId: string): Promise<Bid | undefined>;

  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUser(userId: string): Promise<Transaction[]>;
  updateTransactionStatus(id: string, status: string, txHash?: string): Promise<Transaction>;

  // Bridge operations
  createBridgeTransaction(bridge: InsertBridgeTransaction): Promise<BridgeTransaction>;
  getBridgeTransactionsByUser(userId: string): Promise<BridgeTransaction[]>;
  updateBridgeTransactionStatus(id: string, status: string, destinationTxHash?: string): Promise<BridgeTransaction>;

  // Admin statistics
  getAdminStats(): Promise<{
    pendingApprovals: number;
    activeLoans: number;
    expiringSoon: number;
    totalRevenue: string;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async upsertUser(userData: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // RWA Submission operations
  async createRwaSubmission(submission: InsertRwaSubmission): Promise<RwaSubmission> {
    const [rwaSubmission] = await db.insert(rwaSubmissions).values(submission).returning();
    return rwaSubmission;
  }

  async getRwaSubmission(id: string): Promise<RwaSubmission | undefined> {
    const [submission] = await db.select().from(rwaSubmissions).where(eq(rwaSubmissions.id, id));
    return submission || undefined;
  }

  async getRwaSubmissionsByUser(userId: string): Promise<RwaSubmission[]> {
    return await db.select().from(rwaSubmissions).where(eq(rwaSubmissions.userId, userId)).orderBy(desc(rwaSubmissions.createdAt));
  }

  async getPendingRwaSubmissions(): Promise<RwaSubmission[]> {
    return await db.select().from(rwaSubmissions).where(eq(rwaSubmissions.status, "pending")).orderBy(desc(rwaSubmissions.createdAt));
  }

  async updateRwaSubmissionStatus(id: string, status: string, adminNotes?: string, reviewedBy?: string): Promise<RwaSubmission> {
    const [submission] = await db
      .update(rwaSubmissions)
      .set({
        status,
        adminNotes,
        reviewedBy,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(rwaSubmissions.id, id))
      .returning();
    return submission;
  }

  // Pawn Loan operations
  async createPawnLoan(loan: InsertPawnLoan): Promise<PawnLoan> {
    const [pawnLoan] = await db.insert(pawnLoans).values(loan).returning();
    return pawnLoan;
  }

  async getPawnLoan(id: string): Promise<PawnLoan | undefined> {
    const [loan] = await db.select().from(pawnLoans).where(eq(pawnLoans.id, id));
    return loan || undefined;
  }

  async getPawnLoansByUser(userId: string): Promise<PawnLoan[]> {
    return await db.select().from(pawnLoans).where(eq(pawnLoans.userId, userId)).orderBy(desc(pawnLoans.createdAt));
  }

  async getActivePawnLoans(): Promise<PawnLoan[]> {
    return await db.select().from(pawnLoans).where(eq(pawnLoans.status, "active")).orderBy(desc(pawnLoans.createdAt));
  }

  async getExpiringPawnLoans(days: number): Promise<PawnLoan[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);
    
    return await db
      .select()
      .from(pawnLoans)
      .where(
        and(
          eq(pawnLoans.status, "active"),
          lt(pawnLoans.expiryDate, cutoffDate)
        )
      )
      .orderBy(pawnLoans.expiryDate);
  }

  async updatePawnLoanStatus(id: string, status: string): Promise<PawnLoan> {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === "redeemed") {
      updateData.redeemedAt = new Date();
    }

    const [loan] = await db
      .update(pawnLoans)
      .set(updateData)
      .where(eq(pawnLoans.id, id))
      .returning();
    return loan;
  }

  // Marketplace operations
  async createMarketplaceAsset(asset: InsertMarketplaceAsset): Promise<MarketplaceAsset> {
    const [marketplaceAsset] = await db.insert(marketplaceAssets).values(asset).returning();
    return marketplaceAsset;
  }

  async getMarketplaceAssets(): Promise<MarketplaceAsset[]> {
    return await db
      .select()
      .from(marketplaceAssets)
      .where(eq(marketplaceAssets.status, "available"))
      .orderBy(desc(marketplaceAssets.createdAt));
  }

  async getMarketplaceAsset(id: string): Promise<MarketplaceAsset | undefined> {
    const [asset] = await db.select().from(marketplaceAssets).where(eq(marketplaceAssets.id, id));
    return asset || undefined;
  }

  async updateMarketplaceAsset(id: string, updates: Partial<InsertMarketplaceAsset>): Promise<MarketplaceAsset> {
    const [asset] = await db
      .update(marketplaceAssets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(marketplaceAssets.id, id))
      .returning();
    return asset;
  }

  // Bid operations
  async createBid(bid: InsertBid): Promise<Bid> {
    const [newBid] = await db.insert(bids).values(bid).returning();
    return newBid;
  }

  async getBidsByAsset(assetId: string): Promise<Bid[]> {
    return await db.select().from(bids).where(eq(bids.assetId, assetId)).orderBy(desc(bids.amount));
  }

  async getHighestBid(assetId: string): Promise<Bid | undefined> {
    const [bid] = await db
      .select()
      .from(bids)
      .where(eq(bids.assetId, assetId))
      .orderBy(desc(bids.amount))
      .limit(1);
    return bid || undefined;
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }

  async updateTransactionStatus(id: string, status: string, txHash?: string): Promise<Transaction> {
    const updateData: any = { status, updatedAt: new Date() };
    if (txHash) {
      updateData.txHash = txHash;
    }

    const [transaction] = await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();
    return transaction;
  }

  // Bridge operations
  async createBridgeTransaction(bridge: InsertBridgeTransaction): Promise<BridgeTransaction> {
    const [bridgeTransaction] = await db.insert(bridgeTransactions).values(bridge).returning();
    return bridgeTransaction;
  }

  async getBridgeTransactionsByUser(userId: string): Promise<BridgeTransaction[]> {
    return await db.select().from(bridgeTransactions).where(eq(bridgeTransactions.userId, userId)).orderBy(desc(bridgeTransactions.createdAt));
  }

  async updateBridgeTransactionStatus(id: string, status: string, destinationTxHash?: string): Promise<BridgeTransaction> {
    const updateData: any = { status, updatedAt: new Date() };
    if (destinationTxHash) {
      updateData.destinationTxHash = destinationTxHash;
    }

    const [bridge] = await db
      .update(bridgeTransactions)
      .set(updateData)
      .where(eq(bridgeTransactions.id, id))
      .returning();
    return bridge;
  }

  // Admin statistics
  async getAdminStats(): Promise<{
    pendingApprovals: number;
    activeLoans: number;
    expiringSoon: number;
    totalRevenue: string;
  }> {
    // Get pending approvals count
    const pendingApprovalsResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(rwaSubmissions)
      .where(eq(rwaSubmissions.status, "pending"));

    // Get active loans count
    const activeLoansResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(pawnLoans)
      .where(eq(pawnLoans.status, "active"));

    // Get expiring soon count (next 7 days)
    const expiringCutoff = new Date();
    expiringCutoff.setDate(expiringCutoff.getDate() + 7);
    
    const expiringSoonResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(pawnLoans)
      .where(
        and(
          eq(pawnLoans.status, "active"),
          lt(pawnLoans.expiryDate, expiringCutoff)
        )
      );

    // Get total revenue from fees
    const totalRevenueResult = await db
      .select({ total: sql<string>`cast(coalesce(sum(fee_amount), 0) as text)` })
      .from(pawnLoans);

    return {
      pendingApprovals: pendingApprovalsResult[0]?.count || 0,
      activeLoans: activeLoansResult[0]?.count || 0,
      expiringSoon: expiringSoonResult[0]?.count || 0,
      totalRevenue: totalRevenueResult[0]?.total || "0",
    };
  }
}

export const storage = new DatabaseStorage();
