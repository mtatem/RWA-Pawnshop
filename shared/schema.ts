import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, numeric, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import validation utilities
// Note: For production, these would be imported from a shared validation module
const sanitizeText = (input: string, maxLength: number = 1000): string => {
  return input.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').substring(0, maxLength);
};

const isValidPrincipalId = (principal: string): boolean => {
  if (!principal || typeof principal !== 'string') return false;
  const cleanPrincipal = principal.replace(/-/g, '');
  if (cleanPrincipal.length < 5 || cleanPrincipal.length > 63) return false;
  return /^[a-z2-7]+$/i.test(cleanPrincipal);
};

const isValidEthereumAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  const cleanAddress = address.toLowerCase().replace('0x', '');
  return /^[0-9a-f]{40}$/.test(cleanAddress);
};

const isValidAccountId = (accountId: string): boolean => {
  return /^[0-9a-fA-F]{64}$/.test(accountId);
};

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

// Users table (updated for Replit Auth compatibility + traditional auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Replit Auth fields
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Traditional auth fields (optional - for users who prefer username/password)
  username: varchar("username").unique(),
  passwordHash: varchar("password_hash"), // bcrypt hash for traditional login
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  // Profile and wallet fields
  walletAddress: text("wallet_address"),
  principalId: text("principal_id").unique(), // ICP wallet principal ID
  phone: varchar("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country").default("US"),
  postalCode: varchar("postal_code"),
  // Account status and verification
  accountStatus: varchar("account_status").default("active"), // active, suspended, banned, restricted
  verificationStatus: varchar("verification_status").default("unverified"), // unverified, pending, verified, rejected
  kycStatus: varchar("kyc_status").default("not_started"), // not_started, in_progress, completed, failed
  riskLevel: varchar("risk_level").default("low"), // low, medium, high, critical
  // Security and admin
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: varchar("mfa_secret"), // TOTP secret for authenticator apps
  backupCodes: jsonb("backup_codes"), // Array of backup codes
  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// KYC Information table
export const kycInformation = pgTable("kyc_information", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentType: varchar("document_type").notNull(), // passport, drivers_license, national_id
  documentNumber: varchar("document_number").notNull(),
  documentCountry: varchar("document_country").notNull(),
  documentImageUrl: text("document_image_url"),
  documentBackImageUrl: text("document_back_image_url"),
  selfieImageUrl: text("selfie_image_url"),
  fullName: varchar("full_name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  nationality: varchar("nationality").notNull(),
  occupation: varchar("occupation"),
  sourceOfFunds: text("source_of_funds"),
  annualIncome: varchar("annual_income"),
  status: varchar("status").default("pending"), // pending, approved, rejected, needs_review
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet bindings table
export const walletBindings = pgTable("wallet_bindings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  walletType: varchar("wallet_type").notNull(), // plug, internetIdentity, metamask, ledger
  walletAddress: text("wallet_address").notNull(),
  principalId: text("principal_id"), // For ICP wallets
  bindingStatus: varchar("binding_status").default("pending"), // pending, verified, revoked
  verificationMethod: varchar("verification_method"), // signature, delegation_proof
  bindingProof: text("binding_proof"), // Signature or delegation proof
  verificationData: jsonb("verification_data"), // Additional verification metadata
  verifiedAt: timestamp("verified_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// MFA tokens and backup codes
export const mfaTokens = pgTable("mfa_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tokenType: varchar("token_type").notNull(), // totp, backup_code, sms
  tokenValue: varchar("token_value").notNull(), // Hashed backup code or phone for SMS
  isUsed: boolean("is_used").default(false),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User activity log for security tracking
export const userActivityLog = pgTable("user_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  activityType: varchar("activity_type").notNull(), // login, logout, password_change, profile_update, wallet_bind, kyc_submit
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  location: varchar("location"), // Approximate location from IP
  details: jsonb("details"), // Additional activity-specific data
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
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

// Bridge transactions table - Enhanced for Chain Fusion
export const bridgeTransactions = pgTable("bridge_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fromNetwork: text("from_network").notNull(), // ethereum, icp
  toNetwork: text("to_network").notNull(), // ethereum, icp
  fromToken: text("from_token").notNull(), // ETH, USDC, ckETH, ckUSDC
  toToken: text("to_token").notNull(), // ETH, USDC, ckETH, ckUSDC
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(), // Higher precision for crypto
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed, refunded
  txHashFrom: text("tx_hash_from"), // Source network transaction hash
  txHashTo: text("tx_hash_to"), // Destination network transaction hash
  bridgeFee: numeric("bridge_fee", { precision: 18, scale: 8 }).notNull(),
  estimatedTime: integer("estimated_time").notNull(), // Estimated completion time in minutes
  actualTime: integer("actual_time"), // Actual completion time in minutes
  confirmationsFrom: integer("confirmations_from").default(0),
  confirmationsTo: integer("confirmations_to").default(0),
  requiredConfirmations: integer("required_confirmations").notNull().default(12),
  bridgeData: jsonb("bridge_data"), // Additional Chain Fusion bridge data
  errorMessage: text("error_message"),
  refundTxHash: text("refund_tx_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Enhanced insert schemas with comprehensive validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  walletAddress: z.string()
    .min(1, 'Wallet address is required')
    .max(100, 'Wallet address too long')
    .refine(
      (val) => isValidEthereumAddress(val) || isValidPrincipalId(val) || isValidAccountId(val),
      'Invalid wallet address format (must be valid Ethereum address, ICP Principal ID, or Account ID)'
    )
    .optional(),
  principalId: z.string()
    .refine((val) => !val || isValidPrincipalId(val), 'Invalid ICP Principal ID format')
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .max(320, 'Email address too long') // RFC 5321 limit
    .transform(val => val.toLowerCase().trim())
    .optional(),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .transform(val => sanitizeText(val, 50))
    .refine(val => val.length > 0, 'First name cannot be empty after sanitization')
    .optional(),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .transform(val => sanitizeText(val, 50))
    .refine(val => val.length > 0, 'Last name cannot be empty after sanitization')
    .optional(),
  profileImageUrl: z.string()
    .url('Invalid URL format')
    .max(2048, 'URL too long')
    .refine((val) => {
      try {
        const url = new URL(val);
        return ['http:', 'https:'].includes(url.protocol);
      } catch { return false; }
    }, 'Only HTTP and HTTPS URLs are allowed')
    .optional(),
});

export const insertRwaSubmissionSchema = createInsertSchema(rwaSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
}).extend({
  userId: z.string()
    .min(1, 'User ID is required')
    .max(50, 'User ID too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid User ID format'),
  assetName: z.string()
    .min(1, 'Asset name is required')
    .max(200, 'Asset name too long')
    .transform(val => sanitizeText(val, 200))
    .refine(val => val.length > 0, 'Asset name cannot be empty after sanitization'),
  category: z.enum(['jewelry', 'art-collectibles', 'electronics', 'luxury-goods', 'vehicles', 'watches', 'collectibles'], {
    errorMap: () => ({ message: 'Invalid asset category' })
  }),
  estimatedValue: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Estimated value must be a valid number')
    .refine(val => val > 0, 'Estimated value must be greater than zero')
    .refine(val => val <= 10000000, 'Estimated value cannot exceed $10,000,000')
    .refine(val => val >= 10, 'Estimated value must be at least $10')
    .refine(val => {
      const decimalPlaces = val.toString().split('.')[1]?.length || 0;
      return decimalPlaces <= 2;
    }, 'Estimated value can have at most 2 decimal places'),
  description: z.string()
    .max(5000, 'Description too long')
    .transform(val => sanitizeText(val || '', 5000))
    .optional(),
  walletAddress: z.string()
    .min(1, 'Wallet address is required')
    .max(100, 'Wallet address too long')
    .refine(
      (val) => isValidEthereumAddress(val) || isValidPrincipalId(val) || isValidAccountId(val),
      'Invalid wallet address format (must be valid Ethereum address, ICP Principal ID, or Account ID)'
    ),
  coaUrl: z.string()
    .url('Invalid COA URL format')
    .max(2048, 'COA URL too long')
    .optional(),
  nftUrl: z.string()
    .url('Invalid NFT URL format')
    .max(2048, 'NFT URL too long')
    .optional(),
  physicalDocsUrl: z.string()
    .url('Invalid physical docs URL format')
    .max(2048, 'Physical docs URL too long')
    .optional(),
});

export const insertPawnLoanSchema = createInsertSchema(pawnLoans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startDate: true,
  redeemedAt: true,
}).extend({
  submissionId: z.string()
    .min(1, 'Submission ID is required')
    .max(50, 'Submission ID too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid submission ID format'),
  userId: z.string()
    .min(1, 'User ID is required')
    .max(50, 'User ID too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid user ID format'),
  loanAmount: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Loan amount must be a valid number')
    .refine(val => val > 0, 'Loan amount must be greater than zero')
    .refine(val => val <= 5000000, 'Loan amount cannot exceed $5,000,000')
    .refine(val => val >= 10, 'Loan amount must be at least $10')
    .refine(val => {
      const decimalPlaces = val.toString().split('.')[1]?.length || 0;
      return decimalPlaces <= 2;
    }, 'Loan amount can have at most 2 decimal places'),
  assetValue: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Asset value must be a valid number')
    .refine(val => val > 0, 'Asset value must be greater than zero')
    .refine(val => val <= 10000000, 'Asset value cannot exceed $10,000,000')
    .refine(val => val >= 10, 'Asset value must be at least $10'),
  feeAmount: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Fee amount must be a valid number')
    .refine(val => val >= 0, 'Fee amount cannot be negative')
    .refine(val => val <= 1000, 'Fee amount cannot exceed $1,000')
    .default(2.00),
  expiryDate: z.union([z.string(), z.date()])
    .transform(val => typeof val === 'string' ? new Date(val) : val)
    .refine(val => !isNaN(val.getTime()), 'Invalid expiry date')
    .refine(val => val > new Date(), 'Expiry date must be in the future')
    .refine(val => val <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'Expiry date cannot be more than 90 days in the future'),
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
  completedAt: true,
  confirmationsFrom: true,
  confirmationsTo: true,
  actualTime: true,
  txHashFrom: true,
  txHashTo: true,
  errorMessage: true,
  refundTxHash: true,
});

// Document Analysis API Validation Schemas
export const documentUploadSchema = z.object({
  submissionId: z.string().min(1, "Submission ID is required"),
  documentType: z.enum(['coa', 'nft_certificate', 'insurance', 'appraisal', 'photo', 'video', 'other']),
  priority: z.coerce.number().min(1).max(3).default(1),
  metadata: z.record(z.any()).optional(),
});

export const documentAnalysisRequestSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  provider: z.enum(['textract', 'azure_document_intelligence', 'tesseract']).default('textract'),
  analysisOptions: z.object({
    extractText: z.boolean().default(true),
    extractTables: z.boolean().default(true),
    extractForms: z.boolean().default(true),
    detectFraud: z.boolean().default(true),
  }).optional(),
});

export const documentVerificationSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  verificationStatus: z.enum(['verified', 'rejected', 'needs_more_info']),
  verificationNotes: z.string().optional(),
  overrideReason: z.string().optional(),
  finalDecision: z.enum(['accept', 'reject', 'request_resubmission']),
  additionalDocumentsRequired: z.array(z.string()).optional(),
});

