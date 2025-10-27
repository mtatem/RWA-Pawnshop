// Bridge Transaction Monitoring Service - Enhanced with Durable Database-Backed Job Scheduling
// Provides real-time monitoring and status updates for Chain Fusion bridge transactions
// PRODUCTION-READY: Survives process restarts and uses database persistence

import { chainFusionBridge } from "./chain-fusion-bridge";
import { storage } from "../storage";
import { BridgeTransaction, BridgeStatus } from "@shared/schema";
import { db } from "../db";
import { sql, eq, and, lt } from "drizzle-orm";
import { pgTable, varchar, timestamp, integer, text, boolean } from "drizzle-orm/pg-core";

// Database table for durable monitoring jobs - CRITICAL for production restart safety
const monitoringJobs = pgTable("monitoring_jobs", {
  id: varchar("id").primaryKey(), // transaction ID being monitored
  status: text("status").notNull(), // transaction status (pending/processing)
  nextCheckAt: timestamp("next_check_at").notNull(), // when to check next
  intervalMs: integer("interval_ms").notNull(), // monitoring interval
  retryCount: integer("retry_count").default(0), // failed attempts count
  maxRetries: integer("max_retries").default(3), // max retry attempts
  lastError: text("last_error"), // last error message
  isActive: boolean("is_active").default(true), // job enabled/disabled
  lockedBy: varchar("locked_by"), // advisory lock holder
  lockedAt: timestamp("locked_at"), // when lock was acquired
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Monitoring intervals (in milliseconds)
const MONITORING_INTERVALS = {
  pending: 30000,    // Check every 30 seconds for pending transactions
  processing: 15000, // Check every 15 seconds for processing transactions  
  completed: 0,      // No monitoring needed
  failed: 0,         // No monitoring needed
  refunded: 0        // No monitoring needed
} as const;

// Advisory lock timeout (5 minutes)
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

// Bridge monitoring statistics
interface MonitoringStats {
  totalTransactions: number;
  pendingTransactions: number;
  processingTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  averageCompletionTime: number;
  successRate: number;
}

export class BridgeMonitorService {
  private static instance: BridgeMonitorService;
  private globalTimer: NodeJS.Timeout | null = null; // Single global timer for job scheduling
  private instanceId: string; // Unique instance ID for advisory locks
  private isRunning: boolean = false;
  private stats: MonitoringStats = {
    totalTransactions: 0,
    pendingTransactions: 0,
    processingTransactions: 0,
    completedTransactions: 0,
    failedTransactions: 0,
    averageCompletionTime: 0,
    successRate: 0
  };

  constructor() {
    // Generate unique instance ID for advisory locking
    this.instanceId = `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static getInstance(): BridgeMonitorService {
    if (!BridgeMonitorService.instance) {
      BridgeMonitorService.instance = new BridgeMonitorService();
    }
    return BridgeMonitorService.instance;
  }

  // Start bridge monitoring service with database-backed durability
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log("Bridge monitoring is already running");
      return;
    }

    console.log("Starting Bridge Transaction Monitoring Service (Durable Database-Backed)...");
    this.isRunning = true;

    // Create monitoring jobs table if it doesn't exist
    await this.ensureMonitoringJobsTable();

    // Clean up any stale locks from previous instances
    await this.cleanupStaleLocks();

    // Recover monitoring jobs from database (restart safety)
    await this.recoverMonitoringJobsFromDatabase();

    // CRITICAL: Enroll all active transactions for monitoring (handles new transactions without DB jobs)
    await this.monitorActiveTransactions();

    // Start the global job scheduler
    this.startGlobalJobScheduler();

    console.log("Bridge monitoring service started successfully with database persistence");
  }

  // Stop bridge monitoring service 
  stopMonitoring(): void {
    if (!this.isRunning) {
      return;
    }

    console.log("Stopping Bridge Transaction Monitoring Service...");
    this.isRunning = false;

    // Clear global timer
    if (this.globalTimer) {
      clearTimeout(this.globalTimer);
      this.globalTimer = null;
    }

    console.log("Bridge monitoring service stopped");
  }

  // PRODUCTION-READY: Create monitoring jobs table if it doesn't exist
  private async ensureMonitoringJobsTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS monitoring_jobs (
          id varchar PRIMARY KEY,
          status text NOT NULL,
          next_check_at timestamp NOT NULL,
          interval_ms integer NOT NULL,
          retry_count integer DEFAULT 0,
          max_retries integer DEFAULT 3,
          last_error text,
          is_active boolean DEFAULT true,
          locked_by varchar,
          locked_at timestamp,
          created_at timestamp DEFAULT NOW(),
          updated_at timestamp DEFAULT NOW()
        );
      `);
      
      // Create index for efficient job scheduling queries
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_next_check 
        ON monitoring_jobs(next_check_at) 
        WHERE is_active = true;
      `);
      
      console.log("Monitoring jobs table ensured for database persistence");
    } catch (error) {
      console.error("Error creating monitoring jobs table:", error);
      throw new Error("Failed to initialize monitoring jobs table");
    }
  }

  // PRODUCTION-READY: Clean up stale locks from previous instances
  private async cleanupStaleLocks(): Promise<void> {
    try {
      const staleTime = new Date(Date.now() - LOCK_TIMEOUT_MS);
      
      const result = await db.execute(sql`
        UPDATE monitoring_jobs 
        SET locked_by = NULL, locked_at = NULL, updated_at = NOW()
        WHERE locked_at < ${staleTime} OR locked_by = ${this.instanceId}
      `);
      
      console.log(`Cleaned up stale monitoring locks (affected: ${result.rowCount} jobs)`);
    } catch (error) {
      console.error("Error cleaning up stale locks:", error);
      // Don't throw - this is best effort cleanup
    }
  }

  // PRODUCTION-READY: Recover monitoring jobs from database after restart
  private async recoverMonitoringJobsFromDatabase(): Promise<void> {
    try {
      // Get all active monitoring jobs from database
      const activeJobs = await db.execute(sql`
        SELECT id, status, next_check_at, interval_ms, retry_count, max_retries
        FROM monitoring_jobs 
        WHERE is_active = true AND locked_by IS NULL
        ORDER BY next_check_at ASC
      `);

      console.log(`Recovered ${activeJobs.rowCount} monitoring jobs from database`);

      // Validate each job still needs monitoring
      if (activeJobs.rows) {
        for (const job of activeJobs.rows) {
          const transaction = await storage.getBridgeTransaction(job.id as string);
          
          if (!transaction || ['completed', 'failed', 'refunded'].includes(transaction.status)) {
            // Transaction no longer needs monitoring - deactivate job
            await this.deactivateMonitoringJob(job.id as string);
            console.log(`Deactivated monitoring job for completed transaction: ${job.id}`);
          }
        }
      }

      await this.updateStats();
    } catch (error) {
      console.error("Error recovering monitoring jobs from database:", error);
      throw new Error("Failed to recover monitoring jobs - system may have inconsistent state");
    }
  }

  // PRODUCTION-READY: Start global job scheduler with database polling
  private startGlobalJobScheduler(): void {
    const scheduleNextCheck = async () => {
      if (!this.isRunning) return;

      try {
        await this.processReadyMonitoringJobs();
      } catch (error) {
        console.error("Error processing monitoring jobs:", error);
      }

      // Schedule next check in 5 seconds
      this.globalTimer = setTimeout(scheduleNextCheck, 5000);
    };

    scheduleNextCheck();
    console.log("Global job scheduler started with 5-second polling interval");
  }

  // PRODUCTION-READY: Process monitoring jobs that are ready to run
  private async processReadyMonitoringJobs(): Promise<void> {
    try {
      const now = new Date();
      
      // Get jobs ready for processing with advisory locking
      const readyJobs = await db.execute(sql`
        UPDATE monitoring_jobs 
        SET locked_by = ${this.instanceId}, locked_at = NOW(), updated_at = NOW()
        WHERE id IN (
          SELECT id FROM monitoring_jobs 
          WHERE is_active = true 
            AND locked_by IS NULL 
            AND next_check_at <= ${now}
          ORDER BY next_check_at ASC 
          LIMIT 10
        )
        RETURNING id, status, interval_ms, retry_count, max_retries
      `);

      if (readyJobs.rows && readyJobs.rows.length > 0) {
        console.log(`Processing ${readyJobs.rows.length} ready monitoring jobs`);
        
        // Process each job
        for (const job of readyJobs.rows) {
          await this.processMonitoringJob(
            job.id as string,
            job.status as string,
            job.interval_ms as number,
            job.retry_count as number,
            job.max_retries as number
          );
        }
      }
    } catch (error) {
      console.error("Error processing ready monitoring jobs:", error);
    }
  }

  // Monitor all active bridge transactions
  private async monitorActiveTransactions(): Promise<void> {
    try {
      // Get pending transactions
      const pendingTransactions = await storage.getBridgeTransactionsByStatus('pending');
      const processingTransactions = await storage.getBridgeTransactionsByStatus('processing');

      const activeTransactions = [...pendingTransactions, ...processingTransactions];

      console.log(`Found ${activeTransactions.length} active bridge transactions to monitor`);

      // Start monitoring each active transaction
      for (const transaction of activeTransactions) {
        await this.startMonitoringTransaction(transaction.id);
      }

      await this.updateStats();
    } catch (error) {
      console.error("Error monitoring active transactions:", error);
    }
  }

  // PRODUCTION-READY: Start monitoring a specific bridge transaction with database persistence
  async startMonitoringTransaction(transactionId: string): Promise<void> {
    try {
      const transaction = await storage.getBridgeTransaction(transactionId);
      if (!transaction) {
        console.warn(`Transaction ${transactionId} not found for monitoring`);
        return;
      }

      // Skip if transaction is already complete or failed
      if (['completed', 'failed', 'refunded'].includes(transaction.status)) {
        await this.deactivateMonitoringJob(transactionId);
        return;
      }

      const interval = MONITORING_INTERVALS[transaction.status as keyof typeof MONITORING_INTERVALS];
      if (interval > 0) {
        const nextCheckAt = new Date(Date.now() + interval);
        
        // Create or update monitoring job in database
        await db.execute(sql`
          INSERT INTO monitoring_jobs (id, status, next_check_at, interval_ms, retry_count, max_retries, is_active)
          VALUES (${transactionId}, ${transaction.status}, ${nextCheckAt}, ${interval}, 0, 3, true)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            next_check_at = EXCLUDED.next_check_at,
            interval_ms = EXCLUDED.interval_ms,
            retry_count = 0,
            is_active = true,
            locked_by = NULL,
            locked_at = NULL,
            updated_at = NOW()
        `);

        console.log(`Started database-backed monitoring for transaction ${transactionId} (status: ${transaction.status}, next check: ${nextCheckAt.toISOString()})`);
      }
    } catch (error) {
      console.error(`Error starting monitoring for transaction ${transactionId}:`, error);
    }
  }

  // PRODUCTION-READY: Process a specific monitoring job with retry logic
  private async processMonitoringJob(
    transactionId: string,
    status: string,
    intervalMs: number,
    retryCount: number,
    maxRetries: number
  ): Promise<void> {
    try {
      // Check and update transaction status
      await this.checkTransactionStatus(transactionId);
      
      // Get updated transaction to determine next action
      const transaction = await storage.getBridgeTransaction(transactionId);
      if (!transaction) {
        await this.deactivateMonitoringJob(transactionId);
        return;
      }

      // If transaction is complete, deactivate monitoring
      if (['completed', 'failed', 'refunded'].includes(transaction.status)) {
        await this.deactivateMonitoringJob(transactionId);
        await this.unlockMonitoringJob(transactionId);
        return;
      }

      // Schedule next check
      const newInterval = MONITORING_INTERVALS[transaction.status as keyof typeof MONITORING_INTERVALS];
      if (newInterval > 0) {
        const nextCheckAt = new Date(Date.now() + newInterval);
        
        await db.execute(sql`
          UPDATE monitoring_jobs 
          SET next_check_at = ${nextCheckAt},
              interval_ms = ${newInterval},
              retry_count = 0,
              last_error = NULL,
              locked_by = NULL,
              locked_at = NULL,
              updated_at = NOW()
          WHERE id = ${transactionId}
        `);
      } else {
        await this.deactivateMonitoringJob(transactionId);
      }

    } catch (error) {
      console.error(`Error processing monitoring job for transaction ${transactionId}:`, error);
      
      // Handle retry logic
      const newRetryCount = retryCount + 1;
      if (newRetryCount >= maxRetries) {
        console.error(`Max retries reached for transaction ${transactionId}, deactivating monitoring`);
        await this.deactivateMonitoringJob(transactionId);
      } else {
        // Retry with exponential backoff
        const backoffMs = Math.min(intervalMs * Math.pow(2, newRetryCount), 300000); // Max 5 minutes
        const nextCheckAt = new Date(Date.now() + backoffMs);
        
        await db.execute(sql`
          UPDATE monitoring_jobs 
          SET next_check_at = ${nextCheckAt},
              retry_count = ${newRetryCount},
              last_error = ${error instanceof Error ? error.message : 'Unknown error'},
              locked_by = NULL,
              locked_at = NULL,
              updated_at = NOW()
          WHERE id = ${transactionId}
        `);
        
        console.log(`Scheduled retry ${newRetryCount}/${maxRetries} for transaction ${transactionId} in ${backoffMs}ms`);
      }
    }
  }

  // PRODUCTION-READY: Deactivate a monitoring job
  private async deactivateMonitoringJob(transactionId: string): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE monitoring_jobs 
        SET is_active = false, locked_by = NULL, locked_at = NULL, updated_at = NOW()
        WHERE id = ${transactionId}
      `);
      console.log(`Deactivated monitoring job for transaction ${transactionId}`);
    } catch (error) {
      console.error(`Error deactivating monitoring job for transaction ${transactionId}:`, error);
    }
  }

  // PRODUCTION-READY: Unlock a monitoring job
  private async unlockMonitoringJob(transactionId: string): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE monitoring_jobs 
        SET locked_by = NULL, locked_at = NULL, updated_at = NOW()
        WHERE id = ${transactionId} AND locked_by = ${this.instanceId}
      `);
    } catch (error) {
      console.error(`Error unlocking monitoring job for transaction ${transactionId}:`, error);
    }
  }

  // Stop monitoring a specific bridge transaction (deactivate database job)
  async stopMonitoringTransaction(transactionId: string): Promise<void> {
    await this.deactivateMonitoringJob(transactionId);
  }

  // Check and update bridge transaction status
  private async checkTransactionStatus(transactionId: string): Promise<void> {
    try {
      const transaction = await storage.getBridgeTransaction(transactionId);
      if (!transaction) {
        console.warn(`Transaction ${transactionId} not found during status check`);
        await this.stopMonitoringTransaction(transactionId);
        return;
      }

      console.log(`Checking status for bridge transaction ${transactionId} (current: ${transaction.status})`);

      let statusUpdate: Partial<BridgeTransaction> = {};
      let newStatus: BridgeStatus = transaction.status as BridgeStatus;

      if (transaction.status === 'pending') {
        // Check if transaction has been initiated (has source transaction hash)
        const bridgeStatus = await chainFusionBridge.getBridgeStatus(transactionId);
        if (bridgeStatus && bridgeStatus.txHashFrom) {
          newStatus = 'processing';
          statusUpdate = {
            txHashFrom: bridgeStatus.txHashFrom,
            confirmationsFrom: bridgeStatus.confirmationsFrom || 0
          };
        }

        // Check for timeout (mark as failed if pending too long)
        const timeoutMinutes = 60; // 60 minutes timeout
        const createdAt = transaction.createdAt ? new Date(transaction.createdAt) : new Date();
        const now = new Date();
        const timeDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60);

        if (timeDiff > timeoutMinutes) {
          newStatus = 'failed';
          statusUpdate = {
            errorMessage: `Transaction timed out after ${timeoutMinutes} minutes`
          };
        }
      } else if (transaction.status === 'processing') {
        // Check bridge completion status
        const bridgeStatus = await chainFusionBridge.getBridgeStatus(transactionId);
        if (bridgeStatus) {
          // Update confirmations
          statusUpdate = {
            confirmationsFrom: bridgeStatus.confirmationsFrom || transaction.confirmationsFrom || 0,
            confirmationsTo: bridgeStatus.confirmationsTo || transaction.confirmationsTo || 0
          };

          // Check if bridge is completed
          if (bridgeStatus.status === 'completed' && bridgeStatus.txHashTo) {
            newStatus = 'completed';
            statusUpdate = {
              ...statusUpdate,
              txHashTo: bridgeStatus.txHashTo,
              actualTime: transaction.createdAt ? this.calculateActualTime(transaction.createdAt) : 0,
              completedAt: new Date()
            };
          } else if (bridgeStatus.status === 'failed') {
            newStatus = 'failed';
            statusUpdate = {
              ...statusUpdate,
              errorMessage: bridgeStatus.errorMessage || 'Bridge processing failed'
            };
          }
        }

        // Check for processing timeout
        const processingTimeoutMinutes = 120; // 2 hours timeout
        const createdAt = transaction.createdAt ? new Date(transaction.createdAt) : new Date();
        const now = new Date();
        const timeDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60);

        if (timeDiff > processingTimeoutMinutes && newStatus === 'processing') {
          newStatus = 'failed';
          statusUpdate = {
            ...statusUpdate,
            errorMessage: `Processing timed out after ${processingTimeoutMinutes} minutes`
          };
        }
      }

      // Update transaction status if changed
      if (newStatus !== transaction.status) {
        await storage.updateBridgeTransactionStatus(transactionId, newStatus, statusUpdate);
        console.log(`Updated transaction ${transactionId} status: ${transaction.status} → ${newStatus}`);

        // Update monitoring based on new status
        if (['completed', 'failed', 'refunded'].includes(newStatus)) {
          this.stopMonitoringTransaction(transactionId);
        } else {
          // Restart monitoring with new interval
          await this.startMonitoringTransaction(transactionId);
        }

        await this.updateStats();
      } else if (Object.keys(statusUpdate).length > 0) {
        // Update transaction with new data (confirmations, etc.)
        await storage.updateBridgeTransaction(transactionId, statusUpdate);
        
        // Continue monitoring
        await this.startMonitoringTransaction(transactionId);
      } else {
        // Continue monitoring with same interval
        await this.startMonitoringTransaction(transactionId);
      }
    } catch (error) {
      console.error(`Error checking status for transaction ${transactionId}:`, error);
      
      // Continue monitoring despite error
      setTimeout(async () => {
        await this.startMonitoringTransaction(transactionId);
      }, 30000); // Retry after 30 seconds
    }
  }

  // Calculate actual completion time in minutes
  private calculateActualTime(createdAt: Date | string): number {
    const created = new Date(createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
  }

  // Start periodic monitoring for new transactions (now handled by database polling)
  // This method is kept for API compatibility but functionality is in global job scheduler
  private startPeriodicMonitoring(): void {
    console.log("Periodic monitoring handled by database-backed job scheduler");
  }

  // Update monitoring statistics
  private async updateStats(): Promise<void> {
    try {
      const [pending, processing, completed, failed] = await Promise.all([
        storage.getBridgeTransactionsByStatus('pending'),
        storage.getBridgeTransactionsByStatus('processing'), 
        storage.getBridgeTransactionsByStatus('completed'),
        storage.getBridgeTransactionsByStatus('failed')
      ]);

      const total = pending.length + processing.length + completed.length + failed.length;
      const successRate = total > 0 ? (completed.length / total) * 100 : 0;

      // Calculate average completion time from completed transactions
      const completedWithTimes = completed.filter(tx => tx.actualTime);
      const avgTime = completedWithTimes.length > 0
        ? completedWithTimes.reduce((sum, tx) => sum + (tx.actualTime || 0), 0) / completedWithTimes.length
        : 0;

      this.stats = {
        totalTransactions: total,
        pendingTransactions: pending.length,
        processingTransactions: processing.length,
        completedTransactions: completed.length,
        failedTransactions: failed.length,
        averageCompletionTime: Math.round(avgTime),
        successRate: Math.round(successRate * 100) / 100
      };
    } catch (error) {
      console.error("Error updating monitoring stats:", error);
    }
  }

  // Get monitoring statistics
  getStats(): MonitoringStats {
    return { ...this.stats };
  }

  // Get active monitoring count from database
  async getActiveMonitoringCount(): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count FROM monitoring_jobs WHERE is_active = true
      `);
      return result.rows?.[0]?.count as number || 0;
    } catch (error) {
      console.error("Error getting active monitoring count:", error);
      return 0;
    }
  }

  // Get transaction status with real-time monitoring info
  async getTransactionStatus(transactionId: string): Promise<BridgeTransaction | null> {
    const transaction = await storage.getBridgeTransaction(transactionId);
    if (!transaction) return null;

    // Check if being monitored in database
    const monitoringJob = await db.execute(sql`
      SELECT is_active FROM monitoring_jobs WHERE id = ${transactionId}
    `);

    // Add monitoring status
    const monitoringInfo = {
      isBeingMonitored: monitoringJob.rows?.[0]?.is_active as boolean || false,
      monitoringInterval: MONITORING_INTERVALS[transaction.status as keyof typeof MONITORING_INTERVALS],
      lastChecked: new Date().toISOString()
    };

    const bridgeData = transaction.bridgeData && typeof transaction.bridgeData === 'object' 
      ? transaction.bridgeData as Record<string, any>
      : {};

    return {
      ...transaction,
      bridgeData: {
        ...bridgeData,
        monitoring: monitoringInfo
      }
    };
  }

  // Force refresh a specific transaction status
  async forceRefreshTransaction(transactionId: string): Promise<BridgeTransaction | null> {
    console.log(`Force refreshing transaction ${transactionId}`);
    
    // Stop current monitoring
    await this.stopMonitoringTransaction(transactionId);
    
    // Check status immediately
    await this.checkTransactionStatus(transactionId);
    
    // Return updated transaction
    const transaction = await storage.getBridgeTransaction(transactionId);
    return transaction || null;
  }

  // Handle new bridge transaction creation
  async onBridgeTransactionCreated(transactionId: string): Promise<void> {
    console.log(`New bridge transaction created: ${transactionId}`);
    await this.startMonitoringTransaction(transactionId);
    await this.updateStats();
  }

  // Cleanup stuck transactions (admin function)
  async cleanupStuckTransactions(): Promise<{ cleaned: number; errors: string[] }> {
    const results = { cleaned: 0, errors: [] as string[] };

    try {
      const stuckTransactions = await storage.getBridgeTransactionsWithFilters({
        status: 'processing'
      });

      const now = new Date();
      
      for (const transaction of stuckTransactions) {
        try {
          const createdAt = transaction.createdAt ? new Date(transaction.createdAt) : new Date();
          const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

          // Mark transactions older than 6 hours as failed
          if (hoursDiff > 6) {
            await storage.updateBridgeTransactionStatus(
              transaction.id,
              'failed',
              {
                errorMessage: `Automatically marked as failed after ${Math.round(hoursDiff)} hours`
              }
            );
            
            await this.stopMonitoringTransaction(transaction.id);
            results.cleaned++;
            
            console.log(`Cleaned up stuck transaction ${transaction.id} (${Math.round(hoursDiff)} hours old)`);
          }
        } catch (error) {
          const errorMsg = `Error cleaning transaction ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      await this.updateStats();
    } catch (error) {
      const errorMsg = `Error during cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errors.push(errorMsg);
      console.error(errorMsg);
    }

    return results;
  }
}

export const bridgeMonitor = BridgeMonitorService.getInstance();