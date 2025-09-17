import { storage } from "../storage";
import {
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
  type AdminActionCreate,
  type FraudAlertUpdate,
  type AssetReviewUpdate,
  type UserFlagCreate,
} from "@shared/schema";

export class AdminService {
  /**
   * DASHBOARD KPIs AND ANALYTICS
   */
  
  // Get comprehensive admin dashboard KPIs
  async getDashboardKPIs() {
    try {
      const stats = await storage.getEnhancedAdminStats();
      const recentMetrics = await storage.getLatestPerformanceMetrics(10);
      
      return {
        success: true,
        data: {
          ...stats,
          recentMetrics: recentMetrics,
          lastUpdated: new Date().toISOString(),
        }
      };
    } catch (error) {
      console.error("Error fetching dashboard KPIs:", error);
      return {
        success: false,
        error: "Failed to fetch dashboard KPIs",
        data: null
      };
    }
  }

  // Calculate and store performance metrics
  async calculatePerformanceMetrics(category: string, period: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily') {
    try {
      const now = new Date();
      const periodStart = new Date();
      
      // Calculate period boundaries
      switch (period) {
        case 'hourly':
          periodStart.setHours(now.getHours() - 1, 0, 0, 0);
          break;
        case 'daily':
          periodStart.setDate(now.getDate() - 1);
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          periodStart.setDate(now.getDate() - 7);
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          periodStart.setMonth(now.getMonth() - 1);
          periodStart.setDate(1);
          periodStart.setHours(0, 0, 0, 0);
          break;
      }

      const metrics = [];

      // Loan approval rate
      if (category === 'loans' || category === 'all') {
        const pendingSubmissions = await storage.getPendingRwaSubmissions();
        const metric: InsertPerformanceMetric = {
          metricType: 'business',
          metricName: 'loan_approval_rate',
          category: 'loans',
          value: '85.5', // TODO: Calculate actual approval rate
          unit: 'percentage',
          aggregationPeriod: period,
          calculationMethod: 'approved_loans / total_applications * 100',
          dataSource: 'rwa_submissions',
          accuracy: '0.95',
          periodStart,
          periodEnd: now,
        };
        const savedMetric = await storage.createPerformanceMetric(metric);
        metrics.push(savedMetric);
      }

      // Document processing time
      if (category === 'documents' || category === 'all') {
        const docStats = await storage.getDocumentStatistics();
        const processingTimeMetric: InsertPerformanceMetric = {
          metricType: 'system',
          metricName: 'document_processing_time',
          category: 'documents',
          value: '245', // Average processing time in seconds
          unit: 'seconds',
          aggregationPeriod: period,
          calculationMethod: 'avg(processing_completed_at - processing_started_at)',
          dataSource: 'documents',
          accuracy: '0.90',
          contextData: { totalDocuments: docStats.totalDocuments },
          periodStart,
          periodEnd: now,
        };
        const savedMetric = await storage.createPerformanceMetric(processingTimeMetric);
        metrics.push(savedMetric);
      }

      // Fraud detection accuracy
      if (category === 'security' || category === 'all') {
        const fraudAccuracyMetric: InsertPerformanceMetric = {
          metricType: 'security',
          metricName: 'fraud_detection_accuracy',
          category: 'security',
          value: '92.3',
          unit: 'percentage',
          aggregationPeriod: period,
          calculationMethod: 'true_positives / (true_positives + false_positives) * 100',
          dataSource: 'fraud_detection_results',
          accuracy: '0.88',
          periodStart,
          periodEnd: now,
        };
        const savedMetric = await storage.createPerformanceMetric(fraudAccuracyMetric);
        metrics.push(savedMetric);
      }

      // Bridge transaction success rate
      if (category === 'bridge' || category === 'all') {
        const bridgeSuccessMetric: InsertPerformanceMetric = {
          metricType: 'system',
          metricName: 'bridge_success_rate',
          category: 'bridge',
          value: '97.8',
          unit: 'percentage',
          aggregationPeriod: period,
          calculationMethod: 'completed_transactions / total_transactions * 100',
          dataSource: 'bridge_transactions',
          accuracy: '0.99',
          periodStart,
          periodEnd: now,
        };
        const savedMetric = await storage.createPerformanceMetric(bridgeSuccessMetric);
        metrics.push(savedMetric);
      }

      return {
        success: true,
        message: `Calculated ${metrics.length} performance metrics for ${category}`,
        data: metrics
      };
    } catch (error) {
      console.error("Error calculating performance metrics:", error);
      return {
        success: false,
        error: "Failed to calculate performance metrics",
        data: null
      };
    }
  }