export const fraudDetectionConfigSchema = z.object({
  enableImageAnalysis: z.boolean().default(true),
  enableTextAnalysis: z.boolean().default(true),
  enableMetadataAnalysis: z.boolean().default(true),
  fraudThreshold: z.number().min(0).max(1).default(0.7),
  requireManualReviewThreshold: z.number().min(0).max(1).default(0.5),
});

export const batchDocumentAnalysisSchema = z.object({
  documentIds: z.array(z.string()).min(1, "At least one document ID is required"),
  priority: z.number().min(1).max(3).default(1),
  analysisOptions: z.object({
    extractText: z.boolean().default(true),
    extractTables: z.boolean().default(true),
    extractForms: z.boolean().default(true),
    detectFraud: z.boolean().default(true),
  }).optional(),
});

// Document search and filter schemas
export const documentSearchSchema = z.object({
  submissionId: z.string().optional(),
  documentType: z.enum(['coa', 'nft_certificate', 'insurance', 'appraisal', 'photo', 'video', 'other']).optional(),
  analysisStatus: z.enum(['pending', 'processing', 'completed', 'failed', 'manual_review']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['created_at', 'analyzed_at', 'fraud_score', 'file_size']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Enhanced secure wallet binding schemas  
export const walletBindIntentSchema = z.object({
  walletType: z.enum(['plug', 'internetIdentity'], {
    errorMap: () => ({ message: 'Wallet type must be either "plug" or "internetIdentity"' })
  }),
});

export const walletBindVerificationSchema = z.object({
  principalId: z.string()
    .min(1, "Principal ID is required")
    .max(100, "Principal ID too long")
    .refine(val => isValidPrincipalId(val), "Invalid ICP Principal ID format"),
  nonce: z.string()
    .min(32, "Nonce too short (must be at least 32 characters)")
    .max(128, "Nonce too long")
    .regex(/^[a-zA-Z0-9]+$/, "Nonce must contain only alphanumeric characters"),
  walletType: z.enum(['plug', 'internetIdentity'], {
    errorMap: () => ({ message: 'Wallet type must be either "plug" or "internetIdentity"' })
  }),
  // For Plug: signature + publicKey required. For II: delegation proof
  proof: z.string()
    .max(10000, "Proof data too large")
    .optional(), // For Internet Identity delegation
  signature: z.string()
    .max(1000, "Signature too long")
    .regex(/^[0-9a-fA-F]*$/, "Signature must be hexadecimal")
    .optional(), // For Plug signature
  publicKey: z.string()
    .max(200, "Public key too long")
    .regex(/^[0-9a-fA-F]*$/, "Public key must be hexadecimal")
    .optional(), // Required for Plug verification
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
    // Validate signature length for Plug (64-128 hex chars typically)
    if (data.signature && (data.signature.length < 64 || data.signature.length > 256)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid signature length for Plug wallet",
        path: ['signature']
      });
    }
    // Validate public key length for Plug
    if (data.publicKey && (data.publicKey.length < 64 || data.publicKey.length > 132)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid public key length for Plug wallet",
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
    // Validate proof structure for Internet Identity
    if (data.proof && data.proof.length < 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Delegation proof appears to be incomplete",
        path: ['proof']
      });
    }
  }
});

