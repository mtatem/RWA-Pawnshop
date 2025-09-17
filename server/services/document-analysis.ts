import textractService, { TextractService, TextractResult, AnalysisOptions } from './textract-service';
import fraudDetectionService, { FraudDetectionService, FraudDetectionResult } from './fraud-detection';
import { storage } from '../storage';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

// Import types from schema
import type {
  Document,
  InsertDocument,
  DocumentAnalysisResult,
  InsertDocumentAnalysisResult,
  FraudDetectionResult as DBFraudDetectionResult,
  InsertFraudDetectionResult,
  DocumentAnalysisQueue,
  InsertDocumentAnalysisQueue,
  DocumentUpload,
  DocumentAnalysisRequest
} from '@shared/schema';

// File upload interface (standard for Express file uploads)
interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  fieldname?: string;
  encoding?: string;
}

interface DocumentAnalysisService {
  uploadAndAnalyze(file: UploadedFile, uploadData: DocumentUpload, userId: string): Promise<Document>;
  analyzeDocument(documentId: string, options?: Partial<AnalysisOptions>): Promise<DocumentAnalysisResult>;
  getAnalysisResult(documentId: string): Promise<DocumentAnalysisResult | null>;
  getFraudDetectionResult(documentId: string): Promise<DBFraudDetectionResult | null>;
  reanalyzeDocument(documentId: string, options?: Partial<AnalysisOptions>): Promise<DocumentAnalysisResult>;
  batchAnalyze(documentIds: string[], options?: Partial<AnalysisOptions>): Promise<BatchAnalysisResult>;
  getAnalysisQueue(): Promise<DocumentAnalysisQueue[]>;
  processQueuedDocument(queueId: string): Promise<void>;
  generateThumbnail(documentBuffer: Buffer, mimeType: string): Promise<Buffer | null>;
  validateDocument(file: UploadedFile): Promise<DocumentValidationResult>;
}

interface BatchAnalysisResult {
  processed: string[];
  failed: { documentId: string; error: string }[];
  queued: string[];
}

interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  fileInfo: {
    size: number;
    type: string;
    checksum: string;
  };
}

interface DocumentProcessingResult {
  document: Document;
  analysisResult?: DocumentAnalysisResult;
  fraudResult?: DBFraudDetectionResult;
  error?: string;
}

class DocumentAnalysisServiceImpl implements DocumentAnalysisService {
  private textractService: TextractService;
  private fraudDetectionService: FraudDetectionService;
  
