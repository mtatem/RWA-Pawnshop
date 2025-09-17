import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, numeric, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table (updated for Replit Auth compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address"),
  principalId: text("principal_id").unique(), // ICP wallet principal ID for real blockchain integration
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// RWA submissions table
export const rwaSubmissions = pgTable("rwa_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  assetName: text("asset_name").notNull(),
  category: text("category").notNull(),
  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  walletAddress: text("wallet_address").notNull(),
  coaUrl: text("coa_url"),
  nftUrl: text("nft_url"),
  physicalDocsUrl: text("physical_docs_url"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  adminNotes: text("admin_notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Active pawn loans table
export const pawnLoans = pgTable("pawn_loans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => rwaSubmissions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  loanAmount: numeric("loan_amount", { precision: 12, scale: 2 }).notNull(),
  assetValue: numeric("asset_value", { precision: 12, scale: 2 }).notNull(),
  feeAmount: numeric("fee_amount", { precision: 12, scale: 2 }).notNull().default("2.00"),
  startDate: timestamp("start_date").defaultNow(),
  expiryDate: timestamp("expiry_date").notNull(),
  status: text("status").notNull().default("active"), // active, redeemed, expired
  redeemedAt: timestamp("redeemed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Marketplace assets (expired/unredeemed items)
export const marketplaceAssets = pgTable("marketplace_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loanId: varchar("loan_id").notNull().references(() => pawnLoans.id),
  assetName: text("asset_name").notNull(),
  category: text("category").notNull(),
  originalValue: numeric("original_value", { precision: 12, scale: 2 }).notNull(),
  startingPrice: numeric("starting_price", { precision: 12, scale: 2 }).notNull(),
  currentBid: numeric("current_bid", { precision: 12, scale: 2 }),
  highestBidder: varchar("highest_bidder").references(() => users.id),
  imageUrl: text("image_url"),
  description: text("description"),
  daysExpired: integer("days_expired").notNull(),
  status: text("status").notNull().default("available"), // available, sold
  soldAt: timestamp("sold_at"),
  soldPrice: numeric("sold_price", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bids table
export const bids = pgTable("bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => marketplaceAssets.id),
  bidderId: varchar("bidder_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Blockchain transactions table (real ICP transactions)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // fee_payment, loan_disbursement, redemption_payment, bid_payment
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("ICP"),
  network: text("network").notNull().default("ICP"), // support multi-chain transactions
  txHash: text("tx_hash"), // nullable to allow payment intent creation before confirmation
  memo: text("memo"), // ICP transaction memo for verification
  blockHeight: text("block_height"), // text type to handle 64-bit ICP block heights safely
  status: text("status").notNull().default("pending"), // pending, confirmed, failed
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bridge transactions table
export const bridgeTransactions = pgTable("bridge_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sourceChain: text("source_chain").notNull(),
  destinationChain: text("destination_chain").notNull().default("ICP"),
  sourceAddress: text("source_address").notNull(),
  destinationAddress: text("destination_address").notNull(),
  contractAddress: text("contract_address"),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  bridgeFee: numeric("bridge_fee", { precision: 12, scale: 2 }).notNull().default("0.5"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  sourceTxHash: text("source_tx_hash"),
  destinationTxHash: text("destination_tx_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRwaSubmissionSchema = createInsertSchema(rwaSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
});

export const insertPawnLoanSchema = createInsertSchema(pawnLoans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startDate: true,
  redeemedAt: true,
});

export const insertMarketplaceAssetSchema = createInsertSchema(marketplaceAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  soldAt: true,
});

export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  txHash: true, // omit nullable txHash - will be set after blockchain confirmation
});

export const insertBridgeTransactionSchema = createInsertSchema(bridgeTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Secure wallet binding schemas  
export const walletBindIntentSchema = z.object({
  walletType: z.enum(['plug', 'internetIdentity']),
});

export const walletBindVerificationSchema = z.object({
  principalId: z.string().min(1, "Principal ID is required"),
  nonce: z.string().min(1, "Nonce is required"),
  walletType: z.enum(['plug', 'internetIdentity']),
  // For Plug: signature + publicKey required. For II: delegation proof
  proof: z.string().optional(), // For Internet Identity delegation
  signature: z.string().optional(), // For Plug signature
  publicKey: z.string().optional(), // Required for Plug verification
}).superRefine((data, ctx) => {
  if (data.walletType === 'plug') {
    if (!data.signature) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Signature is required for Plug wallet verification",
        path: ['signature']
      });
    }
    if (!data.publicKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Public key is required for Plug wallet verification",
        path: ['publicKey']
      });
    }
  } else if (data.walletType === 'internetIdentity') {
    if (!data.proof) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Delegation proof is required for Internet Identity verification",
        path: ['proof']
      });
    }
  }
});