// Enhanced user update schema with comprehensive validation
export const userUpdateSchema = z.object({
  principalId: z.string()
    .refine(val => !val || isValidPrincipalId(val), "Invalid ICP Principal ID format")
    .optional(),
  walletAddress: z.string()
    .max(100, "Wallet address too long")
    .refine(
      val => !val || isValidEthereumAddress(val) || isValidPrincipalId(val) || isValidAccountId(val),
      "Invalid wallet address format (must be valid Ethereum address, ICP Principal ID, or Account ID)"
    )
    .optional(),
  firstName: z.string()
    .min(1, "First name cannot be empty")
    .max(50, "First name too long")
    .transform(val => sanitizeText(val, 50))
    .refine(val => val.length > 0, "First name cannot be empty after sanitization")
    .refine(val => /^[a-zA-Z\s'-]+$/.test(val), "First name can only contain letters, spaces, hyphens, and apostrophes")
    .optional(),
  lastName: z.string()
    .min(1, "Last name cannot be empty")
    .max(50, "Last name too long")
    .transform(val => sanitizeText(val, 50))
    .refine(val => val.length > 0, "Last name cannot be empty after sanitization")
    .refine(val => /^[a-zA-Z\s'-]+$/.test(val), "Last name can only contain letters, spaces, hyphens, and apostrophes")
    .optional(),
  email: z.string()
    .email("Invalid email format")
    .max(320, "Email address too long") // RFC 5321 limit
    .transform(val => val.toLowerCase().trim())
    .refine(val => {
      // Additional email validation - check for common problematic domains
      const suspiciousDomains = ['tempmail.', 'guerrillamail.', '10minutemail.'];
      return !suspiciousDomains.some(domain => val.includes(domain));
    }, "Temporary email addresses are not allowed")
    .optional(),
  profileImageUrl: z.string()
    .url("Invalid URL format")
    .max(2048, "Profile image URL too long")
    .refine(val => {
      try {
        const url = new URL(val);
        return ['http:', 'https:'].includes(url.protocol);
      } catch { return false; }
    }, "Only HTTP and HTTPS URLs are allowed")
    .refine(val => {
      // Check for common image domains and file extensions
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const url = val.toLowerCase();
      return imageExtensions.some(ext => url.includes(ext)) || 
             url.includes('imgur.com') || url.includes('cloudflare.com') || 
             url.includes('amazonaws.com');
    }, "URL must point to a valid image file or trusted image hosting service")
    .optional(),
}).strict(); // Prevents additional properties

// Enhanced payment intent schemas with comprehensive validation
export const paymentIntentSchema = z.object({
  type: z.enum(['fee_payment', 'redemption_payment', 'bid_payment'], {
    errorMap: () => ({ message: 'Payment type must be fee_payment, redemption_payment, or bid_payment' })
  }),
  amount: z.string()
    .min(1, "Amount is required")
    .regex(/^\d+(\.\d{1,8})?$/, "Amount must be a positive number with at most 8 decimal places")
    .refine(val => {
      const num = parseFloat(val);
      return num > 0;
    }, "Amount must be greater than zero")
    .refine(val => {
      const num = parseFloat(val);
      return num <= 1000000; // 1 million max
    }, "Amount cannot exceed 1,000,000")
    .refine(val => {
      const num = parseFloat(val);
      return num >= 0.00001; // Minimum 0.00001 (1e-5)
    }, "Amount must be at least 0.00001"),
  metadata: z.record(
    z.union([
      z.string().max(1000, "Metadata string values too long"),
      z.number(),
      z.boolean(),
      z.null()
    ])
  ).optional(),
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

// RWAPAWN Token System Tables

// RWAPAWN Purchase Records - Credit card and crypto purchases
export const rwapawnPurchases = pgTable("rwapawn_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // USD amount spent
  purchaseType: text("purchase_type").notNull(), // credit_card, crypto
  paymentReference: text("payment_reference").notNull(), // Stripe payment ID or crypto tx hash
  tokenAmount: numeric("token_amount", { precision: 18, scale: 8 }).notNull(), // RWAPAWN tokens received
  exchangeRate: numeric("exchange_rate", { precision: 18, scale: 8 }).notNull(), // USD to RWAPAWN rate
  status: text("status").notNull().default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_rwapawn_purchases_user_id").on(table.userId),
  index("idx_rwapawn_purchases_status").on(table.status),
  index("idx_rwapawn_purchases_created_at").on(table.createdAt),
]);

// RWAPAWN Staking Records - Token staking with lock periods
export const rwapawnStakes = pgTable("rwapawn_stakes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tokenAmount: numeric("token_amount", { precision: 18, scale: 8 }).notNull(), // Tokens staked
  stakingTier: integer("staking_tier").notNull(), // 1-4 (30, 60, 90, 180 days)
  lockPeriod: integer("lock_period").notNull(), // Days locked
  annualPercentageYield: numeric("annual_percentage_yield", { precision: 5, scale: 2 }).notNull(), // APY %
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date").notNull(), // Calculated unlock date
  status: text("status").notNull().default("active"), // active, completed, withdrawn
  accruedRewards: numeric("accrued_rewards", { precision: 18, scale: 8 }).notNull().default("0"), // Rewards earned
}, (table) => [
  index("idx_rwapawn_stakes_user_id").on(table.userId),
  index("idx_rwapawn_stakes_status").on(table.status),
  index("idx_rwapawn_stakes_end_date").on(table.endDate),
]);

// RWAPAWN Swap Records - Crypto to RWAPAWN conversions
export const rwapawnSwaps = pgTable("rwapawn_swaps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fromCurrency: text("from_currency").notNull(), // ETH, BTC, ICP, USDC, etc.
  fromAmount: numeric("from_amount", { precision: 18, scale: 8 }).notNull(), // Amount of source currency
  toTokenAmount: numeric("to_token_amount", { precision: 18, scale: 8 }).notNull(), // RWAPAWN tokens received
  exchangeRate: numeric("exchange_rate", { precision: 18, scale: 8 }).notNull(), // Conversion rate
  transactionHash: text("transaction_hash"), // Blockchain transaction hash
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_rwapawn_swaps_user_id").on(table.userId),
  index("idx_rwapawn_swaps_status").on(table.status),
  index("idx_rwapawn_swaps_created_at").on(table.createdAt),
]);

// RWAPAWN Balance Records - User token balances
export const rwapawnBalances = pgTable("rwapawn_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id), // One balance record per user
  availableTokens: numeric("available_tokens", { precision: 18, scale: 8 }).notNull().default("0"), // Available for trading
  stakedTokens: numeric("staked_tokens", { precision: 18, scale: 8 }).notNull().default("0"), // Currently staked
  pendingTokens: numeric("pending_tokens", { precision: 18, scale: 8 }).notNull().default("0"), // Pending purchases/swaps
  totalTokens: numeric("total_tokens", { precision: 18, scale: 8 }).notNull().default("0"), // Total owned
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("idx_rwapawn_balances_user_id").on(table.userId),
  index("idx_rwapawn_balances_last_updated").on(table.lastUpdated),
]);

// Document Analysis System Tables

// Documents table - Core document metadata and storage
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => rwaSubmissions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentType: text("document_type").notNull(), // coa, nft_certificate, insurance, appraisal, photo, video, other
  originalFileName: text("original_file_name").notNull(),
  storageUrl: text("storage_url").notNull(), // Object storage URL
  thumbnailUrl: text("thumbnail_url"), // Generated thumbnail for quick preview
  fileSize: integer("file_size").notNull(), // Size in bytes
  mimeType: text("mime_type").notNull(), // image/jpeg, application/pdf, etc.
  checksum: text("checksum").notNull(), // SHA-256 checksum for integrity
  analysisStatus: text("analysis_status").notNull().default("pending"), // pending, processing, completed, failed, manual_review
  priority: integer("priority").notNull().default(1), // 1=normal, 2=high, 3=urgent
  metadata: jsonb("metadata"), // Additional file metadata
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_documents_submission_id").on(table.submissionId),
  index("idx_documents_analysis_status").on(table.analysisStatus),
  index("idx_documents_created_at").on(table.createdAt),
]);