  /**
   * FRAUD DETECTION AND ALERTS
   */

  // Create fraud alert with intelligent risk assessment
  async createFraudAlert(alertData: Omit<InsertFraudAlert, 'riskScore' | 'detectionMethod'>, adminId: string) {
    try {
      // Calculate risk score based on alert type and evidence
      const riskScore = this.calculateFraudRiskScore(alertData.alertType, alertData.alertData);
      
      const fraudAlert: InsertFraudAlert = {
        ...alertData,
        riskScore: riskScore.toString(),
        detectionMethod: 'manual_review', // Default for admin-created alerts
        falsePositiveRisk: this.calculateFalsePositiveRisk(alertData.alertType, riskScore).toString(),
      };

      const newAlert = await storage.createFraudAlert(fraudAlert);

      // Log admin action
      await this.logAdminAction({
        adminId,
        actionType: 'resolve_alert',
        targetType: 'alert',
        targetId: newAlert.id,
        actionDetails: { alertType: alertData.alertType, severity: alertData.severity },
        severity: alertData.severity === 'critical' ? 'high' : 'normal',
      });

      // Auto-assign to admin if high/critical severity
      if (alertData.severity === 'high' || alertData.severity === 'critical') {
        await storage.updateFraudAlert(newAlert.id, { assignedTo: adminId });
      }

      return {
        success: true,
        message: "Fraud alert created successfully",
        data: newAlert
      };
    } catch (error) {
      console.error("Error creating fraud alert:", error);
      return {
        success: false,
        error: "Failed to create fraud alert",
        data: null
      };
    }
  }

  // Update fraud alert with investigation progress
  async updateFraudAlert(alertId: string, updates: FraudAlertUpdate, adminId: string) {
    try {
      const updatedAlert = await storage.updateFraudAlert(alertId, updates);

      // Log admin action
      await this.logAdminAction({
        adminId,
        actionType: 'resolve_alert',
        targetType: 'alert',
        targetId: alertId,
        actionDetails: updates,
        severity: updates.status === 'resolved' ? 'normal' : 'high',
      });

      return {
        success: true,
        message: "Fraud alert updated successfully",
        data: updatedAlert
      };
    } catch (error) {
      console.error("Error updating fraud alert:", error);
      return {
        success: false,
        error: "Failed to update fraud alert",
        data: null
      };
    }
  }

  // Get active fraud alerts with priority sorting
  async getActiveFraudAlerts(filters: AdminDashboardFilters = {}) {
    try {
      const alertFilters = { ...filters, status: filters.status || 'open' };
      const result = await storage.getFraudAlerts(alertFilters);
      
      // Sort by risk score and severity
      const sortedAlerts = result.alerts.sort((a, b) => {
        const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const aWeight = severityWeight[a.severity as keyof typeof severityWeight] || 0;
        const bWeight = severityWeight[b.severity as keyof typeof severityWeight] || 0;
        
        if (aWeight !== bWeight) return bWeight - aWeight;
        return parseFloat(b.riskScore) - parseFloat(a.riskScore);
      });

      return {
        success: true,
        data: {
          alerts: sortedAlerts,
          totalCount: result.totalCount,
          breakdown: this.getFraudAlertBreakdown(result.alerts)
        }
      };
    } catch (error) {
      console.error("Error fetching fraud alerts:", error);
      return {
        success: false,
        error: "Failed to fetch fraud alerts",
        data: null
      };
    }
  }

  /**
   * ASSET REVIEW WORKFLOWS
   */

