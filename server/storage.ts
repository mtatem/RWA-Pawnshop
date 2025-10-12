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
  adminActions,
  fraudAlerts,
  assetReviews,
  userFlags,
  performanceMetrics,
  rwapawnPurchases,
  rwapawnStakes,
  rwapawnSwaps,
  rwapawnBalances,
  kycInformation,
  walletBindings,
  mfaTokens,
  userActivityLog,
  formSubmissions,
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
  type AdminAction,
  type InsertAdminAction,
  type FraudAlert,
  type InsertFraudAlert,
  type AssetReview,
  type InsertAssetReview,
  type UserFlag,
  type InsertUserFlag,
  type PerformanceMetric,
  type InsertPerformanceMetric,
  type AdminDashboardFilters,
  type RwapawnPurchase,
  type InsertRwapawnPurchase,
  type RwapawnStake,
  type InsertRwapawnStake,
  type RwapawnSwap,
  type InsertRwapawnSwap,
  type RwapawnBalance,
  type InsertRwapawnBalance,
  type KycInformation,
  type InsertKycInformation,
  type WalletBinding,
  type InsertWalletBinding,
  type MfaToken,
  type InsertMfaToken,
  type UserActivityLog,
  type InsertUserActivityLog,
  type FormSubmission,
  type InsertFormSubmission,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, lt, gte, sql, ilike } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { EncryptionService } from "./encryption-service";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: any): Promise<User>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  getUserByPrincipalId(principalId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  checkUserDependencies(id: string): Promise<{ canDelete: boolean; dependencies: Array<{ table: string; count: number; description: string }> }>;
  deleteUser(id: string): Promise<{ success: boolean; error?: string; dependencies?: Array<{ table: string; count: number; description: string }> }>;
  
  // Admin user management operations
  getAllUsersWithDetails(limit: number, offset: number, filters: any): Promise<User[]>;
  getUserCount(filters: any): Promise<number>;
  getUserCountByStatus(status: string): Promise<number>;
  getUserCountByVerification(verification: string): Promise<number>;
  getFlaggedUserCount(): Promise<number>;
  getUserKyc(userId: string): Promise<KycInformation | undefined>;
  getUserWalletBindings(userId: string): Promise<WalletBinding[]>;
  getUserTransactions(userId: string): Promise<Transaction[]>;
  
  // Traditional authentication methods
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUserWithPassword(userData: Partial<InsertUser>, passwordHash: string): Promise<User>;
  updateUserPassword(id: string, passwordHash: string): Promise<User>;
  setPasswordResetToken(email: string, token: string, expiry: Date): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(id: string): Promise<User>;
  incrementLoginAttempts(id: string): Promise<User>;
  resetLoginAttempts(id: string): Promise<User>;
  lockUser(id: string, until: Date): Promise<User>;
  
  // KYC operations
  createKycInformation(kycData: InsertKycInformation): Promise<KycInformation>;
  getKycInformation(userId: string): Promise<KycInformation | undefined>;
  getKycSubmission(kycId: string): Promise<KycInformation | undefined>;
  updateKycStatus(kycId: string, status: string, reviewNotes?: string, reviewedBy?: string, rejectionReason?: string): Promise<KycInformation>;
  getPendingKycSubmissions(): Promise<any[]>;
  getAllKycSubmissions(): Promise<any[]>;
  
  // Wallet binding operations
  createWalletBinding(bindingData: InsertWalletBinding): Promise<WalletBinding>;
  getWalletBindings(userId: string): Promise<WalletBinding[]>;
  getWalletBinding(id: string): Promise<WalletBinding | undefined>;
  verifyWalletBinding(id: string, verificationData: any): Promise<WalletBinding>;
  revokeWalletBinding(id: string): Promise<WalletBinding>;
  
  // MFA operations
  storeMfaSetup(userId: string, encryptedSecret: string, backupCodes: string[]): Promise<void>;
  getMfaSetup(userId: string): Promise<{ secret: string | null, backupCodes: string[] }>;
  enableMfa(userId: string): Promise<void>;
  disableMfa(userId: string): Promise<void>;
  useBackupCode(userId: string, codeToRemove: string): Promise<boolean>;
  
  // User activity logging
  logUserActivity(activityData: InsertUserActivityLog): Promise<UserActivityLog>;
  getUserActivityLog(userId: string, limit?: number): Promise<UserActivityLog[]>;

  // Role management operations
  updateUserRole(userId: string, role: string): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;

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

  // Admin Action operations
  createAdminAction(action: InsertAdminAction): Promise<AdminAction>;
  getAdminActions(filters: AdminDashboardFilters): Promise<{ actions: AdminAction[]; totalCount: number }>;
  getAdminActionsByType(actionType: string): Promise<AdminAction[]>;
  getAdminActionsByTarget(targetType: string, targetId: string): Promise<AdminAction[]>;

  // Fraud Alert operations
  createFraudAlert(alert: InsertFraudAlert): Promise<FraudAlert>;
  getFraudAlert(id: string): Promise<FraudAlert | undefined>;
  getFraudAlerts(filters: AdminDashboardFilters): Promise<{ alerts: FraudAlert[]; totalCount: number }>;
  updateFraudAlert(id: string, updates: Partial<FraudAlert>): Promise<FraudAlert>;
  getFraudAlertsByUser(userId: string): Promise<FraudAlert[]>;
  getFraudAlertsByStatus(status: string): Promise<FraudAlert[]>;
  getFraudAlertsByRiskScore(minScore: number): Promise<FraudAlert[]>;

  // Asset Review operations
  createAssetReview(review: InsertAssetReview): Promise<AssetReview>;
  getAssetReview(id: string): Promise<AssetReview | undefined>;
  getAssetReviews(filters: AdminDashboardFilters): Promise<{ reviews: AssetReview[]; totalCount: number }>;
  updateAssetReview(id: string, updates: Partial<AssetReview>): Promise<AssetReview>;
  getAssetReviewsBySubmission(submissionId: string): Promise<AssetReview[]>;
  getAssetReviewsByStatus(status: string): Promise<AssetReview[]>;
  getAssetReviewsByAssignee(assignedTo: string): Promise<AssetReview[]>;

  // User Flag operations
  createUserFlag(flag: InsertUserFlag): Promise<UserFlag>;
  getUserFlag(id: string): Promise<UserFlag | undefined>;
  getUserFlags(filters: AdminDashboardFilters): Promise<{ flags: UserFlag[]; totalCount: number }>;
  updateUserFlag(id: string, updates: Partial<UserFlag>): Promise<UserFlag>;
  getUserFlagsByUser(userId: string): Promise<UserFlag[]>;
  getUserFlagsByStatus(status: string): Promise<UserFlag[]>;
  getActiveUserFlags(): Promise<UserFlag[]>;

  // Performance Metrics operations
  createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric>;
  getPerformanceMetrics(filters: AdminDashboardFilters): Promise<{ metrics: PerformanceMetric[]; totalCount: number }>;
  getPerformanceMetricsByType(metricType: string): Promise<PerformanceMetric[]>;
  getPerformanceMetricsByCategory(category: string): Promise<PerformanceMetric[]>;
  getLatestPerformanceMetrics(limit?: number): Promise<PerformanceMetric[]>;

  // Enhanced Admin Statistics
  getEnhancedAdminStats(): Promise<{
    overview: {
      pendingApprovals: number;
      activeLoans: number;
      expiringSoon: number;
      totalRevenue: string;
      monthlyGrowth: string;
      userCount: number;
      avgLoanValue: string;
    };
    security: {
      openFraudAlerts: number;
      criticalAlerts: number;
      flaggedUsers: number;
      suspiciousDocuments: number;
      fraudPrevented: string;
    };
    operations: {
      pendingDocuments: number;
      processingDocuments: number;
      completedToday: number;
      avgProcessingTime: number;
      manualReviewRequired: number;
    };
    bridge: {
      activeTransactions: number;
      completedToday: number;
      failedTransactions: number;
      totalVolume: string;
      avgProcessingTime: number;
    };
  }>;

  // RWAPAWN Token operations
  createRwapawnPurchase(purchase: InsertRwapawnPurchase): Promise<RwapawnPurchase>;
  getRwapawnPurchase(id: string): Promise<RwapawnPurchase | undefined>;
  getRwapawnPurchasesByUser(userId: string): Promise<RwapawnPurchase[]>;
  updateRwapawnPurchaseStatus(id: string, status: string): Promise<RwapawnPurchase>;

  createRwapawnStake(stake: InsertRwapawnStake): Promise<RwapawnStake>;
  getRwapawnStake(id: string): Promise<RwapawnStake | undefined>;
  getRwapawnStakesByUser(userId: string): Promise<RwapawnStake[]>;
  updateRwapawnStakeStatus(id: string, status: string): Promise<RwapawnStake>;

  createRwapawnSwap(swap: InsertRwapawnSwap): Promise<RwapawnSwap>;
  getRwapawnSwap(id: string): Promise<RwapawnSwap | undefined>;
  getRwapawnSwapsByUser(userId: string): Promise<RwapawnSwap[]>;
  updateRwapawnSwapStatus(id: string, status: string): Promise<RwapawnSwap>;

  getRwapawnBalance(userId: string): Promise<RwapawnBalance | undefined>;
  createRwapawnBalance(balance: InsertRwapawnBalance): Promise<RwapawnBalance>;
  updateRwapawnBalance(userId: string, updates: Partial<RwapawnBalance>): Promise<RwapawnBalance>;
  addTokensToBalance(userId: string, amount: number): Promise<RwapawnBalance>;
  
  // Form submission operations
  createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission>;
  getFormSubmission(id: string): Promise<FormSubmission | undefined>;
  getAllFormSubmissions(limit?: number, offset?: number, filters?: any): Promise<FormSubmission[]>;
  getFormSubmissionCount(filters?: any): Promise<number>;
  updateFormSubmissionStatus(id: string, status: string, responseNotes?: string, assignedTo?: string): Promise<FormSubmission>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  // Traditional authentication methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!username) return undefined;
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    } catch (error) {
      // Column doesn't exist yet - database not migrated
      return undefined;
    }
  }

  async createUserWithPassword(userData: Partial<InsertUser>, passwordHash: string): Promise<User> {
    try {
      const [user] = await db.insert(users).values({
        ...userData,
        passwordHash,
        emailVerified: false,
        accountStatus: 'active',
        verificationStatus: 'unverified',
        kycStatus: 'not_started',
        mfaEnabled: false,
        loginAttempts: 0,
      } as any).returning();
      return user;
    } catch (error: any) {
      // Only catch column-not-exist errors, rethrow others
      if (error?.code === '42703' || error?.message?.includes('column') || error?.message?.includes('does not exist')) {
        throw new Error('Traditional authentication not yet available - database schema needs migration. Please complete the database migration first.');
      }
      throw error; // Rethrow other errors
    }
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<User> {
    try {
      const [user] = await db.update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      
      if (!user) {
        throw new Error('User not found or update failed');
      }
      
      return user;
    } catch (error: any) {
      // Check if it's a column-not-exist error
      if (error?.code === '42703' || error?.message?.includes('column') || error?.message?.includes('does not exist')) {
        throw new Error('Password authentication not yet available - database schema needs migration');
      }
      
      // Log the actual error for debugging
      console.error('Password update error:', {
        error: error instanceof Error ? error.message : error,
        code: error?.code,
        userId: id,
        timestamp: new Date().toISOString()
      });
      
      // Rethrow the actual error
      throw error;
    }
  }

  async setPasswordResetToken(email: string, tokenHash: string, expiry: Date): Promise<User | undefined> {
    try {
      const [user] = await db.update(users)
        .set({ 
          passwordResetTokenHash: tokenHash as any,
          passwordResetExpires: expiry,
          updatedAt: new Date()
        })
        .where(eq(users.email, email))
        .returning();
      return user;
    } catch (error) {
      // Fallback if new columns don't exist
      return undefined;
    }
  }

  async getUserByResetToken(tokenHash: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users)
        .where(and(
          eq(users.passwordResetTokenHash as any, tokenHash),
          sql`${users.passwordResetExpires} > NOW()`
        ));
      return user;
    } catch (error: any) {
      // Only handle column-not-exist errors
      if (error?.code === '42703' || error?.message?.includes('column') || error?.message?.includes('does not exist')) {
        return undefined;
      }
      throw error; // Rethrow other errors for diagnosability
    }
  }

  async clearPasswordResetToken(id: string): Promise<User> {
    try {
      const [user] = await db.update(users)
        .set({ 
          passwordResetTokenHash: null,
          passwordResetExpires: null,
          updatedAt: new Date() 
        })
        .where(eq(users.id, id))
        .returning();
      return user;
    } catch (error) {
      // Fallback if new columns don't exist
      const [user] = await db.update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return user;
    }
  }

  async incrementLoginAttempts(id: string): Promise<User> {
    try {
      const [user] = await db.update(users)
        .set({ 
          loginAttempts: sql`COALESCE(${users.loginAttempts}, 0) + 1`,
          updatedAt: new Date() 
        })
        .where(eq(users.id, id))
        .returning();
      return user;
    } catch (error: any) {
      // Fallback if loginAttempts column doesn't exist
      if (error?.code === '42703' || error?.message?.includes('column') || error?.message?.includes('does not exist')) {
        const [user] = await db.update(users)
          .set({ updatedAt: new Date() })
          .where(eq(users.id, id))
          .returning();
        return user;
      }
      throw error;
    }
  }

  async resetLoginAttempts(id: string): Promise<User> {
    try {
      const [user] = await db.update(users)
        .set({ 
          loginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      return user;
    } catch (error: any) {
      // Fallback if new columns don't exist
      if (error?.code === '42703' || error?.message?.includes('column') || error?.message?.includes('does not exist')) {
        const [user] = await db.update(users)
          .set({ 
            lastLoginAt: new Date() as any,
            updatedAt: new Date()
          })
          .where(eq(users.id, id))
          .returning();
        return user;
      }
      throw error;
    }
  }

  async lockUser(id: string, until: Date): Promise<User> {
    try {
      const [user] = await db.update(users)
        .set({ 
          lockedUntil: until,
          accountStatus: 'restricted',
          updatedAt: new Date() 
        })
        .where(eq(users.id, id))
        .returning();
      return user;
    } catch (error: any) {
      // Fallback if new columns don't exist
      if (error?.code === '42703' || error?.message?.includes('column') || error?.message?.includes('does not exist')) {
        const [user] = await db.update(users)
          .set({ updatedAt: new Date() })
          .where(eq(users.id, id))
          .returning();
        return user;
      }
      throw error;
    }
  }

  // Admin user management operations
  async getAllUsersWithDetails(limit: number, offset: number, filters: any): Promise<User[]> {
    try {
      let query = db.select().from(users);
      
      // Apply filters
      const conditions = [];
      if (filters.search) {
        // Simple case-insensitive search using SQL
        conditions.push(sql`(
          COALESCE(${users.email}, '') ILIKE ${`%${filters.search}%`} OR 
          COALESCE(${users.username}, '') ILIKE ${`%${filters.search}%`} OR 
          COALESCE(${users.principalId}, '') ILIKE ${`%${filters.search}%`}
        )`);
      }
      if (filters.status) {
        conditions.push(eq(users.accountStatus as any, filters.status));
      }
      if (filters.verification) {
        conditions.push(eq(users.verificationStatus as any, filters.verification));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const allUsers = await query
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);
      
      return allUsers;
    } catch (error) {
      console.error('getAllUsersWithDetails error:', error);
      return [];
    }
  }

  async getUserCount(filters: any): Promise<number> {
    try {
      let query = db.select({ count: sql<number>`COUNT(*)` }).from(users);
      
      // Apply same filters as getAllUsersWithDetails
      const conditions = [];
      if (filters.search) {
        // Simple case-insensitive search using SQL
        conditions.push(sql`(
          COALESCE(${users.email}, '') ILIKE ${`%${filters.search}%`} OR 
          COALESCE(${users.username}, '') ILIKE ${`%${filters.search}%`} OR 
          COALESCE(${users.principalId}, '') ILIKE ${`%${filters.search}%`}
        )`);
      }
      if (filters.status) {
        conditions.push(eq(users.accountStatus as any, filters.status));
      }
      if (filters.verification) {
        conditions.push(eq(users.verificationStatus as any, filters.verification));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const [result] = await query;
      return result.count;
    } catch (error) {
      console.error('getUserCount error:', error);
      return 0;
    }
  }

  async getUserCountByStatus(status: string): Promise<number> {
    try {
      const [result] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(eq(users.accountStatus as any, status));
      return result.count;
    } catch (error) {
      console.error('getUserCountByStatus error:', error);
      return 0;
    }
  }

  async getUserCountByVerification(verification: string): Promise<number> {
    try {
      const [result] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(eq(users.verificationStatus as any, verification));
      return result.count;
    } catch (error) {
      console.error('getUserCountByVerification error:', error);
      return 0;
    }
  }

  async getFlaggedUserCount(): Promise<number> {
    try {
      const [result] = await db.select({ count: sql<number>`COUNT(DISTINCT ${userFlags.userId})` })
        .from(userFlags)
        .where(eq(userFlags.status, 'active'));
      return result.count;
    } catch (error) {
      console.error('getFlaggedUserCount error:', error);
      return 0;
    }
  }

  async getUserKyc(userId: string): Promise<KycInformation | undefined> {
    // This is an alias for getKycInformation to match the API interface
    return this.getKycInformation(userId);
  }

  async getUserWalletBindings(userId: string): Promise<WalletBinding[]> {
    // This is an alias for getWalletBindings to match the API interface
    return this.getWalletBindings(userId);
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    // This is an alias for getTransactionsByUser to match the API interface
    return this.getTransactionsByUser(userId);
  }

  // KYC operations
  async createKycInformation(kycData: InsertKycInformation): Promise<KycInformation> {
    try {
      const [kyc] = await db.insert(kycInformation).values(kycData).returning();
      return kyc;
    } catch (error) {
      console.error('KYC creation error:', error);
      console.error('KYC data being inserted:', JSON.stringify(kycData, null, 2));
      throw error; // Re-throw the actual error instead of hiding it
    }
  }

  async getKycInformation(userId: string): Promise<KycInformation | undefined> {
    try {
      const [kyc] = await db.select().from(kycInformation).where(eq(kycInformation.userId, userId));
      return kyc;
    } catch (error) {
      return undefined;
    }
  }

  async getKycSubmission(kycId: string): Promise<KycInformation | undefined> {
    try {
      const [kyc] = await db.select().from(kycInformation).where(eq(kycInformation.id, kycId));
      return kyc;
    } catch (error) {
      return undefined;
    }
  }

  async updateKycStatus(kycId: string, status: string, reviewNotes?: string, reviewedBy?: string, rejectionReason?: string): Promise<KycInformation> {
    try {
      // Update KYC information
      const [kyc] = await db.update(kycInformation)
        .set({
          status: status as any,
          reviewNotes,
          reviewedBy,
          rejectionReason,
          reviewedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(kycInformation.id, kycId))
        .returning();

      // Get current user for role promotion logic
      const userId = kyc.userId;
      const currentUser = await this.getUser(userId);
      
      // Auto-promote user role when KYC is completed
      const updateData: any = { 
        kycStatus: status as any, 
        updatedAt: new Date() 
      };
      
      if (status === 'completed' && currentUser?.role === 'registered') {
        // Promote user from 'registered' to 'registered_kyc' when KYC is completed
        updateData.role = 'registered_kyc';
        
        console.log('Auto-promoting user role:', {
          userId,
          oldRole: currentUser.role,
          newRole: 'registered_kyc',
          reason: 'KYC completion',
          timestamp: new Date().toISOString()
        });
      }

      // Update user's KYC status and potentially role
      await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId));

      return kyc;
    } catch (error) {
      throw new Error('KYC functionality not yet available - database schema needs migration');
    }
  }

  async getPendingKycSubmissions(): Promise<any[]> {
    try {
      const kycSubmissions = await db
        .select({
          id: kycInformation.id,
          userId: kycInformation.userId,
          documentType: kycInformation.documentType,
          documentCountry: kycInformation.documentCountry,
          status: kycInformation.status,
          reviewNotes: kycInformation.reviewNotes,
          rejectionReason: kycInformation.rejectionReason,
          submittedAt: kycInformation.submittedAt,
          reviewedAt: kycInformation.reviewedAt,
          reviewedBy: kycInformation.reviewedBy,
          user: {
            id: users.id,
            username: users.username,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(kycInformation)
        .leftJoin(users, eq(kycInformation.userId, users.id))
        .where(eq(kycInformation.status as any, 'pending'))
        .orderBy(desc(kycInformation.submittedAt));
      
      return kycSubmissions;
    } catch (error: any) {
      if (error?.code === '42703' || error?.message?.includes('table') || error?.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  async getAllKycSubmissions(): Promise<any[]> {
    try {
      const kycSubmissions = await db
        .select({
          id: kycInformation.id,
          userId: kycInformation.userId,
          documentType: kycInformation.documentType,
          documentCountry: kycInformation.documentCountry,
          documentNumberEncrypted: kycInformation.documentNumberEncrypted,
          fullNameEncrypted: kycInformation.fullNameEncrypted,
          dateOfBirthEncrypted: kycInformation.dateOfBirthEncrypted,
          nationalityEncrypted: kycInformation.nationalityEncrypted,
          occupationEncrypted: kycInformation.occupationEncrypted,
          documentImageKeyEncrypted: kycInformation.documentImageKeyEncrypted,
          documentBackImageKeyEncrypted: kycInformation.documentBackImageKeyEncrypted,
          selfieImageKeyEncrypted: kycInformation.selfieImageKeyEncrypted,
          status: kycInformation.status,
          reviewNotes: kycInformation.reviewNotes,
          rejectionReason: kycInformation.rejectionReason,
          submittedAt: kycInformation.submittedAt,
          reviewedAt: kycInformation.reviewedAt,
          reviewedBy: kycInformation.reviewedBy,
          user: {
            id: users.id,
            username: users.username,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            city: users.city,
            state: users.state,
            country: users.country,
            postalCode: users.postalCode,
            addressEncrypted: users.addressEncrypted
          }
        })
        .from(kycInformation)
        .leftJoin(users, eq(kycInformation.userId, users.id))
        .orderBy(desc(kycInformation.submittedAt));
      
      return kycSubmissions;
    } catch (error: any) {
      if (error?.code === '42703' || error?.message?.includes('table') || error?.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  // Wallet binding operations
  async createWalletBinding(bindingData: InsertWalletBinding): Promise<WalletBinding> {
    try {
      const [binding] = await db.insert(walletBindings).values(bindingData).returning();
      return binding;
    } catch (error) {
      throw new Error('Wallet binding functionality not yet available - database schema needs migration');
    }
  }

  async getWalletBindings(userId: string): Promise<WalletBinding[]> {
    try {
      const bindings = await db.select().from(walletBindings)
        .where(eq(walletBindings.userId, userId))
        .orderBy(desc(walletBindings.createdAt));
      return bindings;
    } catch (error) {
      return [];
    }
  }

  async getWalletBinding(id: string): Promise<WalletBinding | undefined> {
    try {
      const [binding] = await db.select().from(walletBindings).where(eq(walletBindings.id, id));
      return binding;
    } catch (error) {
      return undefined;
    }
  }

  async verifyWalletBinding(id: string, verificationData: any): Promise<WalletBinding> {
    try {
      // Get the binding first to validate
      const [binding] = await db.select().from(walletBindings).where(eq(walletBindings.id, id));
      if (!binding) {
        throw new Error('Wallet binding not found');
      }

      // TODO: Add cryptographic verification here
      // For now, require verificationData to contain signature/proof
      if (!verificationData || (!verificationData.signature && !verificationData.proof)) {
        throw new Error('Cryptographic proof required for wallet verification');
      }

      const [updatedBinding] = await db.update(walletBindings)
        .set({
          bindingStatus: 'verified',
          verificationData,
          verifiedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(walletBindings.id, id))
        .returning();
      return updatedBinding;
    } catch (error: any) {
      if (error?.code === '42703' || error?.message?.includes('table') || error?.message?.includes('does not exist')) {
        throw new Error('Wallet binding functionality not yet available - database schema needs migration');
      }
      throw error; // Rethrow validation and other errors
    }
  }

  async revokeWalletBinding(id: string): Promise<WalletBinding> {
    try {
      const [binding] = await db.update(walletBindings)
        .set({
          bindingStatus: 'revoked',
          revokedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(walletBindings.id, id))
        .returning();
      return binding;
    } catch (error) {
      throw new Error('Wallet binding functionality not yet available - database schema needs migration');
    }
  }

  // MFA operations
  async storeMfaSetup(userId: string, encryptedSecret: string, backupCodes: string[]): Promise<void> {
    try {
      // Import MFAService for proper encryption/hashing
      const { MFAService } = await import('./mfa-service');
      
      // Hash backup codes before storage (security requirement)
      const hashedBackupCodes = await MFAService.hashBackupCodes(backupCodes);
      
      const result = await db.update(users)
        .set({
          mfaSecretEncrypted: encryptedSecret, // Secret should already be encrypted by caller
          mfaBackupCodesHash: JSON.stringify(hashedBackupCodes), // Store hashed codes
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      
      if (result.length === 0) {
        throw new Error('User not found or update failed');
      }
    } catch (error) {
      console.error('MFA Setup - Storage error:', {
        userId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async getMfaSetup(userId: string): Promise<{ secret: string | null, backupCodes: string[] }> {
    try {
      const [user] = await db.select({
        mfaSecretEncrypted: users.mfaSecretEncrypted,
        mfaBackupCodesHash: users.mfaBackupCodesHash
      })
      .from(users)
      .where(eq(users.id, userId));
      
      if (!user) {
        return { secret: null, backupCodes: [] };
      }
      
      // Return encrypted secret and hashed codes for verification
      // Note: secret remains encrypted, backup codes remain hashed for security
      const hashedBackupCodes = user.mfaBackupCodesHash && typeof user.mfaBackupCodesHash === 'string' 
        ? JSON.parse(user.mfaBackupCodesHash) 
        : [];
      return {
        secret: user.mfaSecretEncrypted, // Return encrypted secret for verification
        backupCodes: hashedBackupCodes // Return hashed codes for verification
      };
    } catch (error) {
      return { secret: null, backupCodes: [] };
    }
  }

  async enableMfa(userId: string): Promise<void> {
    try {
      await db.update(users)
        .set({
          mfaEnabled: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    } catch (error) {
      throw error;
    }
  }

  async disableMfa(userId: string): Promise<void> {
    try {
      await db.update(users)
        .set({
          mfaEnabled: false,
          mfaSecretEncrypted: null,
          mfaBackupCodesHash: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    } catch (error) {
      throw error;
    }
  }

  async useBackupCode(userId: string, codeToRemove: string): Promise<boolean> {
    try {
      const { MFAService } = await import('./mfa-service');
      const setup = await this.getMfaSetup(userId);
      
      if (!setup.backupCodes.length) {
        return false;
      }
      
      // Verify the backup code against hashed codes
      const isValidCode = await MFAService.verifyBackupCode(setup.backupCodes, codeToRemove);
      if (!isValidCode) {
        return false;
      }
      
      // Find and remove the used backup code from hashed codes
      const updatedHashedCodes = [];
      let codeRemoved = false;
      
      for (const hashedCode of setup.backupCodes) {
        const bcrypt = await import('bcryptjs');
        const matches = await bcrypt.compare(codeToRemove.replace(/\s/g, '').toUpperCase(), hashedCode);
        
        if (matches && !codeRemoved) {
          // Skip this code (remove it)
          codeRemoved = true;
        } else {
          // Keep this code
          updatedHashedCodes.push(hashedCode);
        }
      }
      
      await db.update(users)
        .set({
          mfaBackupCodesHash: JSON.stringify(updatedHashedCodes),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // User activity logging
  async logUserActivity(activityData: InsertUserActivityLog): Promise<UserActivityLog> {
    try {
      const [activity] = await db.insert(userActivityLog).values(activityData).returning();
      return activity;
    } catch (error) {
      // Silently fail if activity logging is not available yet
      return {
        id: 'temp-id',
        userId: activityData.userId,
        activityType: activityData.activityType,
        success: activityData.success ?? true,
        createdAt: new Date(),
        ...activityData
      } as UserActivityLog;
    }
  }

  async getUserActivityLog(userId: string, limit: number = 50): Promise<UserActivityLog[]> {
    try {
      const activities = await db.select().from(userActivityLog)
        .where(eq(userActivityLog.userId, userId))
        .orderBy(desc(userActivityLog.createdAt))
        .limit(limit);
      return activities;
    } catch (error) {
      return [];
    }
  }

  // Role management operations
  async updateUserRole(userId: string, role: string): Promise<User> {
    try {
      // Get current user to check previous role
      const currentUser = await this.getUser(userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Update role and sync isAdmin flag based on new role
      const isAdmin = (role === 'administrator');
      
      const [user] = await db.update(users)
        .set({ 
          role: role as any, 
          isAdmin: isAdmin,
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId))
        .returning();
      
      if (!user) {
        throw new Error('User not found');
      }

      // Log the role change for audit purposes
      await this.logUserActivity({
        userId,
        activityType: 'role_change',
        success: true,
        details: {
          previousRole: currentUser.role,
          newRole: role,
          isAdminFlagSet: isAdmin,
          timestamp: new Date().toISOString()
        }
      });

      console.log('Role change completed:', {
        userId,
        previousRole: currentUser.role,
        newRole: role,
        isAdminFlag: isAdmin,
        timestamp: new Date().toISOString()
      });

      return user;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const userList = await db.select().from(users)
        .where(eq(users.role as any, role))
        .orderBy(desc(users.createdAt));
      return userList;
    } catch (error) {
      console.error('Error getting users by role:', error);
      return [];
    }
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    try {
      // Try new approach with walletBindings table
      const result = await db.select({ user: users })
        .from(users)
        .innerJoin(walletBindings, eq(users.id, walletBindings.userId))
        .where(and(
          eq(walletBindings.walletAddress, walletAddress),
          eq(walletBindings.bindingStatus, 'verified')
        ));
      return result[0]?.user;
    } catch (error) {
      // Fallback to deprecated approach if walletBindings table doesn't exist
      try {
        const [user] = await db.select().from(users).where(eq(users.walletAddress as any, walletAddress));
        return user;
      } catch (fallbackError) {
        return undefined;
      }
    }
  }

  async getUserByPrincipalId(principalId: string): Promise<User | undefined> {
    try {
      // Try new approach with walletBindings table
      const result = await db.select({ user: users })
        .from(users)
        .innerJoin(walletBindings, eq(users.id, walletBindings.userId))
        .where(and(
          eq(walletBindings.principalId, principalId),
          eq(walletBindings.bindingStatus, 'verified')
        ));
      return result[0]?.user;
    } catch (error) {
      // Fallback to deprecated approach if walletBindings table doesn't exist
      try {
        const [user] = await db.select().from(users).where(eq(users.principalId as any, principalId));
        return user;
      } catch (fallbackError) {
        return undefined;
      }
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values([insertUser]).returning();
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

  async checkUserDependencies(id: string): Promise<{
    canDelete: boolean;
    dependencies: Array<{ table: string; count: number; description: string }>;
  }> {
    try {
      const dependencies: Array<{ table: string; count: number; description: string }> = [];

      // Check for financial records (these block deletion)
      const [pawnLoansResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(pawnLoans)
        .where(eq(pawnLoans.userId, id));
      
      if (pawnLoansResult.count > 0) {
        dependencies.push({
          table: 'pawn_loans',
          count: pawnLoansResult.count,
          description: `${pawnLoansResult.count} pawn loan(s)`
        });
      }

      // Check for RWA submissions
      const [submissionsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rwaSubmissions)
        .where(eq(rwaSubmissions.userId, id));
      
      if (submissionsResult.count > 0) {
        dependencies.push({
          table: 'rwa_submissions',
          count: submissionsResult.count,
          description: `${submissionsResult.count} asset submission(s)`
        });
      }

      // Check for marketplace assets (through pawn loans)
      const [assetsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(marketplaceAssets)
        .innerJoin(pawnLoans, eq(marketplaceAssets.loanId, pawnLoans.id))
        .where(eq(pawnLoans.userId, id));
      
      if (assetsResult.count > 0) {
        dependencies.push({
          table: 'marketplace_assets',
          count: assetsResult.count,
          description: `${assetsResult.count} marketplace asset(s)`
        });
      }

      // Check for active bids
      const [bidsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(bids)
        .where(eq(bids.bidderId, id));
      
      if (bidsResult.count > 0) {
        dependencies.push({
          table: 'bids',
          count: bidsResult.count,
          description: `${bidsResult.count} marketplace bid(s)`
        });
      }

      return {
        canDelete: dependencies.length === 0,
        dependencies
      };
    } catch (error) {
      console.error('Error checking user dependencies:', error);
      return {
        canDelete: false,
        dependencies: [{ table: 'unknown', count: 1, description: 'Unable to check dependencies' }]
      };
    }
  }

  async deleteUser(id: string): Promise<{ success: boolean; error?: string; dependencies?: Array<{ table: string; count: number; description: string }> }> {
    try {
      // First check if user exists
      const existingUser = await this.getUser(id);
      if (!existingUser) {
        return { success: false, error: 'User not found' };
      }

      // Check for dependencies that prevent deletion
      const dependencyCheck = await this.checkUserDependencies(id);
      if (!dependencyCheck.canDelete) {
        return {
          success: false,
          error: 'Cannot delete user with existing financial records',
          dependencies: dependencyCheck.dependencies
        };
      }

      // Safe to delete - only delete if no financial dependencies
      await db.delete(users).where(eq(users.id, id));
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async upsertUser(userData: any): Promise<User> {
    try {
      // First, check if user exists by ID to preserve admin status
      const existingUserById = await this.getUser(userData.id);
      
      // Also check if user exists by email (for OAuth scenarios)
      const existingUserByEmail = userData.email ? await this.getUserByEmail(userData.email) : null;
      
      // If email exists but with different ID, update that existing user's ID and data
      if (existingUserByEmail && existingUserByEmail.id !== userData.id) {
        console.log(`Updating existing user ${existingUserByEmail.id} data without changing ID to preserve foreign key relationships`);
        const [user] = await db
          .update(users)
          .set({
            // DO NOT UPDATE ID - this would break foreign key constraints
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            // Preserve existing admin status and other data
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        
        console.log(`User ${userData.id} upserted (email merge) - admin status: ${user.isAdmin}`);
        return user;
      }
      
      // Standard upsert by ID
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
            // Preserve existing admin status - CRITICAL for admin functionality
            isAdmin: existingUserById?.isAdmin ?? false,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      console.log(`User ${userData.id} upserted - admin status: ${user.isAdmin}`);
      return user;
    } catch (error: any) {
      console.error('Error in upsertUser:', {
        userData,
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }

  // RWA Submission operations
  async createRwaSubmission(submission: InsertRwaSubmission): Promise<RwaSubmission> {
    const [rwaSubmission] = await db.insert(rwaSubmissions).values([submission]).returning();
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
    const [pawnLoan] = await db.insert(pawnLoans).values([loan]).returning();
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
    const [marketplaceAsset] = await db.insert(marketplaceAssets).values([asset]).returning();
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
    const [newBid] = await db.insert(bids).values([bid]).returning();
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
    const [newTransaction] = await db.insert(transactions).values([transaction]).returning();
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
    const [bridgeTransaction] = await db.insert(bridgeTransactions).values([bridge]).returning();
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
      query = query.where(and(...conditions)) as any;
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
      const lastUpdated = cached.lastUpdated ? new Date(cached.lastUpdated).getTime() : 0;
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
    const [pricingEstimate] = await db.insert(pricingEstimates).values([estimate]).returning();
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
    const [newDocument] = await db.insert(documents).values([document]).returning();
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
    const [analysisResult] = await db.insert(documentAnalysisResults).values([result]).returning();
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
    const [fraudResult] = await db.insert(fraudDetectionResults).values([result]).returning();
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
    const [newVerification] = await db.insert(documentVerifications).values([verification]).returning();
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
    const [newQueueItem] = await db.insert(documentAnalysisQueue).values([queueItem]).returning();
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
    const [newTemplate] = await db.insert(documentTemplates).values([template]).returning();
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
      .orderBy(desc(documents.createdAt)) as any;
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
      query = query.where(and(...conditions)) as any;
      countQuery = countQuery.where(and(...conditions)) as any;
    }

    // Add risk level filter if specified (requires join with fraud detection results)
    if (filters.riskLevel) {
      query = (query.innerJoin(fraudDetectionResults, eq(documents.id, fraudDetectionResults.documentId)) as any)
        .where(eq(fraudDetectionResults.riskLevel, filters.riskLevel));
      countQuery = (countQuery.innerJoin(fraudDetectionResults, eq(documents.id, fraudDetectionResults.documentId)) as any)
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

  // Admin Action operations
  async createAdminAction(action: InsertAdminAction): Promise<AdminAction> {
    const [newAction] = await db.insert(adminActions).values([action]).returning();
    return newAction;
  }

  async getAdminActions(filters: AdminDashboardFilters): Promise<{ actions: AdminAction[]; totalCount: number }> {
    let query = db.select().from(adminActions);
    let countQuery = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(adminActions);
    
    const conditions = [];
    
    if (filters.dateFrom) {
      conditions.push(gte(adminActions.createdAt, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lt(adminActions.createdAt, new Date(filters.dateTo)));
    }
    if (filters.severity) {
      conditions.push(eq(adminActions.severity, filters.severity));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    const [countResult] = await countQuery;
    const totalCount = countResult?.count || 0;

    const actions = await query
      .orderBy(desc(adminActions.createdAt))
      .limit(filters.limit || 20)
      .offset(filters.offset || 0);

    return { actions, totalCount };
  }

  async getAdminActionsByType(actionType: string): Promise<AdminAction[]> {
    return await db.select().from(adminActions)
      .where(eq(adminActions.actionType, actionType))
      .orderBy(desc(adminActions.createdAt));
  }

  async getAdminActionsByTarget(targetType: string, targetId: string): Promise<AdminAction[]> {
    return await db.select().from(adminActions)
      .where(and(
        eq(adminActions.targetType, targetType),
        eq(adminActions.targetId, targetId)
      ))
      .orderBy(desc(adminActions.createdAt));
  }

  // Fraud Alert operations
  async createFraudAlert(alert: InsertFraudAlert): Promise<FraudAlert> {
    const [newAlert] = await db.insert(fraudAlerts).values([alert]).returning();
    return newAlert;
  }

  async getFraudAlert(id: string): Promise<FraudAlert | undefined> {
    const [alert] = await db.select().from(fraudAlerts).where(eq(fraudAlerts.id, id));
    return alert || undefined;
  }

  async getFraudAlerts(filters: AdminDashboardFilters): Promise<{ alerts: FraudAlert[]; totalCount: number }> {
    let query = db.select().from(fraudAlerts);
    let countQuery = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(fraudAlerts);
    
    const conditions = [];
    
    if (filters.dateFrom) {
      conditions.push(gte(fraudAlerts.createdAt, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lt(fraudAlerts.createdAt, new Date(filters.dateTo)));
    }
    if (filters.status) {
      conditions.push(eq(fraudAlerts.status, filters.status));
    }
    if (filters.severity) {
      conditions.push(eq(fraudAlerts.severity, filters.severity));
    }
    if (filters.assignedTo) {
      conditions.push(eq(fraudAlerts.assignedTo, filters.assignedTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    const [countResult] = await countQuery;
    const totalCount = countResult?.count || 0;

    const alerts = await query
      .orderBy(desc(fraudAlerts.createdAt))
      .limit(filters.limit || 20)
      .offset(filters.offset || 0);

    return { alerts, totalCount };
  }

  async updateFraudAlert(id: string, updates: Partial<FraudAlert>): Promise<FraudAlert> {
    const updateData = { ...updates, updatedAt: new Date() };
    
    if (updates.status === 'resolved' && !updates.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    const [alert] = await db
      .update(fraudAlerts)
      .set(updateData)
      .where(eq(fraudAlerts.id, id))
      .returning();
    return alert;
  }

  async getFraudAlertsByUser(userId: string): Promise<FraudAlert[]> {
    return await db.select().from(fraudAlerts)
      .where(eq(fraudAlerts.userId, userId))
      .orderBy(desc(fraudAlerts.createdAt));
  }

  async getFraudAlertsByStatus(status: string): Promise<FraudAlert[]> {
    return await db.select().from(fraudAlerts)
      .where(eq(fraudAlerts.status, status))
      .orderBy(desc(fraudAlerts.createdAt));
  }

  async getFraudAlertsByRiskScore(minScore: number): Promise<FraudAlert[]> {
    return await db.select().from(fraudAlerts)
      .where(gte(fraudAlerts.riskScore, minScore.toString()))
      .orderBy(desc(fraudAlerts.riskScore), desc(fraudAlerts.createdAt));
  }

  // Asset Review operations
  async createAssetReview(review: InsertAssetReview): Promise<AssetReview> {
    const [newReview] = await db.insert(assetReviews).values([review]).returning();
    return newReview;
  }

  async getAssetReview(id: string): Promise<AssetReview | undefined> {
    const [review] = await db.select().from(assetReviews).where(eq(assetReviews.id, id));
    return review || undefined;
  }

  async getAssetReviews(filters: AdminDashboardFilters): Promise<{ reviews: AssetReview[]; totalCount: number }> {
    let query = db.select().from(assetReviews);
    let countQuery = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(assetReviews);
    
    const conditions = [];
    
    if (filters.dateFrom) {
      conditions.push(gte(assetReviews.createdAt, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lt(assetReviews.createdAt, new Date(filters.dateTo)));
    }
    if (filters.status) {
      conditions.push(eq(assetReviews.status, filters.status));
    }
    if (filters.assignedTo) {
      conditions.push(eq(assetReviews.assignedTo, filters.assignedTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    const [countResult] = await countQuery;
    const totalCount = countResult?.count || 0;

    const reviews = await query
      .orderBy(desc(assetReviews.createdAt))
      .limit(filters.limit || 20)
      .offset(filters.offset || 0);

    return { reviews, totalCount };
  }

  async updateAssetReview(id: string, updates: Partial<AssetReview>): Promise<AssetReview> {
    const updateData = { ...updates, updatedAt: new Date() };
    
    if (updates.status === 'completed' && !updates.completedAt) {
      updateData.completedAt = new Date();
    }
    if (updates.status === 'in_progress' && !updates.startedAt) {
      updateData.startedAt = new Date();
    }

    const [review] = await db
      .update(assetReviews)
      .set(updateData)
      .where(eq(assetReviews.id, id))
      .returning();
    return review;
  }

  async getAssetReviewsBySubmission(submissionId: string): Promise<AssetReview[]> {
    return await db.select().from(assetReviews)
      .where(eq(assetReviews.submissionId, submissionId))
      .orderBy(desc(assetReviews.createdAt));
  }

  async getAssetReviewsByStatus(status: string): Promise<AssetReview[]> {
    return await db.select().from(assetReviews)
      .where(eq(assetReviews.status, status))
      .orderBy(desc(assetReviews.createdAt));
  }

  async getAssetReviewsByAssignee(assignedTo: string): Promise<AssetReview[]> {
    return await db.select().from(assetReviews)
      .where(eq(assetReviews.assignedTo, assignedTo))
      .orderBy(desc(assetReviews.createdAt));
  }

  // User Flag operations
  async createUserFlag(flag: InsertUserFlag): Promise<UserFlag> {
    const [newFlag] = await db.insert(userFlags).values([flag]).returning();
    return newFlag;
  }

  async getUserFlag(id: string): Promise<UserFlag | undefined> {
    const [flag] = await db.select().from(userFlags).where(eq(userFlags.id, id));
    return flag || undefined;
  }

  async getUserFlags(filters: AdminDashboardFilters): Promise<{ flags: UserFlag[]; totalCount: number }> {
    let query = db.select().from(userFlags);
    let countQuery = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(userFlags);
    
    const conditions = [];
    
    if (filters.dateFrom) {
      conditions.push(gte(userFlags.createdAt, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lt(userFlags.createdAt, new Date(filters.dateTo)));
    }
    if (filters.status) {
      conditions.push(eq(userFlags.status, filters.status));
    }
    if (filters.severity) {
      conditions.push(eq(userFlags.severity, filters.severity));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    const [countResult] = await countQuery;
    const totalCount = countResult?.count || 0;

    const flags = await query
      .orderBy(desc(userFlags.createdAt))
      .limit(filters.limit || 20)
      .offset(filters.offset || 0);

    return { flags, totalCount };
  }

  async updateUserFlag(id: string, updates: Partial<UserFlag>): Promise<UserFlag> {
    const updateData = { ...updates, updatedAt: new Date() };
    
    if (updates.status === 'resolved' && !updates.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    const [flag] = await db
      .update(userFlags)
      .set(updateData)
      .where(eq(userFlags.id, id))
      .returning();
    return flag;
  }

  async getUserFlagsByUser(userId: string): Promise<UserFlag[]> {
    return await db.select().from(userFlags)
      .where(eq(userFlags.userId, userId))
      .orderBy(desc(userFlags.createdAt));
  }

  async getUserFlagsByStatus(status: string): Promise<UserFlag[]> {
    return await db.select().from(userFlags)
      .where(eq(userFlags.status, status))
      .orderBy(desc(userFlags.createdAt));
  }

  async getActiveUserFlags(): Promise<UserFlag[]> {
    return await db.select().from(userFlags)
      .where(eq(userFlags.status, 'active'))
      .orderBy(desc(userFlags.createdAt));
  }

  // Performance Metrics operations
  async createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const [newMetric] = await db.insert(performanceMetrics).values([metric]).returning();
    return newMetric;
  }

  async getPerformanceMetrics(filters: AdminDashboardFilters): Promise<{ metrics: PerformanceMetric[]; totalCount: number }> {
    let query = db.select().from(performanceMetrics);
    let countQuery = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(performanceMetrics);
    
    const conditions = [];
    
    if (filters.dateFrom) {
      conditions.push(gte(performanceMetrics.periodStart, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lt(performanceMetrics.periodEnd, new Date(filters.dateTo)));
    }
    if (filters.category) {
      conditions.push(eq(performanceMetrics.category, filters.category));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    const [countResult] = await countQuery;
    const totalCount = countResult?.count || 0;

    const metrics = await query
      .orderBy(desc(performanceMetrics.calculatedAt))
      .limit(filters.limit || 20)
      .offset(filters.offset || 0);

    return { metrics, totalCount };
  }

  async getPerformanceMetricsByType(metricType: string): Promise<PerformanceMetric[]> {
    return await db.select().from(performanceMetrics)
      .where(eq(performanceMetrics.metricType, metricType))
      .orderBy(desc(performanceMetrics.calculatedAt));
  }

  async getPerformanceMetricsByCategory(category: string): Promise<PerformanceMetric[]> {
    return await db.select().from(performanceMetrics)
      .where(eq(performanceMetrics.category, category))
      .orderBy(desc(performanceMetrics.calculatedAt));
  }

  async getLatestPerformanceMetrics(limit: number = 50): Promise<PerformanceMetric[]> {
    return await db.select().from(performanceMetrics)
      .orderBy(desc(performanceMetrics.calculatedAt))
      .limit(limit);
  }

  // Enhanced Admin Statistics
  async getEnhancedAdminStats(): Promise<{
    overview: {
      pendingApprovals: number;
      activeLoans: number;
      expiringSoon: number;
      totalRevenue: string;
      monthlyGrowth: string;
      userCount: number;
      avgLoanValue: string;
    };
    security: {
      openFraudAlerts: number;
      criticalAlerts: number;
      flaggedUsers: number;
      suspiciousDocuments: number;
      fraudPrevented: string;
    };
    operations: {
      pendingDocuments: number;
      processingDocuments: number;
      completedToday: number;
      avgProcessingTime: number;
      manualReviewRequired: number;
    };
    bridge: {
      activeTransactions: number;
      completedToday: number;
      failedTransactions: number;
      totalVolume: string;
      avgProcessingTime: number;
    };
  }> {
    // Overview metrics
    const [pendingApprovalsResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(rwaSubmissions)
      .where(eq(rwaSubmissions.status, "pending"));

    const [activeLoansResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(pawnLoans)
      .where(eq(pawnLoans.status, "active"));

    const expiringCutoff = new Date();
    expiringCutoff.setDate(expiringCutoff.getDate() + 7);
    const [expiringSoonResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(pawnLoans)
      .where(and(
        eq(pawnLoans.status, "active"),
        lt(pawnLoans.expiryDate, expiringCutoff)
      ));

    const [totalRevenueResult] = await db
      .select({ total: sql<string>`cast(coalesce(sum(fee_amount), 0) as text)` })
      .from(pawnLoans);

    const [userCountResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(users);

    const [avgLoanValueResult] = await db
      .select({ avg: sql<string>`cast(coalesce(avg(loan_amount), 0) as text)` })
      .from(pawnLoans)
      .where(eq(pawnLoans.status, "active"));

    // Security metrics
    const [openFraudAlertsResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(fraudAlerts)
      .where(eq(fraudAlerts.status, "open"));

    const [criticalAlertsResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(fraudAlerts)
      .where(eq(fraudAlerts.severity, "critical"));

    const [flaggedUsersResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(userFlags)
      .where(eq(userFlags.status, "active"));

    const [suspiciousDocumentsResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(fraudDetectionResults)
      .where(eq(fraudDetectionResults.riskLevel, "high"));

    // Operations metrics
    const [pendingDocumentsResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(documents)
      .where(eq(documents.analysisStatus, "pending"));

    const [processingDocumentsResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(documents)
      .where(eq(documents.analysisStatus, "processing"));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [completedTodayResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(documents)
      .where(and(
        eq(documents.analysisStatus, "completed"),
        gte(documents.updatedAt, todayStart)
      ));

    const [manualReviewRequiredResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(fraudDetectionResults)
      .where(eq(fraudDetectionResults.requiresManualReview, true));

    // Bridge metrics
    const [activeBridgeResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(bridgeTransactions)
      .where(eq(bridgeTransactions.status, "processing"));

    const [completedBridgeTodayResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(bridgeTransactions)
      .where(and(
        eq(bridgeTransactions.status, "completed"),
        gte(bridgeTransactions.completedAt, todayStart)
      ));

    const [failedBridgeResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(bridgeTransactions)
      .where(eq(bridgeTransactions.status, "failed"));

    const [totalVolumeResult] = await db
      .select({ total: sql<string>`cast(coalesce(sum(amount), 0) as text)` })
      .from(bridgeTransactions)
      .where(eq(bridgeTransactions.status, "completed"));

    return {
      overview: {
        pendingApprovals: pendingApprovalsResult?.count || 0,
        activeLoans: activeLoansResult?.count || 0,
        expiringSoon: expiringSoonResult?.count || 0,
        totalRevenue: totalRevenueResult?.total || "0",
        monthlyGrowth: "12.5", // TODO: Calculate actual monthly growth
        userCount: userCountResult?.count || 0,
        avgLoanValue: avgLoanValueResult?.avg || "0",
      },
      security: {
        openFraudAlerts: openFraudAlertsResult?.count || 0,
        criticalAlerts: criticalAlertsResult?.count || 0,
        flaggedUsers: flaggedUsersResult?.count || 0,
        suspiciousDocuments: suspiciousDocumentsResult?.count || 0,
        fraudPrevented: "45000", // TODO: Calculate actual fraud prevented amount
      },
      operations: {
        pendingDocuments: pendingDocumentsResult?.count || 0,
        processingDocuments: processingDocumentsResult?.count || 0,
        completedToday: completedTodayResult?.count || 0,
        avgProcessingTime: 245, // TODO: Calculate actual average processing time
        manualReviewRequired: manualReviewRequiredResult?.count || 0,
      },
      bridge: {
        activeTransactions: activeBridgeResult?.count || 0,
        completedToday: completedBridgeTodayResult?.count || 0,
        failedTransactions: failedBridgeResult?.count || 0,
        totalVolume: totalVolumeResult?.total || "0",
        avgProcessingTime: 420, // TODO: Calculate actual average processing time
      },
    };
  }

  // RWAPAWN Token operations implementation
  async createRwapawnPurchase(purchase: InsertRwapawnPurchase): Promise<RwapawnPurchase> {
    const [result] = await db.insert(rwapawnPurchases).values([purchase]).returning();
    return result;
  }

  async getRwapawnPurchase(id: string): Promise<RwapawnPurchase | undefined> {
    const [purchase] = await db.select().from(rwapawnPurchases).where(eq(rwapawnPurchases.id, id));
    return purchase || undefined;
  }

  async getRwapawnPurchasesByUser(userId: string): Promise<RwapawnPurchase[]> {
    return await db.select()
      .from(rwapawnPurchases)
      .where(eq(rwapawnPurchases.userId, userId))
      .orderBy(desc(rwapawnPurchases.createdAt));
  }

  async updateRwapawnPurchaseStatus(id: string, status: string): Promise<RwapawnPurchase> {
    const [purchase] = await db
      .update(rwapawnPurchases)
      .set({ status })
      .where(eq(rwapawnPurchases.id, id))
      .returning();
    return purchase;
  }

  async createRwapawnStake(stake: InsertRwapawnStake): Promise<RwapawnStake> {
    const [result] = await db.insert(rwapawnStakes).values([stake]).returning();
    return result;
  }

  async getRwapawnStake(id: string): Promise<RwapawnStake | undefined> {
    const [stake] = await db.select().from(rwapawnStakes).where(eq(rwapawnStakes.id, id));
    return stake || undefined;
  }

  async getRwapawnStakesByUser(userId: string): Promise<RwapawnStake[]> {
    return await db.select()
      .from(rwapawnStakes)
      .where(eq(rwapawnStakes.userId, userId))
      .orderBy(desc(rwapawnStakes.startDate));
  }

  async updateRwapawnStakeStatus(id: string, status: string): Promise<RwapawnStake> {
    const [stake] = await db
      .update(rwapawnStakes)
      .set({ status })
      .where(eq(rwapawnStakes.id, id))
      .returning();
    return stake;
  }

  async createRwapawnSwap(swap: InsertRwapawnSwap): Promise<RwapawnSwap> {
    const [result] = await db.insert(rwapawnSwaps).values([swap]).returning();
    return result;
  }

  async getRwapawnSwap(id: string): Promise<RwapawnSwap | undefined> {
    const [swap] = await db.select().from(rwapawnSwaps).where(eq(rwapawnSwaps.id, id));
    return swap || undefined;
  }

  async getRwapawnSwapsByUser(userId: string): Promise<RwapawnSwap[]> {
    return await db.select()
      .from(rwapawnSwaps)
      .where(eq(rwapawnSwaps.userId, userId))
      .orderBy(desc(rwapawnSwaps.createdAt));
  }

  async updateRwapawnSwapStatus(id: string, status: string): Promise<RwapawnSwap> {
    const [swap] = await db
      .update(rwapawnSwaps)
      .set({ status })
      .where(eq(rwapawnSwaps.id, id))
      .returning();
    return swap;
  }

  async getRwapawnBalance(userId: string): Promise<RwapawnBalance | undefined> {
    const [balance] = await db.select().from(rwapawnBalances).where(eq(rwapawnBalances.userId, userId));
    return balance || undefined;
  }

  async createRwapawnBalance(balance: InsertRwapawnBalance): Promise<RwapawnBalance> {
    const [result] = await db.insert(rwapawnBalances).values([balance]).returning();
    return result;
  }

  async updateRwapawnBalance(userId: string, updates: Partial<RwapawnBalance>): Promise<RwapawnBalance> {
    const [balance] = await db
      .update(rwapawnBalances)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(rwapawnBalances.userId, userId))
      .returning();
    return balance;
  }

  async addTokensToBalance(userId: string, amount: number): Promise<RwapawnBalance> {
    // First, try to get existing balance
    let balance = await this.getRwapawnBalance(userId);
    
    if (!balance) {
      // Create new balance if doesn't exist
      balance = await this.createRwapawnBalance({
        userId,
        availableTokens: amount,
        stakedTokens: 0,
        pendingTokens: 0,
        totalTokens: amount
      });
    } else {
      // Update existing balance
      const newAvailable = parseFloat(balance.availableTokens) + amount;
      const newTotal = parseFloat(balance.totalTokens) + amount;
      
      balance = await this.updateRwapawnBalance(userId, {
        availableTokens: newAvailable.toString(),
        totalTokens: newTotal.toString()
      });
    }
    
    return balance;
  }

  // Form submission operations
  async createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    const [result] = await db.insert(formSubmissions).values([submission]).returning();
    return result;
  }

  async getFormSubmission(id: string): Promise<FormSubmission | undefined> {
    const [submission] = await db.select().from(formSubmissions).where(eq(formSubmissions.id, id));
    return submission || undefined;
  }

  async getAllFormSubmissions(limit: number = 100, offset: number = 0, filters: any = {}): Promise<FormSubmission[]> {
    let query = db.select().from(formSubmissions);
    
    if (filters.status) {
      query = query.where(eq(formSubmissions.status, filters.status)) as any;
    }
    
    if (filters.formType) {
      query = query.where(eq(formSubmissions.formType, filters.formType)) as any;
    }
    
    return await query
      .orderBy(desc(formSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getFormSubmissionCount(filters: any = {}): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)::int` }).from(formSubmissions);
    
    if (filters.status) {
      query = query.where(eq(formSubmissions.status, filters.status)) as any;
    }
    
    if (filters.formType) {
      query = query.where(eq(formSubmissions.formType, filters.formType)) as any;
    }
    
    const [result] = await query;
    return result?.count || 0;
  }

  async updateFormSubmissionStatus(id: string, status: string, responseNotes?: string, assignedTo?: string): Promise<FormSubmission> {
    const updates: any = { 
      status,
      updatedAt: new Date()
    };
    
    if (responseNotes !== undefined) {
      updates.responseNotes = responseNotes;
    }
    
    if (assignedTo !== undefined) {
      updates.assignedTo = assignedTo;
    }
    
    if (status === 'resolved' || status === 'closed') {
      updates.resolvedAt = new Date();
    }
    
    const [submission] = await db
      .update(formSubmissions)
      .set(updates)
      .where(eq(formSubmissions.id, id))
      .returning();
    return submission;
  }
}

export const storage = new DatabaseStorage();