// Document Analysis Results - OCR and extracted data
export const documentAnalysisResults = pgTable("document_analysis_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  analysisProvider: text("analysis_provider").notNull(), // textract, azure_document_intelligence, tesseract
  analysisJobId: text("analysis_job_id"), // External service job ID for tracking
  ocrText: text("ocr_text"), // Full extracted text
  extractedData: jsonb("extracted_data"), // Structured data extraction
  boundingBoxes: jsonb("bounding_boxes"), // Text location coordinates
  tables: jsonb("tables"), // Extracted table data
  forms: jsonb("forms"), // Form field/value pairs
  confidence: numeric("confidence", { precision: 4, scale: 3 }), // Overall confidence score (0-1)
  processingTime: integer("processing_time"), // Processing time in milliseconds
  errorMessage: text("error_message"), // Error details if analysis failed
  rawResponse: jsonb("raw_response"), // Raw API response for debugging
  analyzedAt: timestamp("analyzed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_analysis_results_document_id").on(table.documentId),
  index("idx_analysis_results_analyzed_at").on(table.analyzedAt),
]);

// Fraud Detection Results - Authenticity and fraud scoring
export const fraudDetectionResults = pgTable("fraud_detection_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  overallFraudScore: numeric("overall_fraud_score", { precision: 4, scale: 3 }).notNull(), // 0-1, higher = more suspicious
  riskLevel: text("risk_level").notNull(), // low, medium, high, critical
  detectedIssues: jsonb("detected_issues"), // Array of detected fraud indicators
  authenticityScore: numeric("authenticity_score", { precision: 4, scale: 3 }), // Document authenticity (0-1)
  tamperingDetected: boolean("tampering_detected").default(false),
  metadataAnalysis: jsonb("metadata_analysis"), // File metadata examination results
  patternMatches: jsonb("pattern_matches"), // Known fraud pattern matches
  crossReferenceChecks: jsonb("cross_reference_checks"), // Results from database/external checks
  mlModelVersion: text("ml_model_version"), // Version of fraud detection model used
  confidence: numeric("confidence", { precision: 4, scale: 3 }), // Confidence in fraud assessment
  requiresManualReview: boolean("requires_manual_review").default(false),
  reviewNotes: text("review_notes"), // Notes for manual reviewers
  analyzedAt: timestamp("analyzed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_fraud_results_document_id").on(table.documentId),
  index("idx_fraud_results_risk_level").on(table.riskLevel),
  index("idx_fraud_results_manual_review").on(table.requiresManualReview),
]);

// Document Verification Actions - Admin review and decisions
export const documentVerifications = pgTable("document_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  reviewedBy: varchar("reviewed_by").notNull().references(() => users.id),
  verificationStatus: text("verification_status").notNull(), // verified, rejected, needs_more_info
  verificationNotes: text("verification_notes"),
  overrideReason: text("override_reason"), // Reason for overriding automated decision
  originalFraudScore: numeric("original_fraud_score", { precision: 4, scale: 3 }),
  finalDecision: text("final_decision").notNull(), // accept, reject, request_resubmission
  additionalDocumentsRequired: text("additional_documents_required").array(),
  reviewDurationSeconds: integer("review_duration_seconds"), // Time spent on review
  reviewedAt: timestamp("reviewed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_document_verifications_document_id").on(table.documentId),
  index("idx_document_verifications_reviewed_by").on(table.reviewedBy),
  index("idx_document_verifications_status").on(table.verificationStatus),
]);

// Document Analysis Queue - Processing queue management
export const documentAnalysisQueue = pgTable("document_analysis_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  queueStatus: text("queue_status").notNull().default("queued"), // queued, processing, completed, failed, retrying
  priority: integer("priority").notNull().default(1), // Higher number = higher priority
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  lastError: text("last_error"),
  nextRetryAt: timestamp("next_retry_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  processingNode: text("processing_node"), // Which server/worker is processing
  estimatedProcessingTime: integer("estimated_processing_time"), // Seconds
  actualProcessingTime: integer("actual_processing_time"), // Seconds
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_analysis_queue_status").on(table.queueStatus),
  index("idx_analysis_queue_priority").on(table.priority),
  index("idx_analysis_queue_next_retry").on(table.nextRetryAt),
]);

// Document Templates - Known authentic document patterns
export const documentTemplates = pgTable("document_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateName: text("template_name").notNull(),
  documentType: text("document_type").notNull(),
  issuerName: text("issuer_name").notNull(), // Organization that issues this document
  templateVersion: text("template_version").notNull(),
  expectedFields: jsonb("expected_fields"), // Fields that should be present
  validationRules: jsonb("validation_rules"), // Rules for field validation
  layoutSignature: text("layout_signature"), // Hash of expected layout
  securityFeatures: jsonb("security_features"), // Expected security features
  sampleImages: text("sample_images").array(), // Reference authentic samples
  isActive: boolean("is_active").default(true),
  confidence: numeric("confidence", { precision: 4, scale: 3 }), // Template reliability score
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_document_templates_type").on(table.documentType),
  index("idx_document_templates_issuer").on(table.issuerName),
  index("idx_document_templates_active").on(table.isActive),
]);