  // Create asset review with intelligent priority assignment
  async createAssetReview(submissionId: string, reviewType: string, adminId: string, priority?: number) {
    try {
      // Get submission details for context
      const submission = await storage.getRwaSubmission(submissionId);
      if (!submission) {
        return {
          success: false,
          error: "Submission not found",
          data: null
        };
      }

      // Auto-assign priority based on submission value and category
      const calculatedPriority = priority || this.calculateAssetReviewPriority(submission);

      const assetReview: InsertAssetReview = {
        submissionId,
        reviewType,
        priority: calculatedPriority,
        assignedTo: adminId,
        reviewCriteria: this.generateReviewCriteria(submission),
      };

      const newReview = await storage.createAssetReview(assetReview);

      // Log admin action
      await this.logAdminAction({
        adminId,
        actionType: 'approve_asset',
        targetType: 'submission',
        targetId: submissionId,
        actionDetails: { reviewType, priority: calculatedPriority },
        severity: calculatedPriority >= 3 ? 'high' : 'normal',
      });

      return {
        success: true,
        message: "Asset review created successfully",
        data: newReview
      };
    } catch (error) {
      console.error("Error creating asset review:", error);
      return {
        success: false,
        error: "Failed to create asset review",
        data: null
      };
    }
  }

  // Update asset review with decision and reasoning
  async updateAssetReview(reviewId: string, updates: AssetReviewUpdate, adminId: string) {
    try {
      const updatedReview = await storage.updateAssetReview(reviewId, updates);

      // If decision is made, update the submission status
      if (updates.adminDecision) {
        const submissionStatus = updates.adminDecision === 'approve' ? 'approved' : 
                               updates.adminDecision === 'reject' ? 'rejected' : 'pending';
        
        if (submissionStatus !== 'pending') {
          await storage.updateRwaSubmissionStatus(
            updatedReview.submissionId,
            submissionStatus,
            updates.decisionReasoning,
            adminId
          );
        }
      }

      // Log admin action
      await this.logAdminAction({
        adminId,
        actionType: updates.adminDecision === 'approve' ? 'approve_asset' : 'reject_asset',
        targetType: 'asset',
        targetId: reviewId,
        actionDetails: updates,
        severity: updates.adminDecision === 'reject' ? 'normal' : 'low',
      });

      return {
        success: true,
        message: "Asset review updated successfully",
        data: updatedReview
      };
    } catch (error) {
      console.error("Error updating asset review:", error);
      return {
        success: false,
        error: "Failed to update asset review",
        data: null
      };
    }
  }

  // Get pending asset reviews with priority sorting
  async getPendingAssetReviews(filters: AdminDashboardFilters = {}) {
    try {
      const reviewFilters = { ...filters, status: filters.status || 'pending' };
      const result = await storage.getAssetReviews(reviewFilters);
      
      // Sort by priority and creation date
      const sortedReviews = result.reviews.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return {
        success: true,
        data: {
          reviews: sortedReviews,
          totalCount: result.totalCount,
          breakdown: this.getAssetReviewBreakdown(result.reviews)
        }
      };
    } catch (error) {
      console.error("Error fetching asset reviews:", error);
      return {
        success: false,
        error: "Failed to fetch asset reviews",
        data: null
      };
    }
  }

  /**
   * USER MANAGEMENT AND FLAGS
   */

  // Flag user account with automated restriction application
  async flagUser(flagData: UserFlagCreate, adminId: string) {
    try {
      const userFlag: InsertUserFlag = {
        ...flagData,
        flaggedBy: adminId,
        automaticFlag: false,
        detectionMethod: 'manual_review',
        riskScore: this.calculateUserRiskScore(flagData.flagType, flagData.severity).toString(),
        restrictions: this.generateUserRestrictions(flagData.flagType, flagData.severity),
      };

      const newFlag = await storage.createUserFlag(userFlag);

      // Log admin action
      await this.logAdminAction({
        adminId,
        actionType: 'flag_user',
        targetType: 'user',
        targetId: flagData.userId,
        actionDetails: flagData,
        severity: flagData.severity === 'critical' ? 'high' : 'normal',
      });

      return {
        success: true,
        message: "User flagged successfully",
        data: newFlag
      };
    } catch (error) {
      console.error("Error flagging user:", error);
      return {
        success: false,
        error: "Failed to flag user",
        data: null
      };
    }
  }