// User update schema with validation (secure replacement for any type)
export const userUpdateSchema = z.object({
  principalId: z.string().regex(/^[a-z0-9-]+$/, "Invalid principal ID format").min(1).optional(),
  walletAddress: z.string().min(1).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  profileImageUrl: z.string().url().optional(),
}).strict(); // Prevents additional properties

// Payment intent schemas
export const paymentIntentSchema = z.object({
  type: z.enum(['fee_payment', 'redemption_payment', 'bid_payment']),
  amount: z.string().regex(/^\d+(\.\d{1,8})?$/, "Invalid amount format"),
  metadata: z.record(z.any()).optional(),
});

// Asset pricing cache table for efficient lookups
export const assetPricingCache = pgTable("asset_pricing_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // crypto, precious_metals, jewelry, electronics, collectibles
  symbol: text("symbol"), // For crypto: BTC, ETH, ICP. For metals: XAU, XAG, XPT
  itemType: text("item_type"), // For physical: rolex_watch, diamond_ring, gold_coin
  specifications: jsonb("specifications"), // Item-specific data: weight, purity, model, etc.
  medianPrice: numeric("median_price", { precision: 15, scale: 2 }).notNull(),
  p25Price: numeric("p25_price", { precision: 15, scale: 2 }),
  p75Price: numeric("p75_price", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  sources: text("sources").array().notNull(), // Array of pricing sources used
  confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull(), // 0-1 confidence score
  lastUpdated: timestamp("last_updated").defaultNow(),
  ttlSeconds: integer("ttl_seconds").notNull().default(300), // Time to live in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

// Pricing estimates linked to RWA submissions for audit trail
export const pricingEstimates = pgTable("pricing_estimates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").references(() => rwaSubmissions.id),
  category: text("category").notNull(),
  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }).notNull(),
  confidenceScore: numeric("confidence_score", { precision: 3, scale: 2 }),
  priceRange: jsonb("price_range"), // { min, max, median }
  methodology: text("methodology"), // Description of how price was estimated
  sources: text("sources").array(), // Sources used for this estimate
  metadata: jsonb("metadata"), // Additional pricing context
  validAt: timestamp("valid_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for pricing tables
export const insertAssetPricingCacheSchema = createInsertSchema(assetPricingCache).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
});

export const insertPricingEstimateSchema = createInsertSchema(pricingEstimates).omit({
  id: true,
  createdAt: true,
});

// Pricing query schemas for API validation
export const pricingQuerySchema = z.object({
  category: z.enum(['crypto', 'precious_metals', 'jewelry', 'electronics', 'collectibles', 'artwork', 'watches']),
  symbol: z.string().optional(), // For crypto/metals
  itemType: z.string().optional(), // For physical items
  specifications: z.record(z.any()).optional(), // Item-specific data
  forceRefresh: z.boolean().default(false), // Force fresh API call
});

// Pricing response schema
export const pricingResponseSchema = z.object({
  median: z.number(),
  p25: z.number().optional(),
  p75: z.number().optional(),
  currency: z.string(),
  sources: z.array(z.string()),
  confidence: z.number(),
  timestamp: z.string(),
  methodology: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RwaSubmission = typeof rwaSubmissions.$inferSelect;
export type InsertRwaSubmission = z.infer<typeof insertRwaSubmissionSchema>;
export type PawnLoan = typeof pawnLoans.$inferSelect;
export type InsertPawnLoan = z.infer<typeof insertPawnLoanSchema>;
export type MarketplaceAsset = typeof marketplaceAssets.$inferSelect;
export type InsertMarketplaceAsset = z.infer<typeof insertMarketplaceAssetSchema>;
export type Bid = typeof bids.$inferSelect;
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type BridgeTransaction = typeof bridgeTransactions.$inferSelect;
export type InsertBridgeTransaction = z.infer<typeof insertBridgeTransactionSchema>;

// Pricing types
export type AssetPricingCache = typeof assetPricingCache.$inferSelect;
export type InsertAssetPricingCache = z.infer<typeof insertAssetPricingCacheSchema>;
export type PricingEstimate = typeof pricingEstimates.$inferSelect;
export type InsertPricingEstimate = z.infer<typeof insertPricingEstimateSchema>;
export type PricingQuery = z.infer<typeof pricingQuerySchema>;
export type PricingResponse = z.infer<typeof pricingResponseSchema>;