// Document Analysis Insert Schemas
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentAnalysisResultSchema = createInsertSchema(documentAnalysisResults).omit({
  id: true,
  analyzedAt: true,
  createdAt: true,
});

export const insertFraudDetectionResultSchema = createInsertSchema(fraudDetectionResults).omit({
  id: true,
  analyzedAt: true,
  createdAt: true,
});

export const insertDocumentVerificationSchema = createInsertSchema(documentVerifications).omit({
  id: true,
  reviewedAt: true,
  createdAt: true,
});

export const insertDocumentAnalysisQueueSchema = createInsertSchema(documentAnalysisQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

// Chain Fusion Bridge Schemas
export const supportedNetworks = z.enum(['ethereum', 'icp']);
export const supportedTokens = z.enum(['ETH', 'USDC', 'ckETH', 'ckUSDC']);
export const bridgeStatus = z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']);

// Bridge estimation schema
export const bridgeEstimationSchema = z.object({
  fromNetwork: supportedNetworks,
  toNetwork: supportedNetworks,
  fromToken: supportedTokens,
  toToken: supportedTokens,
  amount: z.string().min(1, "Amount is required"),
});

// PRODUCTION-READY: Enhanced bridge initiation schema with proper address validation
export const bridgeInitiationSchema = z.object({
  fromNetwork: supportedNetworks,
  toNetwork: supportedNetworks,
  fromToken: supportedTokens,
  toToken: supportedTokens,
  amount: z.string().min(1, "Amount is required").regex(/^\d+(\.\d{1,18})?$/, "Invalid amount format"),
  fromAddress: z.string().min(1, "From address is required").max(100, "From address too long"),
  toAddress: z.string().min(1, "To address is required").max(100, "To address too long"),
  slippageTolerance: z.number().min(0).max(5).default(1), // 1% default
}).superRefine((data, ctx) => {
  // Validate fromAddress format based on network
  if (data.fromNetwork === 'ethereum') {
    if (!/^0x[0-9a-fA-F]{40}$/.test(data.fromAddress) && !/^[0-9a-fA-F]{40}$/.test(data.fromAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid Ethereum address format (must be 40 hex characters with or without 0x prefix)",
        path: ['fromAddress']
      });
    }
  } else if (data.fromNetwork === 'icp') {
    if (!/^[0-9a-fA-F]{64}$/.test(data.fromAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid ICP AccountIdentifier format (must be 64 hex characters)",
        path: ['fromAddress']
      });
    }
  }

  // Validate toAddress format based on network
  if (data.toNetwork === 'ethereum') {
    if (!/^0x[0-9a-fA-F]{40}$/.test(data.toAddress) && !/^[0-9a-fA-F]{40}$/.test(data.toAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid Ethereum address format (must be 40 hex characters with or without 0x prefix)",
        path: ['toAddress']
      });
    }
  } else if (data.toNetwork === 'icp') {
    if (!/^[0-9a-fA-F]{64}$/.test(data.toAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid ICP AccountIdentifier format (must be 64 hex characters)",
        path: ['toAddress']
      });
    }
  }

  // Validate network/token combinations
  if (data.fromNetwork === 'ethereum' && !['ETH', 'USDC'].includes(data.fromToken)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid token for Ethereum network",
      path: ['fromToken']
    });
  }

  if (data.toNetwork === 'ethereum' && !['ETH', 'USDC'].includes(data.toToken)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid token for Ethereum network",
      path: ['toToken']
    });
  }

  if (data.fromNetwork === 'icp' && !['ckETH', 'ckUSDC'].includes(data.fromToken)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid token for ICP network",
      path: ['fromToken']
    });
  }

  if (data.toNetwork === 'icp' && !['ckETH', 'ckUSDC'].includes(data.toToken)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid token for ICP network",
      path: ['toToken']
    });
  }
});

// Bridge status update schema
export const bridgeStatusUpdateSchema = z.object({
  status: bridgeStatus,
  txHashFrom: z.string().optional(),
  txHashTo: z.string().optional(),
  confirmationsFrom: z.number().optional(),
  confirmationsTo: z.number().optional(),
  errorMessage: z.string().optional(),
  refundTxHash: z.string().optional(),
  bridgeData: z.record(z.any()).optional(),
});

// Bridge history filter schema
export const bridgeHistoryFilterSchema = z.object({
  status: bridgeStatus.optional(),
  fromNetwork: supportedNetworks.optional(),
  toNetwork: supportedNetworks.optional(),
  fromToken: supportedTokens.optional(),
  toToken: supportedTokens.optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// Bridge network configuration
export const bridgeNetworkConfig = z.object({
  ethereum: z.object({
    chainId: z.number().default(1),
    rpcUrl: z.string(),
    blockConfirmations: z.number().default(12),
    bridgeContract: z.string(),
    tokens: z.record(z.object({
      address: z.string(),
      decimals: z.number(),
      minAmount: z.string(),
      maxAmount: z.string(),
    })),
  }),
  icp: z.object({
    network: z.string().default('mainnet'),
    canisters: z.object({
      ckETH: z.string(),
      ckUSDC: z.string(),
      bridge: z.string(),
    }),
    tokens: z.record(z.object({
      canisterId: z.string(),
      decimals: z.number(),
      minAmount: z.string(),
      maxAmount: z.string(),
    })),
  }),
});

// Bridge estimation response
export const bridgeEstimationResponseSchema = z.object({
  estimatedFee: z.string(),
  estimatedTime: z.number(), // in minutes
  minimumAmount: z.string(),
  maximumAmount: z.string(),
  exchangeRate: z.string(),
  networkFee: z.string(),
  bridgeFee: z.string(),
  totalCost: z.string(),
  receiveAmount: z.string(),
});

// Admin Management Tables - Enhanced admin dashboard functionality

// Admin Actions - Audit trail of admin decisions and actions
export const adminActions = pgTable("admin_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  actionType: text("action_type").notNull(), // approve_submission, reject_submission, approve_asset, flag_user, etc.
  targetType: text("target_type").notNull(), // submission, user, document, transaction, asset
  targetId: varchar("target_id").notNull(), // ID of the target entity
  actionDetails: jsonb("action_details"), // Details of the action taken
  reasonCode: text("reason_code"), // Standardized reason for the action
  adminNotes: text("admin_notes"), // Free-form admin notes
  previousState: jsonb("previous_state"), // State before the action
  newState: jsonb("new_state"), // State after the action
  ipAddress: text("ip_address"), // Admin's IP address for security
  userAgent: text("user_agent"), // Browser/client information
  sessionId: text("session_id"), // Admin session ID
  severity: text("severity").notNull().default("normal"), // low, normal, high, critical
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_admin_actions_admin_id").on(table.adminId),
  index("idx_admin_actions_action_type").on(table.actionType),
  index("idx_admin_actions_target_type").on(table.targetType),
  index("idx_admin_actions_created_at").on(table.createdAt),
  index("idx_admin_actions_severity").on(table.severity),
]);

// Fraud Alerts - Real-time fraud detection alerts and investigations
export const fraudAlerts = pgTable("fraud_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: text("alert_type").notNull(), // document_fraud, user_behavior, transaction_anomaly, duplicate_submission
  severity: text("severity").notNull(), // low, medium, high, critical
  status: text("status").notNull().default("open"), // open, investigating, resolved, false_positive
  targetType: text("target_type").notNull(), // user, document, submission, transaction
  targetId: varchar("target_id").notNull(),
  userId: varchar("user_id").references(() => users.id), // User associated with the alert
  riskScore: numeric("risk_score", { precision: 4, scale: 3 }).notNull(), // 0-1 risk score
  alertData: jsonb("alert_data").notNull(), // Specific alert details and evidence
  detectionMethod: text("detection_method").notNull(), // ml_model, rule_based, manual_review, cross_reference
  modelVersion: text("model_version"), // Version of ML model that triggered alert
  evidence: jsonb("evidence"), // Supporting evidence for the alert
  falsePositiveRisk: numeric("false_positive_risk", { precision: 4, scale: 3 }), // Confidence in alert accuracy
  assignedTo: varchar("assigned_to").references(() => users.id), // Admin investigating the alert
  investigationNotes: text("investigation_notes"), // Investigation progress and notes
  resolution: text("resolution"), // Final resolution of the alert
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  notificationsSent: boolean("notifications_sent").default(false),
  escalated: boolean("escalated").default(false),
  escalatedAt: timestamp("escalated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_fraud_alerts_status").on(table.status),
  index("idx_fraud_alerts_severity").on(table.severity),
  index("idx_fraud_alerts_target_type").on(table.targetType),
  index("idx_fraud_alerts_user_id").on(table.userId),
  index("idx_fraud_alerts_risk_score").on(table.riskScore),
  index("idx_fraud_alerts_created_at").on(table.createdAt),
  index("idx_fraud_alerts_assigned_to").on(table.assignedTo),
]);