  // Configuration
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly SUPPORTED_FORMATS = [
    'image/jpeg', 
    'image/png', 
    'image/webp',
    'application/pdf'
  ];
  private readonly THUMBNAIL_SIZE = { width: 300, height: 400 };
  private readonly PROCESSING_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.textractService = textractService;
    this.fraudDetectionService = fraudDetectionService;
  }

  /**
   * Upload document and start analysis process
   */
  async uploadAndAnalyze(
    file: UploadedFile, 
    uploadData: DocumentUpload, 
    userId: string
  ): Promise<Document> {
    try {
      // Validate document
      const validation = await this.validateDocument(file);
      if (!validation.isValid) {
        throw new Error(`Document validation failed: ${validation.errors.join(', ')}`);
      }

      // Get file buffer
      const documentBuffer = file.buffer;
      const mimeType = file.mimetype;

      // Generate thumbnail if image
      let thumbnailUrl: string | undefined;
      if (mimeType.startsWith('image/')) {
        const thumbnailBuffer = await this.generateThumbnail(documentBuffer, mimeType);
        if (thumbnailBuffer) {
          // Save thumbnail to object storage
          thumbnailUrl = await this.saveThumbnailToStorage(thumbnailBuffer, file.originalname);
        }
      }

      // Save document to object storage
      const storageUrl = await this.saveDocumentToStorage(documentBuffer, file.originalname, mimeType);

      // Create document record
      const documentData: InsertDocument = {
        submissionId: uploadData.submissionId,
        userId,
        documentType: uploadData.documentType,
        originalFileName: file.originalname,
        storageUrl,
        thumbnailUrl,
        fileSize: file.size,
        mimeType,
        checksum: validation.fileInfo.checksum,
        analysisStatus: 'pending',
        priority: uploadData.priority || 1,
        metadata: uploadData.metadata,
        uploadedBy: userId,
      };

      // Save to database
      const document = await storage.createDocument(documentData);

      // Queue for analysis
      await this.queueDocumentForAnalysis(document.id, uploadData.priority || 1);

      // Start async analysis (don't wait for completion)
      this.processDocumentAsync(document.id, documentBuffer, mimeType)
        .catch(error => {
          console.error(`Async document analysis failed for ${document.id}:`, error);
          // Update document status to failed
          storage.updateDocumentAnalysisStatus(document.id, 'failed');
        });

      return document;
    } catch (error) {
      console.error('Document upload and analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze a document by ID
   */
  async analyzeDocument(documentId: string, options: Partial<AnalysisOptions> = {}): Promise<DocumentAnalysisResult> {
    try {
      // Get document record
      const document = await storage.getDocument(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Update status to processing
      await storage.updateDocumentAnalysisStatus(documentId, 'processing');

      // Download document from storage
      const documentBuffer = await this.downloadDocumentFromStorage(document.storageUrl);

      // Process document
      const result = await this.processDocument(document, documentBuffer, options);

      // Update status to completed
      await storage.updateDocumentAnalysisStatus(documentId, 'completed');

      return result;
    } catch (error) {
      console.error(`Document analysis failed for ${documentId}:`, error);
      
      // Update status to failed
      await storage.updateDocumentAnalysisStatus(documentId, 'failed');
      
      throw error;
    }
  }

  /**
   * Get analysis result for a document
   */
  async getAnalysisResult(documentId: string): Promise<DocumentAnalysisResult | null> {
    const result = await storage.getDocumentAnalysisResult(documentId);
    return result || null;
  }

  /**
   * Get fraud detection result for a document
   */
  async getFraudDetectionResult(documentId: string): Promise<DBFraudDetectionResult | null> {
    const result = await storage.getFraudDetectionResult(documentId);
    return result || null;
  }

  /**
   * Re-analyze a document
   */
  async reanalyzeDocument(documentId: string, options: Partial<AnalysisOptions> = {}): Promise<DocumentAnalysisResult> {
    // Delete existing analysis results
    await storage.deleteDocumentAnalysisResult(documentId);
    await storage.deleteFraudDetectionResult(documentId);

    // Re-analyze
    return await this.analyzeDocument(documentId, options);
  }

  /**
   * Batch analyze multiple documents
   */
  async batchAnalyze(documentIds: string[], options: Partial<AnalysisOptions> = {}): Promise<BatchAnalysisResult> {
    const result: BatchAnalysisResult = {
      processed: [],
      failed: [],
      queued: [],
    };

    const promises = documentIds.map(async (documentId) => {
      try {
        await this.analyzeDocument(documentId, options);
        result.processed.push(documentId);
      } catch (error) {
        result.failed.push({
          documentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    await Promise.allSettled(promises);
    return result;
  }

  /**
   * Get analysis queue
   */
  async getAnalysisQueue(): Promise<DocumentAnalysisQueue[]> {
    return await storage.getAnalysisQueue();
  }

  /**
   * Process a queued document
   */
  async processQueuedDocument(queueId: string): Promise<void> {
    const queueItem = await storage.getAnalysisQueueItem(queueId);
    if (!queueItem) {
      throw new Error('Queue item not found');
    }

    try {
      // Update queue status
      await storage.updateAnalysisQueueStatus(queueId, 'processing', {
        startedAt: new Date(),
        processingNode: process.env.HOSTNAME || 'unknown',
      });

      // Analyze document
      await this.analyzeDocument(queueItem.documentId);

      // Mark queue item as completed
      await storage.updateAnalysisQueueStatus(queueId, 'completed', {
        completedAt: new Date(),
      });
    } catch (error) {
      console.error(`Queue processing failed for ${queueId}:`, error);
      
      // Update queue with error
      await storage.updateAnalysisQueueStatus(queueId, 'failed', {
        lastError: error instanceof Error ? error.message : 'Unknown error',
        nextRetryAt: this.calculateNextRetryTime(queueItem.attempts + 1),
      });
      
      throw error;
    }
  }

  /**
   * Generate thumbnail for image documents
   */
  async generateThumbnail(documentBuffer: Buffer, mimeType: string): Promise<Buffer | null> {
    try {
      if (!mimeType.startsWith('image/')) {
        return null;
      }

      const thumbnail = await sharp(documentBuffer)
        .resize(this.THUMBNAIL_SIZE.width, this.THUMBNAIL_SIZE.height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      return thumbnail;
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      return null;
    }
  }

  /**
   * Validate uploaded document
   */
  async validateDocument(file: UploadedFile): Promise<DocumentValidationResult> {
    const errors: string[] = [];

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds maximum allowed size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Check file type
    let detectedType = file.mimetype;
    if (file.buffer) {
      const fileType = await fileTypeFromBuffer(file.buffer);
      if (fileType) {
        detectedType = fileType.mime;
      }
    }

    if (!this.SUPPORTED_FORMATS.includes(detectedType)) {
      errors.push(`Unsupported file format: ${detectedType}`);
    }

    // Generate checksum
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    return {
      isValid: errors.length === 0,
      errors,
      fileInfo: {
        size: file.size,
        type: detectedType,
        checksum,
      },
    };
  }

  /**
   * Private helper methods
   */
  private async processDocumentAsync(documentId: string, documentBuffer: Buffer, mimeType: string): Promise<void> {
    try {
      const document = await storage.getDocument(documentId);
      if (!document) return;

      await this.processDocument(document, documentBuffer);
    } catch (error) {
      console.error(`Async processing failed for ${documentId}:`, error);
    }
  }

  private async processDocument(
    document: Document, 
    documentBuffer: Buffer, 
    options: Partial<AnalysisOptions> = {}
  ): Promise<DocumentAnalysisResult> {
    const startTime = Date.now();

    try {
      // Run OCR analysis
      console.log(`Starting OCR analysis for document ${document.id}`);
      const textractResult: TextractResult = await this.textractService.analyzeDocument(
        documentBuffer,
        document.mimeType,
        options
      );

      // Save OCR results to database
      const ocrResultData: InsertDocumentAnalysisResult = {
        documentId: document.id,
        analysisProvider: 'textract',
        ocrText: textractResult.ocrText,
        extractedData: textractResult.extractedData,
        boundingBoxes: textractResult.boundingBoxes,
        tables: textractResult.tables,
        forms: textractResult.forms,
        confidence: textractResult.confidence.toString(),
        processingTime: textractResult.processingTime,
        rawResponse: textractResult.rawResponse,
      };

      const analysisResult = await storage.createDocumentAnalysisResult(ocrResultData);

      // Run fraud detection (always enabled)
      if (true) {
        console.log(`Starting fraud detection for document ${document.id}`);
        const fraudResult: FraudDetectionResult = await this.fraudDetectionService.analyzeForFraud(
          textractResult,
          documentBuffer,
          document.mimeType,
          document.documentType
        );

        // Save fraud detection results
        const fraudResultData: InsertFraudDetectionResult = {
          documentId: document.id,
          overallFraudScore: fraudResult.overallFraudScore.toString(),
          riskLevel: fraudResult.riskLevel,
          detectedIssues: fraudResult.detectedIssues,
          authenticityScore: fraudResult.authenticityScore?.toString() || null,
          tamperingDetected: fraudResult.tamperingDetected,
          metadataAnalysis: fraudResult.metadataAnalysis,
          patternMatches: fraudResult.patternMatches,
          crossReferenceChecks: fraudResult.crossReferenceChecks,
          mlModelVersion: 'v1.0.0',
          confidence: fraudResult.confidence.toString(),
          requiresManualReview: fraudResult.requiresManualReview,
          reviewNotes: fraudResult.reviewNotes.join('\n'),
        };

        await storage.createFraudDetectionResult(fraudResultData);
      }

      const processingTime = Date.now() - startTime;
      console.log(`Document analysis completed for ${document.id} in ${processingTime}ms`);

      return analysisResult;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Document processing failed for ${document.id} after ${processingTime}ms:`, error);

      // Save error result
      const errorResult: InsertDocumentAnalysisResult = {
        documentId: document.id,
        analysisProvider: 'textract',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };

      const analysisResult = await storage.createDocumentAnalysisResult(errorResult);
      throw error;
    }
  }

  private async queueDocumentForAnalysis(documentId: string, priority: number = 1): Promise<void> {
    const queueData: InsertDocumentAnalysisQueue = {
      documentId,
      priority,
      queueStatus: 'queued',
      estimatedProcessingTime: this.estimateProcessingTime(priority),
    };

    await storage.addToAnalysisQueue(queueData);
  }

  private async saveDocumentToStorage(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    // This would integrate with the existing object storage
    // For now, return a placeholder URL
    const fileId = randomUUID();
    const extension = this.getFileExtension(filename);
    const storageKey = `documents/${fileId}${extension}`;
    
    // TODO: Implement actual object storage upload
    // const uploadResult = await objectStorage.upload(storageKey, buffer, mimeType);
    // return uploadResult.url;
    
    return `https://storage.example.com/${storageKey}`;
  }

  private async saveThumbnailToStorage(buffer: Buffer, originalFilename: string): Promise<string> {
    const fileId = randomUUID();
    const storageKey = `thumbnails/${fileId}.jpg`;
    
    // TODO: Implement actual object storage upload for thumbnail
    // const uploadResult = await objectStorage.upload(storageKey, buffer, 'image/jpeg');
    // return uploadResult.url;
    
    return `https://storage.example.com/${storageKey}`;
  }

  private async downloadDocumentFromStorage(storageUrl: string): Promise<Buffer> {
    // TODO: Implement actual object storage download
    // For now, return empty buffer
    return Buffer.alloc(0);
  }

  private calculateNextRetryTime(attemptNumber: number): Date {
    // Exponential backoff: 2^attempt minutes
    const delayMinutes = Math.pow(2, attemptNumber - 1);
    const delayMs = delayMinutes * 60 * 1000;
    return new Date(Date.now() + delayMs);
  }

  private estimateProcessingTime(priority: number): number {
    // Estimate processing time based on priority (in seconds)
    const baseTimes = { 1: 120, 2: 60, 3: 30 }; // Normal: 2min, High: 1min, Urgent: 30sec
    return baseTimes[priority as keyof typeof baseTimes] || 120;
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot) : '';
  }

  /**
   * Admin and management methods
   */
  async getDocumentStatistics(): Promise<{
    totalDocuments: number;
    pendingAnalysis: number;
    completedAnalysis: number;
    failedAnalysis: number;
    highRiskDocuments: number;
    processingQueue: number;
  }> {
    const stats = await storage.getDocumentStatistics();
    return stats;
  }

  async getPendingManualReviews(): Promise<Document[]> {
    return await storage.getDocumentsRequiringManualReview();
  }

  async updateDocumentPriority(documentId: string, priority: number): Promise<void> {
    await storage.updateDocumentPriority(documentId, priority);
    
    // Update queue priority if queued
    await storage.updateQueuePriority(documentId, priority);
  }

  async retryFailedAnalysis(documentId: string): Promise<void> {
    const document = await storage.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    if (document.analysisStatus !== 'failed') {
      throw new Error('Document is not in failed state');
    }

    // Reset status and re-queue
    await storage.updateDocumentAnalysisStatus(documentId, 'pending');
    await this.queueDocumentForAnalysis(documentId, 2); // High priority for retries
  }

  async getDocumentAnalysisHistory(documentId: string): Promise<{
    document: Document;
    analysisResults: DocumentAnalysisResult[];
    fraudResults: DBFraudDetectionResult[];
    queueHistory: DocumentAnalysisQueue[];
  }> {
    const [document, analysisResults, fraudResults, queueHistory] = await Promise.all([
      storage.getDocument(documentId),
      storage.getDocumentAnalysisResults(documentId),
      storage.getFraudDetectionResults(documentId),
      storage.getDocumentQueueHistory(documentId),
    ]);

    if (!document) {
      throw new Error('Document not found');
    }

    return {
      document,
      analysisResults,
      fraudResults,
      queueHistory,
    };
  }
}

// Export singleton instance and class
export { DocumentAnalysisServiceImpl };
export default new DocumentAnalysisServiceImpl();