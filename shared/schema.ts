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

// Blockchain transactions table (mock ICP transactions)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // fee_payment, loan_disbursement, redemption_payment, bid_payment
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("ICP"),
  txHash: text("tx_hash").notNull(),
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
});

export const insertBridgeTransactionSchema = createInsertSchema(bridgeTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