// Asset Reviews - Manual asset verification workflow
export const assetReviews = pgTable("asset_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => rwaSubmissions.id),
  reviewType: text("review_type").notNull(), // initial_review, appeal_review, fraud_investigation, valuation_dispute
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, escalated
  priority: integer("priority").notNull().default(1), // 1=normal, 2=high, 3=urgent
  assignedTo: varchar("assigned_to").references(() => users.id),
  reviewCriteria: jsonb("review_criteria"), // Specific criteria to review
  valuationAnalysis: jsonb("valuation_analysis"), // Detailed valuation breakdown
  authenticityAssessment: jsonb("authenticity_assessment"), // Authenticity verification results
  conditionReport: jsonb("condition_report"), // Physical condition assessment
  marketAnalysis: jsonb("market_analysis"), // Market value analysis and comparables
  riskAssessment: jsonb("risk_assessment"), // Risk factors and mitigation
  adminDecision: text("admin_decision"), // approve, reject, request_more_info, escalate
  decisionReasoning: text("decision_reasoning"), // Detailed reasoning for decision
  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }), // Admin's valuation
  confidenceLevel: numeric("confidence_level", { precision: 3, scale: 2 }), // 0-1 confidence in assessment
  recommendedActions: text("recommended_actions").array(), // Follow-up actions needed
  externalAppraisals: jsonb("external_appraisals"), // Third-party appraisal data
  inspectionScheduled: boolean("inspection_scheduled").default(false),
  inspectionCompleted: boolean("inspection_completed").default(false),
  inspectionNotes: text("inspection_notes"),
  reviewDurationMinutes: integer("review_duration_minutes"), // Time spent on review
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  escalatedAt: timestamp("escalated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_asset_reviews_submission_id").on(table.submissionId),
  index("idx_asset_reviews_status").on(table.status),
  index("idx_asset_reviews_priority").on(table.priority),
  index("idx_asset_reviews_assigned_to").on(table.assignedTo),
  index("idx_asset_reviews_created_at").on(table.createdAt),
]);

// User Flags - Flagged user accounts and security concerns
export const userFlags = pgTable("user_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  flagType: text("flag_type").notNull(), // suspicious_activity, multiple_accounts, fraud_attempt, policy_violation
  severity: text("severity").notNull(), // low, medium, high, critical
  status: text("status").notNull().default("active"), // active, resolved, escalated, false_positive
  flagReason: text("flag_reason").notNull(), // Detailed reason for flagging
  evidence: jsonb("evidence"), // Supporting evidence
  automaticFlag: boolean("automatic_flag").default(false), // Whether flag was auto-generated
  detectionMethod: text("detection_method"), // How the flag was detected
  riskScore: numeric("risk_score", { precision: 4, scale: 3 }), // 0-1 risk assessment
  restrictions: jsonb("restrictions"), // Account restrictions applied
  investigationNotes: text("investigation_notes"), // Investigation progress
  flaggedBy: varchar("flagged_by").references(() => users.id), // Admin who flagged (if manual)
  reviewedBy: varchar("reviewed_by").references(() => users.id), // Admin who reviewed
  relatedFlags: text("related_flags").array(), // Related flag IDs
  notificationsSent: boolean("notifications_sent").default(false),
  userNotified: boolean("user_notified").default(false),
  resolutionAction: text("resolution_action"), // Action taken to resolve
  resolvedAt: timestamp("resolved_at"),
  expiresAt: timestamp("expires_at"), // For temporary flags
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_flags_user_id").on(table.userId),
  index("idx_user_flags_flag_type").on(table.flagType),
  index("idx_user_flags_status").on(table.status),
  index("idx_user_flags_severity").on(table.severity),
  index("idx_user_flags_created_at").on(table.createdAt),
  index("idx_user_flags_expires_at").on(table.expiresAt),
]);

// Performance Metrics - Platform performance tracking and analytics
export const performanceMetrics = pgTable("performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: text("metric_type").notNull(), // system, business, security, user_experience
  metricName: text("metric_name").notNull(), // loan_approval_rate, document_processing_time, fraud_detection_accuracy
  category: text("category").notNull(), // loans, documents, users, transactions, bridge, security
  value: numeric("value", { precision: 15, scale: 4 }).notNull(), // Metric value
  unit: text("unit"), // percentage, seconds, count, dollars, etc.
  dimension: jsonb("dimension"), // Additional dimensions (user_type, asset_category, etc.)
  aggregationPeriod: text("aggregation_period").notNull(), // real_time, hourly, daily, weekly, monthly
  calculationMethod: text("calculation_method"), // How the metric was calculated
  dataSource: text("data_source"), // Source of the data
  accuracy: numeric("accuracy", { precision: 4, scale: 3 }), // Confidence in metric accuracy
  contextData: jsonb("context_data"), // Additional context for the metric
  threshold: jsonb("threshold"), // Alert thresholds for the metric
  trend: text("trend"), // up, down, stable, volatile
  comparisonPeriod: text("comparison_period"), // Previous period for comparison
  comparisonValue: numeric("comparison_value", { precision: 15, scale: 4 }), // Previous period value
  changePercentage: numeric("change_percentage", { precision: 6, scale: 3 }), // Percentage change
  alertsTriggered: boolean("alerts_triggered").default(false),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_performance_metrics_metric_type").on(table.metricType),
  index("idx_performance_metrics_metric_name").on(table.metricName),
  index("idx_performance_metrics_category").on(table.category),
  index("idx_performance_metrics_period_start").on(table.periodStart),
  index("idx_performance_metrics_calculated_at").on(table.calculatedAt),
  index("idx_performance_metrics_aggregation_period").on(table.aggregationPeriod),
]);

