import crypto from 'crypto';
import { db } from './db';
import { userActivityLog, type InsertUserActivityLog } from '@shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

export interface AuditLogEntry {
  id?: string;
  userId?: string;
  activityType: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  details?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
  timestamp?: Date;
  // Tamper-evident fields
  previousHash?: string;
  currentHash?: string;
}

export interface AuditTrail {
  entries: AuditLogEntry[];
  totalCount: number;
  integrityVerified: boolean;
}

export class AuditLogger {
  private static readonly HASH_ALGORITHM = 'sha256';
  private static lastKnownHash: string | null = null;
  
  /**
   * Log an audit event with tamper-evident hashing
   */
  static async logEvent(entry: AuditLogEntry): Promise<void> {
    try {
      // Get the last hash for chain integrity
      const previousHash = await this.getLastHash();
      
      // Create audit entry
      const auditEntry: InsertUserActivityLog = {
        userId: entry.userId,
        activityType: entry.activityType,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        location: entry.location || await this.getLocationFromIP(entry.ipAddress),
        details: {
          ...entry.details,
          // Add tamper-evident data
          previousHash,
          auditMetadata: {
            loggedAt: new Date().toISOString(),
            source: 'audit-logger',
            version: '1.0'
          }
        },
        success: entry.success ?? true,
        errorMessage: entry.errorMessage
      };
      
      // Calculate hash for this entry
      const currentHash = this.calculateEntryHash(auditEntry, previousHash);
      auditEntry.details = {
        ...auditEntry.details,
        currentHash
      };
      
      // Store in database
      await db.insert(userActivityLog).values(auditEntry);
      
      // Update last known hash
      this.lastKnownHash = currentHash;
      
      console.log(`Audit log entry created: ${entry.activityType} for user ${entry.userId}`);
    } catch (error) {
      console.error('Failed to create audit log entry:', error);
      // In production, this should trigger alerts
      throw new Error('Audit logging failure - system security compromised');
    }
  }
  