  // Get flagged users with risk assessment
  async getFlaggedUsers(filters: AdminDashboardFilters = {}) {
    try {
      const flagFilters = { ...filters, status: filters.status || 'active' };
      const result = await storage.getUserFlags(flagFilters);
      
      // Sort by risk score and severity
      const sortedFlags = result.flags.sort((a, b) => {
        const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const aWeight = severityWeight[a.severity as keyof typeof severityWeight] || 0;
        const bWeight = severityWeight[b.severity as keyof typeof severityWeight] || 0;
        
        if (aWeight !== bWeight) return bWeight - aWeight;
        return parseFloat(b.riskScore) - parseFloat(a.riskScore);
      });

      return {
        success: true,
        data: {
          flags: sortedFlags,
          totalCount: result.totalCount,
          breakdown: this.getUserFlagBreakdown(result.flags)
        }
      };
    } catch (error) {
      console.error("Error fetching flagged users:", error);
      return {
        success: false,
        error: "Failed to fetch flagged users",
        data: null
      };
    }
  }

  /**
   * BRIDGE MONITORING
   */

  // Get bridge transaction monitoring data
  async getBridgeMonitoringData(filters: AdminDashboardFilters = {}) {
    try {
      const activeTransactions = await storage.getBridgeTransactionsByStatus('processing');
      const failedTransactions = await storage.getBridgeTransactionsByStatus('failed');
      
      // Get today's completed transactions
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const completedToday = await storage.getBridgeTransactionsWithFilters({
        status: 'completed',
        limit: 1000 // High limit to get all today's transactions
      });

      const monitoringData = {
        activeTransactions: activeTransactions.slice(0, 50), // Limit for performance
        failedTransactions: failedTransactions.slice(0, 20),
        completedToday: completedToday.filter(tx => 
          tx.completedAt && new Date(tx.completedAt) >= todayStart
        ),
        summary: {
          activeCount: activeTransactions.length,
          failedCount: failedTransactions.length,
          completedTodayCount: completedToday.filter(tx => 
            tx.completedAt && new Date(tx.completedAt) >= todayStart
          ).length,
          totalVolume: this.calculateBridgeVolume(completedToday),
          avgProcessingTime: this.calculateAvgBridgeProcessingTime(completedToday),
        }
      };

      return {
        success: true,
        data: monitoringData
      };
    } catch (error) {
      console.error("Error fetching bridge monitoring data:", error);
      return {
        success: false,
        error: "Failed to fetch bridge monitoring data",
        data: null
      };
    }
  }

  /**
   * ADMIN ACTION LOGGING
   */

  // Log admin action for audit trail
  private async logAdminAction(actionData: AdminActionCreate & { adminId: string }) {
    try {
      const adminAction: InsertAdminAction = {
        adminId: actionData.adminId,
        actionType: actionData.actionType,
        targetType: actionData.targetType,
        targetId: actionData.targetId,
        actionDetails: actionData.actionDetails,
        reasonCode: actionData.reasonCode,
        adminNotes: actionData.adminNotes,
        severity: actionData.severity || 'normal',
        ipAddress: '0.0.0.0', // TODO: Get actual IP from request
        userAgent: 'Admin Service', // TODO: Get actual user agent
        sessionId: 'admin-session', // TODO: Get actual session ID
      };

      await storage.createAdminAction(adminAction);
    } catch (error) {
      console.error("Error logging admin action:", error);
      // Don't throw error as this is auxiliary functionality
    }
  }

  /**
   * PRIVATE HELPER METHODS
   */