// RWAPAWN Token Insert Schemas
export const insertRwapawnPurchaseSchema = createInsertSchema(rwapawnPurchases).omit({
  id: true,
  createdAt: true,
}).extend({
  userId: z.string()
    .min(1, 'User ID is required')
    .max(50, 'User ID too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid User ID format'),
  amount: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Amount must be a valid number')
    .refine(val => val > 0, 'Amount must be greater than zero')
    .refine(val => val <= 1000000, 'Amount cannot exceed $1,000,000')
    .refine(val => val >= 1, 'Amount must be at least $1'),
  purchaseType: z.enum(['credit_card', 'crypto'], {
    errorMap: () => ({ message: 'Purchase type must be credit_card or crypto' })
  }),
  paymentReference: z.string()
    .min(1, 'Payment reference is required')
    .max(500, 'Payment reference too long'),
  tokenAmount: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Token amount must be a valid number')
    .refine(val => val > 0, 'Token amount must be greater than zero'),
  exchangeRate: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Exchange rate must be a valid number')
    .refine(val => val > 0, 'Exchange rate must be greater than zero'),
  status: z.enum(['pending', 'completed', 'failed']).default('pending'),
});

export const insertRwapawnStakeSchema = createInsertSchema(rwapawnStakes).omit({
  id: true,
  startDate: true,
}).extend({
  userId: z.string()
    .min(1, 'User ID is required')
    .max(50, 'User ID too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid User ID format'),
  tokenAmount: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Token amount must be a valid number')
    .refine(val => val > 0, 'Token amount must be greater than zero'),
  stakingTier: z.number()
    .int('Staking tier must be an integer')
    .min(1, 'Staking tier must be between 1-4')
    .max(4, 'Staking tier must be between 1-4'),
  lockPeriod: z.number()
    .int('Lock period must be an integer')
    .min(1, 'Lock period must be at least 1 day')
    .max(365, 'Lock period cannot exceed 365 days'),
  annualPercentageYield: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'APY must be a valid number')
    .refine(val => val >= 0, 'APY cannot be negative')
    .refine(val => val <= 100, 'APY cannot exceed 100%'),
  endDate: z.union([z.string(), z.date()])
    .transform(val => typeof val === 'string' ? new Date(val) : val)
    .refine(val => !isNaN(val.getTime()), 'Invalid end date')
    .refine(val => val > new Date(), 'End date must be in the future'),
  status: z.enum(['active', 'completed', 'withdrawn']).default('active'),
  accruedRewards: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Accrued rewards must be a valid number')
    .refine(val => val >= 0, 'Accrued rewards cannot be negative')
    .default(0),
});

export const insertRwapawnSwapSchema = createInsertSchema(rwapawnSwaps).omit({
  id: true,
  createdAt: true,
}).extend({
  userId: z.string()
    .min(1, 'User ID is required')
    .max(50, 'User ID too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid User ID format'),
  fromCurrency: z.string()
    .min(1, 'From currency is required')
    .max(20, 'Currency code too long')
    .regex(/^[A-Z]+$/, 'Currency code must be uppercase letters only'),
  fromAmount: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'From amount must be a valid number')
    .refine(val => val > 0, 'From amount must be greater than zero'),
  toTokenAmount: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'To token amount must be a valid number')
    .refine(val => val > 0, 'To token amount must be greater than zero'),
  exchangeRate: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Exchange rate must be a valid number')
    .refine(val => val > 0, 'Exchange rate must be greater than zero'),
  transactionHash: z.string()
    .max(200, 'Transaction hash too long')
    .regex(/^0x[a-fA-F0-9]{64}$|^[a-zA-Z0-9-_]+$/, 'Invalid transaction hash format')
    .optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
});

export const insertRwapawnBalanceSchema = createInsertSchema(rwapawnBalances).omit({
  id: true,
  lastUpdated: true,
}).extend({
  userId: z.string()
    .min(1, 'User ID is required')
    .max(50, 'User ID too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid User ID format'),
  availableTokens: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Available tokens must be a valid number')
    .refine(val => val >= 0, 'Available tokens cannot be negative')
    .default(0),
  stakedTokens: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Staked tokens must be a valid number')
    .refine(val => val >= 0, 'Staked tokens cannot be negative')
    .default(0),
  pendingTokens: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Pending tokens must be a valid number')
    .refine(val => val >= 0, 'Pending tokens cannot be negative')
    .default(0),
  totalTokens: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => !isNaN(val), 'Total tokens must be a valid number')
    .refine(val => val >= 0, 'Total tokens cannot be negative')
    .default(0),
});

// Admin Management Insert Schemas
export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

export const insertFraudAlertSchema = createInsertSchema(fraudAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  escalatedAt: true,
});

export const insertAssetReviewSchema = createInsertSchema(assetReviews).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  escalatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserFlagSchema = createInsertSchema(userFlags).omit({
  id: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
});

// Admin API Validation Schemas
export const adminActionCreateSchema = z.object({
  actionType: z.enum(['approve_submission', 'reject_submission', 'approve_asset', 'reject_asset', 'flag_user', 'unflag_user', 'restrict_user', 'unrestrict_user', 'escalate_case', 'resolve_alert']),
  targetType: z.enum(['submission', 'user', 'document', 'transaction', 'asset', 'alert']),
  targetId: z.string().min(1, "Target ID is required"),
  actionDetails: z.record(z.any()).optional(),
  reasonCode: z.string().optional(),
  adminNotes: z.string().optional(),
  severity: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
});

export const fraudAlertUpdateSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved', 'false_positive']),
  assignedTo: z.string().optional(),
  investigationNotes: z.string().optional(),
  resolution: z.string().optional(),
  escalated: z.boolean().optional(),
});

export const assetReviewUpdateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'escalated']),
  priority: z.number().min(1).max(3).optional(),
  assignedTo: z.string().optional(),
  adminDecision: z.enum(['approve', 'reject', 'request_more_info', 'escalate']).optional(),
  decisionReasoning: z.string().optional(),
  estimatedValue: z.string().optional(),
  confidenceLevel: z.number().min(0).max(1).optional(),
  inspectionScheduled: z.boolean().optional(),
  inspectionCompleted: z.boolean().optional(),
  inspectionNotes: z.string().optional(),
});