  /**
   * Log user authentication events
   */
  static async logAuth(userId: string, event: 'login' | 'logout' | 'login_failed', req: any, details?: any) {
    await this.logEvent({
      userId,
      activityType: event,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: event !== 'login_failed',
      details: {
        ...details,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  /**
   * Log admin actions
   */
  static async logAdminAction(adminId: string, action: string, targetId: string, req: any, details?: any) {
    await this.logEvent({
      userId: adminId,
      activityType: 'admin_action',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        action,
        targetId,
        ...details,
        severity: 'high',
        requiresReview: true
      }
    });
  }
  
  /**
   * Log payment transactions
   */
  static async logPayment(userId: string, event: 'payment_initiated' | 'payment_completed' | 'payment_failed', req: any, details?: any) {
    await this.logEvent({
      userId,
      activityType: event,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: event === 'payment_completed',
      details: {
        ...details,
        pciCompliant: true,
        // Don't log sensitive payment data
        amount: details?.amount ? '***' : undefined,
        paymentMethodId: details?.paymentMethodId ? 'pm_***' : undefined
      }
    });
  }
  
  /**
   * Log KYC events
   */
  static async logKYC(userId: string, event: string, req: any, details?: any) {
    await this.logEvent({
      userId,
      activityType: event,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        ...details,
        dataType: 'pii',
        encrypted: true
      }
    });
  }
  
  /**
   * Log security events
   */
  static async logSecurityEvent(event: string, req: any, details?: any) {
    await this.logEvent({
      activityType: `security_${event}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: details?.success ?? false,
      details: {
        ...details,
        severity: details?.severity || 'high',
        alertRequired: true
      }
    });
  }
  
  /**
   * Retrieve audit trail with integrity verification
   */
  static async getAuditTrail(userId?: string, limit: number = 100): Promise<AuditTrail> {
    try {
      let query = db.select().from(userActivityLog);
      
      if (userId) {
        query = query.where(eq(userActivityLog.userId, userId));
      }
      
      const entries = await query.orderBy(desc(userActivityLog.createdAt)).limit(limit);
      
      // Verify integrity of retrieved entries
      const integrityVerified = await this.verifyChainIntegrity(entries);
      
      return {
        entries: entries.map(entry => ({
          id: entry.id,
          userId: entry.userId || undefined,
          activityType: entry.activityType,
          ipAddress: entry.ipAddress || undefined,
          userAgent: entry.userAgent || undefined,
          location: entry.location || undefined,
          details: entry.details as Record<string, any>,
          success: entry.success ?? true,
          errorMessage: entry.errorMessage || undefined,
          timestamp: entry.createdAt || undefined,
          previousHash: entry.details?.previousHash,
          currentHash: entry.details?.currentHash
        })),
        totalCount: entries.length,
        integrityVerified
      };
    } catch (error) {
      console.error('Failed to retrieve audit trail:', error);
      throw new Error('Audit trail retrieval failed');
    }
  }
  
  /**
   * Generate audit report for compliance
   */
  static async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const entries = await db.select()
      .from(userActivityLog)
      .where(and(
        gte(userActivityLog.createdAt, startDate),
        gte(endDate, userActivityLog.createdAt)
      ))
      .orderBy(desc(userActivityLog.createdAt));
      
    const report = {
      period: { startDate, endDate },
      totalEvents: entries.length,
      eventTypes: this.categorizeEvents(entries),
      securityEvents: entries.filter(e => e.activityType.startsWith('security_')),
      adminActions: entries.filter(e => e.activityType === 'admin_action'),
      authEvents: entries.filter(e => ['login', 'logout', 'login_failed'].includes(e.activityType)),
      integrityStatus: await this.verifyChainIntegrity(entries),
      generatedAt: new Date().toISOString()
    };
    
    return report;
  }
  
  /**
   * Calculate hash for tamper-evident logging
   */
  private static calculateEntryHash(entry: InsertUserActivityLog, previousHash: string | null): string {
    const dataToHash = {
      userId: entry.userId,
      activityType: entry.activityType,
      timestamp: entry.details?.auditMetadata?.loggedAt,
      previousHash,
      details: JSON.stringify(entry.details)
    };
    
    return crypto.createHash(this.HASH_ALGORITHM)
      .update(JSON.stringify(dataToHash))
      .digest('hex');
  }
  
  /**
   * Get the last hash in the chain
   */
  private static async getLastHash(): Promise<string | null> {
    if (this.lastKnownHash) {
      return this.lastKnownHash;
    }
    
    try {
      const [lastEntry] = await db.select()
        .from(userActivityLog)
        .orderBy(desc(userActivityLog.createdAt))
        .limit(1);
        
      if (lastEntry && lastEntry.details?.currentHash) {
        this.lastKnownHash = lastEntry.details.currentHash;
        return this.lastKnownHash;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get last hash:', error);
      return null;
    }
  }
  
  /**
   * Verify the integrity of the audit log chain
   */
  private static async verifyChainIntegrity(entries: any[]): Promise<boolean> {
    try {
      for (let i = 0; i < entries.length - 1; i++) {
        const current = entries[i];
        const next = entries[i + 1];
        
        if (current.details?.previousHash !== next.details?.currentHash) {
          console.warn(`Audit log integrity violation detected between entries ${current.id} and ${next.id}`);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to verify audit log integrity:', error);
      return false;
    }
  }
  
  /**
   * Get approximate location from IP address
   */
  private static async getLocationFromIP(ipAddress?: string): Promise<string | undefined> {
    // In production, use a GeoIP service
    // For now, return a placeholder
    if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1') {
      return 'localhost';
    }
    return 'Unknown';
  }
  
  /**
   * Categorize events for reporting
   */
  private static categorizeEvents(entries: any[]): Record<string, number> {
    const categories: Record<string, number> = {};
    
    entries.forEach(entry => {
      categories[entry.activityType] = (categories[entry.activityType] || 0) + 1;
    });
    
    return categories;
  }
}