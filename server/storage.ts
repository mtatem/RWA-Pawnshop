import {
  users,
  rwaSubmissions,
  pawnLoans,
  marketplaceAssets,
  bids,
  transactions,
  bridgeTransactions,
  assetPricingCache,
  pricingEstimates,
  documents,
  documentAnalysisResults,
  fraudDetectionResults,
  documentVerifications,
  documentAnalysisQueue,
  documentTemplates,
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
  type AssetPricingCache,
  type InsertAssetPricingCache,
  type PricingEstimate,
  type InsertPricingEstimate,
  type Document,
  type InsertDocument,
  type DocumentAnalysisResult,
  type InsertDocumentAnalysisResult,
  type FraudDetectionResult,
  type InsertFraudDetectionResult,
  type DocumentVerification,
  type InsertDocumentVerification,
  type DocumentAnalysisQueue,
  type InsertDocumentAnalysisQueue,
  type DocumentTemplate,
  type InsertDocumentTemplate,
  type DocumentSearch,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lt, gte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: any): Promise<User>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  getUserByPrincipalId(principalId: string): Promise<User | undefined>;
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
  updateTransactionStatus(id: string, status: string, txHash?: string, blockHeight?: number): Promise<Transaction>;

  // Bridge operations - Enhanced for Chain Fusion
  createBridgeTransaction(bridge: InsertBridgeTransaction): Promise<BridgeTransaction>;
  getBridgeTransaction(id: string): Promise<BridgeTransaction | undefined>;
  getBridgeTransactionsByUser(userId: string, limit?: number, offset?: number): Promise<BridgeTransaction[]>;
  updateBridgeTransaction(id: string, updates: Partial<BridgeTransaction>): Promise<BridgeTransaction>;
  updateBridgeTransactionStatus(id: string, status: string, updates?: Partial<BridgeTransaction>): Promise<BridgeTransaction>;
  getBridgeTransactionsByStatus(status: string): Promise<BridgeTransaction[]>;
  getBridgeTransactionsWithFilters(filters: any): Promise<BridgeTransaction[]>;

  // Pricing operations
  storePricingCache(cache: InsertAssetPricingCache): Promise<AssetPricingCache>;
  getPricingCache(category: string, symbol?: string, itemType?: string): Promise<AssetPricingCache | undefined>;
  updatePricingCache(id: string, updates: Partial<InsertAssetPricingCache>): Promise<AssetPricingCache>;
  clearExpiredPricingCache(): Promise<number>;
  
  // Pricing estimates for audit trail
  createPricingEstimate(estimate: InsertPricingEstimate): Promise<PricingEstimate>;
  getPricingEstimatesBySubmission(submissionId: string): Promise<PricingEstimate[]>;

  // Admin statistics
  getAdminStats(): Promise<{
    pendingApprovals: number;
    activeLoans: number;
    expiringSoon: number;
    totalRevenue: string;
  }>;

  // Document Analysis operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsBySubmission(submissionId: string): Promise<Document[]>;
  updateDocumentAnalysisStatus(id: string, status: string): Promise<Document>;
  updateDocumentPriority(id: string, priority: number): Promise<Document>;

  // Document Analysis Results operations
  createDocumentAnalysisResult(result: InsertDocumentAnalysisResult): Promise<DocumentAnalysisResult>;
  getDocumentAnalysisResult(documentId: string): Promise<DocumentAnalysisResult | undefined>;
  getDocumentAnalysisResults(documentId: string): Promise<DocumentAnalysisResult[]>;
  deleteDocumentAnalysisResult(documentId: string): Promise<void>;

  // Fraud Detection Results operations
  createFraudDetectionResult(result: InsertFraudDetectionResult): Promise<FraudDetectionResult>;
  getFraudDetectionResult(documentId: string): Promise<FraudDetectionResult | undefined>;
  getFraudDetectionResults(documentId: string): Promise<FraudDetectionResult[]>;
  deleteFraudDetectionResult(documentId: string): Promise<void>;

  // Document Verification operations
  createDocumentVerification(verification: InsertDocumentVerification): Promise<DocumentVerification>;
  getDocumentVerifications(documentId: string): Promise<DocumentVerification[]>;
  updateDocumentVerification(id: string, updates: Partial<DocumentVerification>): Promise<DocumentVerification>;

  // Document Analysis Queue operations
  addToAnalysisQueue(queueItem: InsertDocumentAnalysisQueue): Promise<DocumentAnalysisQueue>;
  getAnalysisQueue(): Promise<DocumentAnalysisQueue[]>;
  getAnalysisQueueItem(id: string): Promise<DocumentAnalysisQueue | undefined>;
  updateAnalysisQueueStatus(id: string, status: string, updates?: Partial<DocumentAnalysisQueue>): Promise<DocumentAnalysisQueue>;
  updateQueuePriority(documentId: string, priority: number): Promise<void>;
  getDocumentQueueHistory(documentId: string): Promise<DocumentAnalysisQueue[]>;

  // Document Template operations
  createDocumentTemplate(template: InsertDocumentTemplate): Promise<DocumentTemplate>;
  getDocumentTemplates(): Promise<DocumentTemplate[]>;
  getDocumentTemplate(id: string): Promise<DocumentTemplate | undefined>;
  updateDocumentTemplate(id: string, updates: Partial<DocumentTemplate>): Promise<DocumentTemplate>;
  deleteDocumentTemplate(id: string): Promise<void>;

  // Document Statistics and Management
  getDocumentStatistics(): Promise<{
    totalDocuments: number;
    pendingAnalysis: number;
    completedAnalysis: number;
    failedAnalysis: number;
    highRiskDocuments: number;
    processingQueue: number;
  }>;
  getDocumentsRequiringManualReview(): Promise<Document[]>;
  searchDocuments(filters: DocumentSearch): Promise<{ documents: Document[]; totalCount: number }>;
  getDocumentsByRiskLevel(riskLevel: string): Promise<Document[]>;
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

  async getUserByPrincipalId(principalId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.principalId, principalId));
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

  async updateTransactionStatus(id: string, status: string, txHash?: string, blockHeight?: number): Promise<Transaction> {
    const updateData: any = { status, updatedAt: new Date() };
    if (txHash) {
      updateData.txHash = txHash;
    }
    if (blockHeight !== undefined) {
      updateData.blockHeight = blockHeight;
    }

    const [transaction] = await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();
    return transaction;
  }

  // Bridge operations - Enhanced for Chain Fusion
  async createBridgeTransaction(bridge: InsertBridgeTransaction): Promise<BridgeTransaction> {
    const [bridgeTransaction] = await db.insert(bridgeTransactions).values(bridge).returning();
    return bridgeTransaction;
  }

  async getBridgeTransaction(id: string): Promise<BridgeTransaction | undefined> {
    const [bridge] = await db.select().from(bridgeTransactions).where(eq(bridgeTransactions.id, id));
    return bridge || undefined;
  }

  async getBridgeTransactionsByUser(userId: string, limit: number = 20, offset: number = 0): Promise<BridgeTransaction[]> {
    return await db
      .select()
      .from(bridgeTransactions)
      .where(eq(bridgeTransactions.userId, userId))
      .orderBy(desc(bridgeTransactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async updateBridgeTransaction(id: string, updates: Partial<BridgeTransaction>): Promise<BridgeTransaction> {
    const updateData = { ...updates, updatedAt: new Date() };
    
    // Handle completion timestamp
    if (updates.status === 'completed' && !updates.completedAt) {
      updateData.completedAt = new Date();
    }

    const [bridge] = await db
      .update(bridgeTransactions)
      .set(updateData)
      .where(eq(bridgeTransactions.id, id))
      .returning();
    return bridge;
  }

  async updateBridgeTransactionStatus(id: string, status: string, updates?: Partial<BridgeTransaction>): Promise<BridgeTransaction> {
    const updateData: any = { status, updatedAt: new Date(), ...updates };
    
    // Handle completion timestamp
    if (status === 'completed' && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }

    const [bridge] = await db
      .update(bridgeTransactions)
      .set(updateData)
      .where(eq(bridgeTransactions.id, id))
      .returning();
    return bridge;
  }

  async getBridgeTransactionsByStatus(status: string): Promise<BridgeTransaction[]> {
    return await db
      .select()
      .from(bridgeTransactions)
      .where(eq(bridgeTransactions.status, status))
      .orderBy(desc(bridgeTransactions.createdAt));
  }

  async getBridgeTransactionsWithFilters(filters: {
    status?: string;
    fromNetwork?: string;
    toNetwork?: string;
    fromToken?: string;
    toToken?: string;
    limit?: number;
    offset?: number;
  }): Promise<BridgeTransaction[]> {
    let query = db.select().from(bridgeTransactions);
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(bridgeTransactions.status, filters.status));
    }
    if (filters.fromNetwork) {
      conditions.push(eq(bridgeTransactions.fromNetwork, filters.fromNetwork));
    }
    if (filters.toNetwork) {
      conditions.push(eq(bridgeTransactions.toNetwork, filters.toNetwork));
    }
    if (filters.fromToken) {
      conditions.push(eq(bridgeTransactions.fromToken, filters.fromToken));
    }
    if (filters.toToken) {
      conditions.push(eq(bridgeTransactions.toToken, filters.toToken));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query
      .orderBy(desc(bridgeTransactions.createdAt))
      .limit(filters.limit || 20)
      .offset(filters.offset || 0);
  }

  // Pricing operations
  async storePricingCache(cache: InsertAssetPricingCache): Promise<AssetPricingCache> {
    const [cachedData] = await db
      .insert(assetPricingCache)
      .values(cache)
      .onConflictDoUpdate({
        target: [assetPricingCache.category, assetPricingCache.symbol, assetPricingCache.itemType],
        set: {
          medianPrice: cache.medianPrice,
          p25Price: cache.p25Price,
          p75Price: cache.p75Price,
          sources: cache.sources,
          confidence: cache.confidence,
          ttlSeconds: cache.ttlSeconds,
          lastUpdated: new Date(),
        },
      })
      .returning();
    return cachedData;
  }

  async getPricingCache(category: string, symbol?: string, itemType?: string): Promise<AssetPricingCache | undefined> {
    const conditions = [eq(assetPricingCache.category, category)];
    
    if (symbol) {
      conditions.push(eq(assetPricingCache.symbol, symbol));
    }
    if (itemType) {
      conditions.push(eq(assetPricingCache.itemType, itemType));
    }

    const [cached] = await db
      .select()
      .from(assetPricingCache)
      .where(and(...conditions))
      .orderBy(desc(assetPricingCache.lastUpdated))
      .limit(1);

    // Check if cache is still valid
    if (cached) {
      const now = Date.now();
      const lastUpdated = new Date(cached.lastUpdated).getTime();
      const ttlMs = cached.ttlSeconds * 1000;
      
      if (now - lastUpdated > ttlMs) {
        return undefined; // Cache expired
      }
    }

    return cached || undefined;
  }

  async updatePricingCache(id: string, updates: Partial<InsertAssetPricingCache>): Promise<AssetPricingCache> {
    const [updated] = await db
      .update(assetPricingCache)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(assetPricingCache.id, id))
      .returning();
    return updated;
  }

  async clearExpiredPricingCache(): Promise<number> {
    // Calculate expiry cutoff time
    const now = new Date();
    const expiredCondition = sql`${assetPricingCache.lastUpdated} + INTERVAL '1 second' * ${assetPricingCache.ttlSeconds} < ${now}`;
    
    const deletedRows = await db
      .delete(assetPricingCache)
      .where(expiredCondition);
    
    return deletedRows.rowCount || 0;
  }

  async createPricingEstimate(estimate: InsertPricingEstimate): Promise<PricingEstimate> {
    const [pricingEstimate] = await db.insert(pricingEstimates).values(estimate).returning();
    return pricingEstimate;
  }

  async getPricingEstimatesBySubmission(submissionId: string): Promise<PricingEstimate[]> {
    return await db
      .select()
      .from(pricingEstimates)
      .where(eq(pricingEstimates.submissionId, submissionId))
      .orderBy(desc(pricingEstimates.createdAt));
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

  // Document Analysis operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async getDocumentsBySubmission(submissionId: string): Promise<Document[]> {
    return await db.select().from(documents)
      .where(eq(documents.submissionId, submissionId))
      .orderBy(desc(documents.createdAt));
  }

  async updateDocumentAnalysisStatus(id: string, status: string): Promise<Document> {
    const [document] = await db
      .update(documents)
      .set({ analysisStatus: status, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async updateDocumentPriority(id: string, priority: number): Promise<Document> {
    const [document] = await db
      .update(documents)
      .set({ priority, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  // Document Analysis Results operations
  async createDocumentAnalysisResult(result: InsertDocumentAnalysisResult): Promise<DocumentAnalysisResult> {
    const [analysisResult] = await db.insert(documentAnalysisResults).values(result).returning();
    return analysisResult;
  }

  async getDocumentAnalysisResult(documentId: string): Promise<DocumentAnalysisResult | undefined> {
    const [result] = await db.select().from(documentAnalysisResults)
      .where(eq(documentAnalysisResults.documentId, documentId))
      .orderBy(desc(documentAnalysisResults.analyzedAt))
      .limit(1);
    return result || undefined;
  }

  async getDocumentAnalysisResults(documentId: string): Promise<DocumentAnalysisResult[]> {
    return await db.select().from(documentAnalysisResults)
      .where(eq(documentAnalysisResults.documentId, documentId))
      .orderBy(desc(documentAnalysisResults.analyzedAt));
  }

  async deleteDocumentAnalysisResult(documentId: string): Promise<void> {
    await db.delete(documentAnalysisResults)
      .where(eq(documentAnalysisResults.documentId, documentId));
  }

  // Fraud Detection Results operations
  async createFraudDetectionResult(result: InsertFraudDetectionResult): Promise<FraudDetectionResult> {
    const [fraudResult] = await db.insert(fraudDetectionResults).values(result).returning();
    return fraudResult;
  }

  async getFraudDetectionResult(documentId: string): Promise<FraudDetectionResult | undefined> {
    const [result] = await db.select().from(fraudDetectionResults)
      .where(eq(fraudDetectionResults.documentId, documentId))
      .orderBy(desc(fraudDetectionResults.analyzedAt))
      .limit(1);
    return result || undefined;
  }

  async getFraudDetectionResults(documentId: string): Promise<FraudDetectionResult[]> {
    return await db.select().from(fraudDetectionResults)
      .where(eq(fraudDetectionResults.documentId, documentId))
      .orderBy(desc(fraudDetectionResults.analyzedAt));
  }

  async deleteFraudDetectionResult(documentId: string): Promise<void> {
    await db.delete(fraudDetectionResults)
      .where(eq(fraudDetectionResults.documentId, documentId));
  }

  // Document Verification operations
  async createDocumentVerification(verification: InsertDocumentVerification): Promise<DocumentVerification> {
    const [newVerification] = await db.insert(documentVerifications).values(verification).returning();
    return newVerification;
  }

  async getDocumentVerifications(documentId: string): Promise<DocumentVerification[]> {
    return await db.select().from(documentVerifications)
      .where(eq(documentVerifications.documentId, documentId))
      .orderBy(desc(documentVerifications.reviewedAt));
  }

  async updateDocumentVerification(id: string, updates: Partial<DocumentVerification>): Promise<DocumentVerification> {
    const [verification] = await db
      .update(documentVerifications)
      .set({ ...updates, reviewedAt: new Date() })
      .where(eq(documentVerifications.id, id))
      .returning();
    return verification;
  }

  // Document Analysis Queue operations
  async addToAnalysisQueue(queueItem: InsertDocumentAnalysisQueue): Promise<DocumentAnalysisQueue> {
    const [newQueueItem] = await db.insert(documentAnalysisQueue).values(queueItem).returning();
    return newQueueItem;
  }

  async getAnalysisQueue(): Promise<DocumentAnalysisQueue[]> {
    return await db.select().from(documentAnalysisQueue)
      .where(eq(documentAnalysisQueue.queueStatus, 'queued'))
      .orderBy(desc(documentAnalysisQueue.priority), documentAnalysisQueue.createdAt);
  }

  async getAnalysisQueueItem(id: string): Promise<DocumentAnalysisQueue | undefined> {
    const [item] = await db.select().from(documentAnalysisQueue)
      .where(eq(documentAnalysisQueue.id, id));
    return item || undefined;
  }

  async updateAnalysisQueueStatus(id: string, status: string, updates?: Partial<DocumentAnalysisQueue>): Promise<DocumentAnalysisQueue> {
    const updateData = { queueStatus: status, updatedAt: new Date(), ...updates };
    const [queueItem] = await db
      .update(documentAnalysisQueue)
      .set(updateData)
      .where(eq(documentAnalysisQueue.id, id))
      .returning();
    return queueItem;
  }

  async updateQueuePriority(documentId: string, priority: number): Promise<void> {
    await db
      .update(documentAnalysisQueue)
      .set({ priority, updatedAt: new Date() })
      .where(eq(documentAnalysisQueue.documentId, documentId));
  }

  async getDocumentQueueHistory(documentId: string): Promise<DocumentAnalysisQueue[]> {
    return await db.select().from(documentAnalysisQueue)
      .where(eq(documentAnalysisQueue.documentId, documentId))
      .orderBy(desc(documentAnalysisQueue.createdAt));
  }

  // Document Template operations
  async createDocumentTemplate(template: InsertDocumentTemplate): Promise<DocumentTemplate> {
    const [newTemplate] = await db.insert(documentTemplates).values(template).returning();
    return newTemplate;
  }

  async getDocumentTemplates(): Promise<DocumentTemplate[]> {
    return await db.select().from(documentTemplates)
      .where(eq(documentTemplates.isActive, true))
      .orderBy(documentTemplates.documentType, documentTemplates.createdAt);
  }

  async getDocumentTemplate(id: string): Promise<DocumentTemplate | undefined> {
    const [template] = await db.select().from(documentTemplates)
      .where(eq(documentTemplates.id, id));
    return template || undefined;
  }

  async updateDocumentTemplate(id: string, updates: Partial<DocumentTemplate>): Promise<DocumentTemplate> {
    const [template] = await db
      .update(documentTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documentTemplates.id, id))
      .returning();
    return template;
  }

  async deleteDocumentTemplate(id: string): Promise<void> {
    await db
      .update(documentTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(documentTemplates.id, id));
  }

  // Document Statistics and Management
  async getDocumentStatistics(): Promise<{
    totalDocuments: number;
    pendingAnalysis: number;
    completedAnalysis: number;
    failedAnalysis: number;
    highRiskDocuments: number;
    processingQueue: number;
  }> {
    const [totalDocs] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(documents);

    const [pendingDocs] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(documents)
      .where(eq(documents.analysisStatus, 'pending'));

    const [completedDocs] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(documents)
      .where(eq(documents.analysisStatus, 'completed'));

    const [failedDocs] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(documents)
      .where(eq(documents.analysisStatus, 'failed'));

    const [highRiskDocs] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(fraudDetectionResults)
      .where(eq(fraudDetectionResults.riskLevel, 'high'));

    const [queuedDocs] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(documentAnalysisQueue)
      .where(eq(documentAnalysisQueue.queueStatus, 'queued'));

    return {
      totalDocuments: totalDocs?.count || 0,
      pendingAnalysis: pendingDocs?.count || 0,
      completedAnalysis: completedDocs?.count || 0,
      failedAnalysis: failedDocs?.count || 0,
      highRiskDocuments: highRiskDocs?.count || 0,
      processingQueue: queuedDocs?.count || 0,
    };
  }

  async getDocumentsRequiringManualReview(): Promise<Document[]> {
    // Get documents that have fraud detection results requiring manual review
    return await db.select().from(documents)
      .innerJoin(fraudDetectionResults, eq(documents.id, fraudDetectionResults.documentId))
      .where(eq(fraudDetectionResults.requiresManualReview, true))
      .orderBy(desc(documents.createdAt));
  }

  async searchDocuments(filters: DocumentSearch): Promise<{ documents: Document[]; totalCount: number }> {
    let query = db.select().from(documents);
    let countQuery = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(documents);
    
    const conditions = [];
    
    if (filters.submissionId) {
      conditions.push(eq(documents.submissionId, filters.submissionId));
    }
    if (filters.documentType) {
      conditions.push(eq(documents.documentType, filters.documentType));
    }
    if (filters.analysisStatus) {
      conditions.push(eq(documents.analysisStatus, filters.analysisStatus));
    }
    if (filters.dateFrom) {
      conditions.push(gte(documents.createdAt, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lt(documents.createdAt, new Date(filters.dateTo)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    // Add risk level filter if specified (requires join with fraud detection results)
    if (filters.riskLevel) {
      query = query.innerJoin(fraudDetectionResults, eq(documents.id, fraudDetectionResults.documentId))
        .where(eq(fraudDetectionResults.riskLevel, filters.riskLevel));
      countQuery = countQuery.innerJoin(fraudDetectionResults, eq(documents.id, fraudDetectionResults.documentId))
        .where(eq(fraudDetectionResults.riskLevel, filters.riskLevel));
    }

    // Get total count
    const [countResult] = await countQuery;
    const totalCount = countResult?.count || 0;

    // Apply sorting
    const sortColumn = filters.sortBy === 'analyzed_at' ? documents.updatedAt :
                      filters.sortBy === 'fraud_score' ? documents.createdAt : // Default for fraud_score
                      filters.sortBy === 'file_size' ? documents.fileSize :
                      documents.createdAt;

    query = filters.sortOrder === 'asc' ? 
      query.orderBy(sortColumn) : 
      query.orderBy(desc(sortColumn));

    // Apply pagination
    const documentsResult = await query
      .limit(filters.limit || 20)
      .offset(filters.offset || 0);

    return {
      documents: documentsResult,
      totalCount,
    };
  }

  async getDocumentsByRiskLevel(riskLevel: string): Promise<Document[]> {
    return await db.select().from(documents)
      .innerJoin(fraudDetectionResults, eq(documents.id, fraudDetectionResults.documentId))
      .where(eq(fraudDetectionResults.riskLevel, riskLevel))
      .orderBy(desc(documents.createdAt));
  }
}

export const storage = new DatabaseStorage();