export const userFlagCreateSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  flagType: z.enum(['suspicious_activity', 'multiple_accounts', 'fraud_attempt', 'policy_violation']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  flagReason: z.string().min(1, "Flag reason is required"),
  evidence: z.record(z.any()).optional(),
  restrictions: z.record(z.any()).optional(),
  expiresAt: z.string().optional(),
});

export const adminDashboardFiltersSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  severity: z.string().optional(),
  assignedTo: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Enhanced validation schemas for new tables
export const insertKycInformationSchema = createInsertSchema(kycInformation).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  reviewedAt: true,
}).extend({
  documentType: z.enum(['passport', 'drivers_license', 'national_id']),
  fullName: z.string().min(1, 'Full name is required').max(100, 'Full name too long'),
  documentNumber: z.string().min(1, 'Document number is required').max(50, 'Document number too long'),
  documentCountry: z.string().min(2, 'Country code required').max(3, 'Invalid country code'),
  nationality: z.string().min(2, 'Nationality required').max(50, 'Nationality too long'),
});

export const insertWalletBindingSchema = createInsertSchema(walletBindings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
  revokedAt: true,
}).extend({
  walletType: z.enum(['plug', 'internetIdentity', 'metamask', 'ledger']),
  walletAddress: z.string().min(1, 'Wallet address is required'),
});

export const insertMfaTokenSchema = createInsertSchema(mfaTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
}).extend({
  tokenType: z.enum(['totp', 'backup_code', 'sms']),
  tokenValue: z.string().min(1, 'Token value is required'),
});

export const insertUserActivityLogSchema = createInsertSchema(userActivityLog).omit({
  id: true,
  createdAt: true,
}).extend({
  activityType: z.enum(['login', 'logout', 'password_change', 'profile_update', 'wallet_bind', 'kyc_submit', 'mfa_setup', 'mfa_disable']),
});

// User profile management schemas
export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email format').max(320, 'Email too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  firstName: z.string().min(1, 'First name required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name required').max(50, 'Last name too long'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"],
});

export const mfaSetupSchema = z.object({
  totpCode: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d{6}$/, 'TOTP code must be numeric'),
});

// Type exports (preserving existing ones for compatibility)
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert; // Keep for Replit Auth compatibility
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

// RWAPAWN Token types
export type RwapawnPurchase = typeof rwapawnPurchases.$inferSelect;
export type InsertRwapawnPurchase = z.infer<typeof insertRwapawnPurchaseSchema>;
export type RwapawnStake = typeof rwapawnStakes.$inferSelect;
export type InsertRwapawnStake = z.infer<typeof insertRwapawnStakeSchema>;
export type RwapawnSwap = typeof rwapawnSwaps.$inferSelect;
export type InsertRwapawnSwap = z.infer<typeof insertRwapawnSwapSchema>;
export type RwapawnBalance = typeof rwapawnBalances.$inferSelect;
export type InsertRwapawnBalance = z.infer<typeof insertRwapawnBalanceSchema>;

// Bridge types
export type SupportedNetwork = z.infer<typeof supportedNetworks>;
export type SupportedToken = z.infer<typeof supportedTokens>;
export type BridgeStatus = z.infer<typeof bridgeStatus>;
export type BridgeEstimation = z.infer<typeof bridgeEstimationSchema>;
export type BridgeInitiation = z.infer<typeof bridgeInitiationSchema>;
export type BridgeStatusUpdate = z.infer<typeof bridgeStatusUpdateSchema>;
export type BridgeHistoryFilter = z.infer<typeof bridgeHistoryFilterSchema>;
export type BridgeNetworkConfig = z.infer<typeof bridgeNetworkConfig>;
export type BridgeEstimationResponse = z.infer<typeof bridgeEstimationResponseSchema>;

// Pricing types
export type AssetPricingCache = typeof assetPricingCache.$inferSelect;
export type InsertAssetPricingCache = z.infer<typeof insertAssetPricingCacheSchema>;
export type PricingEstimate = typeof pricingEstimates.$inferSelect;
export type InsertPricingEstimate = z.infer<typeof insertPricingEstimateSchema>;
export type PricingQuery = z.infer<typeof pricingQuerySchema>;
export type PricingResponse = z.infer<typeof pricingResponseSchema>;

// Document Analysis types
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type DocumentAnalysisResult = typeof documentAnalysisResults.$inferSelect;
export type InsertDocumentAnalysisResult = z.infer<typeof insertDocumentAnalysisResultSchema>;
export type FraudDetectionResult = typeof fraudDetectionResults.$inferSelect;
export type InsertFraudDetectionResult = z.infer<typeof insertFraudDetectionResultSchema>;
export type DocumentVerification = typeof documentVerifications.$inferSelect;
export type InsertDocumentVerification = z.infer<typeof insertDocumentVerificationSchema>;
export type DocumentAnalysisQueue = typeof documentAnalysisQueue.$inferSelect;
export type InsertDocumentAnalysisQueue = z.infer<typeof insertDocumentAnalysisQueueSchema>;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;

// Document Analysis API types
export type DocumentUpload = z.infer<typeof documentUploadSchema>;
export type DocumentAnalysisRequest = z.infer<typeof documentAnalysisRequestSchema>;
export type DocumentVerificationRequest = z.infer<typeof documentVerificationSchema>;
export type FraudDetectionConfig = z.infer<typeof fraudDetectionConfigSchema>;
export type BatchDocumentAnalysis = z.infer<typeof batchDocumentAnalysisSchema>;
export type DocumentSearch = z.infer<typeof documentSearchSchema>;

// Admin Management types
export type AdminAction = typeof adminActions.$inferSelect;
export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;
export type FraudAlert = typeof fraudAlerts.$inferSelect;
export type InsertFraudAlert = z.infer<typeof insertFraudAlertSchema>;
export type AssetReview = typeof assetReviews.$inferSelect;
export type InsertAssetReview = z.infer<typeof insertAssetReviewSchema>;
export type UserFlag = typeof userFlags.$inferSelect;
export type InsertUserFlag = z.infer<typeof insertUserFlagSchema>;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;

// Admin API types
export type AdminActionCreate = z.infer<typeof adminActionCreateSchema>;
export type FraudAlertUpdate = z.infer<typeof fraudAlertUpdateSchema>;
export type AssetReviewUpdate = z.infer<typeof assetReviewUpdateSchema>;
export type UserFlagCreate = z.infer<typeof userFlagCreateSchema>;
export type AdminDashboardFilters = z.infer<typeof adminDashboardFiltersSchema>;

// New user management types
export type KycInformation = typeof kycInformation.$inferSelect;
export type InsertKycInformation = z.infer<typeof insertKycInformationSchema>;
export type WalletBinding = typeof walletBindings.$inferSelect;
export type InsertWalletBinding = z.infer<typeof insertWalletBindingSchema>;
export type MfaToken = typeof mfaTokens.$inferSelect;
export type InsertMfaToken = z.infer<typeof insertMfaTokenSchema>;
export type UserActivityLog = typeof userActivityLog.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;

// User authentication form types
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type MfaSetup = z.infer<typeof mfaSetupSchema>;