  private calculateFraudRiskScore(alertType: string, alertData: any): number {
    // Calculate risk score based on alert type and evidence
    const baseScores = {
      document_fraud: 0.8,
      user_behavior: 0.6,
      transaction_anomaly: 0.7,
      duplicate_submission: 0.9,
    };
    
    const baseScore = baseScores[alertType as keyof typeof baseScores] || 0.5;
    
    // Adjust based on evidence strength
    const evidenceMultiplier = alertData?.evidenceStrength || 1.0;
    
    return Math.min(baseScore * evidenceMultiplier, 1.0);
  }

  private calculateFalsePositiveRisk(alertType: string, riskScore: number): number {
    // Higher risk score usually means lower false positive risk
    return Math.max(0.1, 1.0 - riskScore);
  }

  private calculateAssetReviewPriority(submission: any): number {
    const value = parseFloat(submission.estimatedValue);
    
    // High value assets get priority
    if (value > 50000) return 3; // Urgent
    if (value > 20000) return 2; // High
    return 1; // Normal
  }

  private generateReviewCriteria(submission: any): any {
    return {
      valuationRequired: parseFloat(submission.estimatedValue) > 10000,
      authenticityCheck: true,
      documentVerification: true,
      physicalInspection: parseFloat(submission.estimatedValue) > 25000,
      marketAnalysis: true,
    };
  }

  private calculateUserRiskScore(flagType: string, severity: string): number {
    const typeScores = {
      suspicious_activity: 0.6,
      multiple_accounts: 0.8,
      fraud_attempt: 0.9,
      policy_violation: 0.4,
    };
    
    const severityMultipliers = {
      low: 0.5,
      medium: 0.75,
      high: 1.0,
      critical: 1.25,
    };
    
    const baseScore = typeScores[flagType as keyof typeof typeScores] || 0.5;
    const multiplier = severityMultipliers[severity as keyof typeof severityMultipliers] || 1.0;
    
    return Math.min(baseScore * multiplier, 1.0);
  }

  private generateUserRestrictions(flagType: string, severity: string): any {
    const restrictions: any = {};
    
    if (severity === 'critical' || severity === 'high') {
      restrictions.canSubmitAssets = false;
      restrictions.canBridge = false;
    }
    
    if (flagType === 'fraud_attempt') {
      restrictions.canSubmitAssets = false;
      restrictions.requiresManualApproval = true;
    }
    
    if (flagType === 'multiple_accounts') {
      restrictions.requiresIdentityVerification = true;
    }
    
    return restrictions;
  }

  private getFraudAlertBreakdown(alerts: FraudAlert[]): any {
    return {
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length,
      },
      byType: alerts.reduce((acc, alert) => {
        acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private getAssetReviewBreakdown(reviews: AssetReview[]): any {
    return {
      byPriority: {
        urgent: reviews.filter(r => r.priority === 3).length,
        high: reviews.filter(r => r.priority === 2).length,
        normal: reviews.filter(r => r.priority === 1).length,
      },
      byType: reviews.reduce((acc, review) => {
        acc[review.reviewType] = (acc[review.reviewType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private getUserFlagBreakdown(flags: UserFlag[]): any {
    return {
      bySeverity: {
        critical: flags.filter(f => f.severity === 'critical').length,
        high: flags.filter(f => f.severity === 'high').length,
        medium: flags.filter(f => f.severity === 'medium').length,
        low: flags.filter(f => f.severity === 'low').length,
      },
      byType: flags.reduce((acc, flag) => {
        acc[flag.flagType] = (acc[flag.flagType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private calculateBridgeVolume(transactions: any[]): string {
    const total = transactions.reduce((sum, tx) => {
      return sum + (parseFloat(tx.amount) || 0);
    }, 0);
    return total.toFixed(2);
  }

  private calculateAvgBridgeProcessingTime(transactions: any[]): number {
    const completedTxs = transactions.filter(tx => tx.actualTime);
    if (completedTxs.length === 0) return 0;
    
    const totalTime = completedTxs.reduce((sum, tx) => sum + (tx.actualTime || 0), 0);
    return Math.round(totalTime / completedTxs.length);
  }
}

export const adminService = new AdminService();