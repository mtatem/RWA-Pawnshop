import { createHash } from 'crypto';
import { TextractResult } from './textract-service';

interface FraudDetectionConfig {
  enableImageAnalysis: boolean;
  enableTextAnalysis: boolean;
  enableMetadataAnalysis: boolean;
  fraudThreshold: number; // 0-1, higher = more suspicious
  requireManualReviewThreshold: number; // 0-1
  mlModelVersion: string;
}

interface FraudDetectionResult {
  overallFraudScore: number; // 0-1, higher = more suspicious
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  detectedIssues: FraudIssue[];
  authenticityScore: number; // 0-1, higher = more authentic
  tamperingDetected: boolean;
  metadataAnalysis: MetadataAnalysisResult;
  patternMatches: PatternMatch[];
  crossReferenceChecks: CrossReferenceResult[];
  confidence: number; // 0-1, confidence in the fraud assessment
  requiresManualReview: boolean;
  reviewNotes: string[];
}

interface FraudIssue {
  type: 'text_inconsistency' | 'layout_anomaly' | 'metadata_tampering' | 'known_fraud_pattern' | 'suspicious_content';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: any;
  confidence: number;
}

interface MetadataAnalysisResult {
  fileCreationDate?: Date;
  lastModified?: Date;
  hasBeenEdited: boolean;
  softwareUsed?: string[];
  suspiciousMetadata: boolean;
  metadataConsistency: number; // 0-1
}

interface PatternMatch {
  patternType: 'known_fraud' | 'template_mismatch' | 'suspicious_format';
  matchConfidence: number;
  description: string;
  evidence: any;
}

interface CrossReferenceResult {
  checkType: 'blacklist' | 'template_validation' | 'issuer_verification' | 'serial_number_check';
  result: 'pass' | 'fail' | 'unknown';
  confidence: number;
  details: string;
}

interface DocumentTemplate {
  id: string;
  templateName: string;
  documentType: string;
  issuerName: string;
  expectedFields: string[];
  validationRules: Record<string, any>;
  layoutSignature: string;
  securityFeatures: string[];
  confidence: number;
}

class FraudDetectionService {
  private config: FraudDetectionConfig;
  private knownFraudPatterns: Map<string, number> = new Map();
  private documentTemplates: Map<string, DocumentTemplate> = new Map();
  private blacklistedSerials: Set<string> = new Set();

  constructor(config: Partial<FraudDetectionConfig> = {}) {
    this.config = {
      enableImageAnalysis: true,
      enableTextAnalysis: true,
      enableMetadataAnalysis: true,
      fraudThreshold: 0.7,
      requireManualReviewThreshold: 0.5,
      mlModelVersion: '1.0.0',
      ...config,
    };

    this.initializeFraudPatterns();
    this.initializeDocumentTemplates();
    this.initializeBlacklists();
  }

  /**
   * Initialize known fraud patterns
   */
  private initializeFraudPatterns(): void {
    // Add common fraud patterns
    this.knownFraudPatterns.set('fake.*certificate', 0.9);
    this.knownFraudPatterns.set('counterfeit.*authentic', 0.95);
    this.knownFraudPatterns.set('replica.*original', 0.8);
    this.knownFraudPatterns.set('copy.*document', 0.7);
    this.knownFraudPatterns.set('sample.*template', 0.85);
    this.knownFraudPatterns.set('not.*valid', 0.9);
    this.knownFraudPatterns.set('temporary.*certificate', 0.8);
    this.knownFraudPatterns.set('draft.*final', 0.7);
  }

  /**
   * Initialize document templates
   */
  private initializeDocumentTemplates(): void {
    // Add sample document templates
    this.documentTemplates.set('coa', {
      id: 'coa-standard',
      templateName: 'Standard Certificate of Authenticity',
      documentType: 'coa',
      issuerName: 'Certified Authority',
      expectedFields: ['certificate', 'authentic', 'issued', 'date', 'signature'],
      validationRules: {},
      layoutSignature: 'coa-layout-v1',
      securityFeatures: ['watermark', 'seal', 'signature'],
      confidence: 0.9,
    });

    this.documentTemplates.set('nft_certificate', {
      id: 'nft-standard',
      templateName: 'NFT Authenticity Certificate',
      documentType: 'nft_certificate',
      issuerName: 'NFT Platform',
      expectedFields: ['nft', 'token', 'blockchain', 'contract', 'owner'],
      validationRules: {},
      layoutSignature: 'nft-layout-v1',
      securityFeatures: ['qr_code', 'blockchain_hash', 'digital_signature'],
      confidence: 0.85,
    });

    this.documentTemplates.set('appraisal', {
      id: 'appraisal-standard',
      templateName: 'Professional Appraisal Document',
      documentType: 'appraisal',
      issuerName: 'Certified Appraiser',
      expectedFields: ['appraisal', 'value', 'appraiser', 'date', 'signature'],
      validationRules: {},
      layoutSignature: 'appraisal-layout-v1',
      securityFeatures: ['professional_seal', 'certification_number', 'signature'],
      confidence: 0.9,
    });
  }

  /**
   * Initialize blacklisted serials
   */
  private initializeBlacklists(): void {
    // Add known fraudulent serial numbers
    this.blacklistedSerials.add('fake-123456');
    this.blacklistedSerials.add('counterfeit-789');
    this.blacklistedSerials.add('fraud-xyz999');
    this.blacklistedSerials.add('test-sample-001');
    this.blacklistedSerials.add('invalid-serial');
  }

  /**
   * Analyze document for fraud indicators
   */
  async analyzeForFraud(
    textractResult: TextractResult,
    documentBuffer: Buffer,
    mimeType: string,
    documentType: string
  ): Promise<FraudDetectionResult> {
    const issues: FraudIssue[] = [];
    let authenticityScore = 1.0;
    let tamperingDetected = false;

    // Text analysis
    if (this.config.enableTextAnalysis) {
      const textIssues = await this.analyzeTextForFraud(textractResult, documentType);
      issues.push(...textIssues);
    }

    // Metadata analysis
    let metadataAnalysis: MetadataAnalysisResult = {
      hasBeenEdited: false,
      suspiciousMetadata: false,
      metadataConsistency: 1.0,
    };

    if (this.config.enableMetadataAnalysis) {
      metadataAnalysis = await this.analyzeMetadata(documentBuffer, mimeType);
      if (metadataAnalysis.suspiciousMetadata) {
        issues.push({
          type: 'metadata_tampering',
          severity: 'high',
          description: 'Document metadata indicates possible tampering',
          evidence: metadataAnalysis,
          confidence: 0.8,
        });
        tamperingDetected = true;
      }
    }

    // Pattern matching
    const patternMatches = await this.checkFraudPatterns(textractResult, documentType);
    patternMatches.forEach(match => {
      if (match.matchConfidence > 0.7) {
        issues.push({
          type: 'known_fraud_pattern',
          severity: 'critical',
          description: `Matches known fraud pattern: ${match.description}`,
          evidence: match.evidence,
          confidence: match.matchConfidence,
        });
      }
    });

    // Cross-reference checks
    const crossReferenceChecks = await this.performCrossReferenceChecks(textractResult, documentType);
    crossReferenceChecks.forEach(check => {
      if (check.result === 'fail') {
        issues.push({
          type: 'suspicious_content',
          severity: check.checkType === 'blacklist' ? 'critical' : 'high',
          description: `Failed ${check.checkType}: ${check.details}`,
          evidence: check,
          confidence: check.confidence,
        });
      }
    });

    // Template validation
    const templateValidation = await this.validateAgainstTemplate(textractResult, documentType);
    if (templateValidation.score < 0.6) {
      issues.push({
        type: 'layout_anomaly',
        severity: 'medium',
        description: 'Document layout does not match expected template',
        evidence: templateValidation,
        confidence: 0.7,
      });
    }

    // Calculate overall fraud score
    const overallFraudScore = this.calculateOverallFraudScore(issues, metadataAnalysis, patternMatches);
    const riskLevel = this.determineRiskLevel(overallFraudScore);
    
    // Adjust authenticity score based on issues
    authenticityScore = Math.max(0, 1.0 - overallFraudScore);

    // Calculate confidence in the assessment
    const confidence = this.calculateAssessmentConfidence(issues, textractResult.confidence);

    // Determine if manual review is required
    const requiresManualReview = overallFraudScore >= this.config.requireManualReviewThreshold || 
                                 issues.some(issue => issue.severity === 'critical');

    // Generate review notes
    const reviewNotes = this.generateReviewNotes(issues, overallFraudScore, riskLevel);

    return {
      overallFraudScore,
      riskLevel,
      detectedIssues: issues,
      authenticityScore,
      tamperingDetected,
      metadataAnalysis,
      patternMatches,
      crossReferenceChecks,
      confidence,
      requiresManualReview,
      reviewNotes,
    };
  }

  /**
   * Analyze text content for fraud indicators
   */
  private async analyzeTextForFraud(textractResult: TextractResult, documentType: string): Promise<FraudIssue[]> {
    const issues: FraudIssue[] = [];
    const text = textractResult.ocrText.toLowerCase();

    // Check for suspicious text patterns
    const suspiciousPatterns = [
      { pattern: /fake|fraud|counterfeit|replica/g, severity: 'critical' as const, description: 'Contains suspicious keywords' },
      { pattern: /copy|duplicate|sample/g, severity: 'medium' as const, description: 'Contains copy-related keywords' },
      { pattern: /temporary|draft|not valid/g, severity: 'high' as const, description: 'Contains temporary or invalid indicators' },
    ];

    for (const { pattern, severity, description } of suspiciousPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        issues.push({
          type: 'suspicious_content',
          severity,
          description,
          evidence: { matches: matches.slice(0, 10) }, // Limit to first 10 matches
          confidence: 0.8,
        });
      }
    }

    // Check text quality and OCR confidence
    if (textractResult.confidence < 0.5) {
      issues.push({
        type: 'text_inconsistency',
        severity: 'medium',
        description: 'Low OCR confidence suggests poor document quality or tampering',
        evidence: { confidence: textractResult.confidence },
        confidence: 0.6,
      });
    }

    // Check for text inconsistencies in forms
    const formInconsistencies = this.checkFormConsistency(textractResult.forms);
    issues.push(...formInconsistencies);

    // Document type specific checks
    if (documentType === 'coa') {
      issues.push(...this.analyzeCOAText(textractResult));
    } else if (documentType === 'nft_certificate') {
      issues.push(...this.analyzeNFTText(textractResult));
    } else if (documentType === 'appraisal') {
      issues.push(...this.analyzeAppraisalText(textractResult));
    }

    return issues;
  }

  /**
   * Analyze document metadata for tampering
   */
  private async analyzeMetadata(documentBuffer: Buffer, mimeType: string): Promise<MetadataAnalysisResult> {
    const result: MetadataAnalysisResult = {
      hasBeenEdited: false,
      suspiciousMetadata: false,
      metadataConsistency: 1.0,
    };

    try {
      if (mimeType === 'application/pdf') {
        // Basic PDF metadata analysis
        const pdfMagicNumber = documentBuffer.slice(0, 5).toString();
        if (!pdfMagicNumber.startsWith('%PDF-')) {
          result.suspiciousMetadata = true;
          result.metadataConsistency = 0.0;
        }

        // Check for common PDF editing software signatures
        const pdfContent = documentBuffer.toString('binary');
        const editingSoftware = [
          'Photoshop',
          'GIMP',
          'Canva',
          'Adobe Illustrator',
          'Microsoft Paint',
          'PaintShop',
        ];

        const detectedSoftware = editingSoftware.filter(software => 
          pdfContent.includes(software)
        );

        if (detectedSoftware.length > 0) {
          result.softwareUsed = detectedSoftware;
          result.hasBeenEdited = true;
          result.metadataConsistency *= 0.7;
        }
      } else if (mimeType.startsWith('image/')) {
        // Basic image metadata analysis
        result.hasBeenEdited = this.detectImageEditing(documentBuffer);
        if (result.hasBeenEdited) {
          result.metadataConsistency *= 0.8;
        }
      }

      // Overall suspicious metadata determination
      result.suspiciousMetadata = result.metadataConsistency < 0.6 || 
                                  (result.hasBeenEdited && (result.softwareUsed?.some(sw => 
                                    ['Photoshop', 'GIMP', 'Microsoft Paint'].includes(sw)
                                  ) ?? false));

    } catch (error) {
      console.error('Metadata analysis failed:', error);
      result.suspiciousMetadata = true;
      result.metadataConsistency = 0.5;
    }

    return result;
  }

  /**
   * Check for known fraud patterns
   */
  private async checkFraudPatterns(textractResult: TextractResult, documentType: string): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];
    const text = textractResult.ocrText;

    // Check against known fraud patterns
    for (const [pattern, confidence] of Array.from(this.knownFraudPatterns.entries())) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(text)) {
        matches.push({
          patternType: 'known_fraud',
          matchConfidence: confidence,
          description: `Matches known fraud pattern: ${pattern}`,
          evidence: { pattern, matchedText: text.match(regex)?.[0] },
        });
      }
    }

    // Check template format matching
    const templateMatch = await this.checkTemplateFormat(textractResult, documentType);
    if (templateMatch.matchConfidence < 0.6) {
      matches.push({
        patternType: 'template_mismatch',
        matchConfidence: 1.0 - templateMatch.matchConfidence,
        description: 'Document format does not match expected template',
        evidence: templateMatch,
      });
    }

    return matches;
  }

  /**
   * Perform cross-reference checks
   */
  private async performCrossReferenceChecks(textractResult: TextractResult, documentType: string): Promise<CrossReferenceResult[]> {
    const results: CrossReferenceResult[] = [];

    // Serial number blacklist check
    const serialNumber = textractResult.extractedData.serialNumber;
    if (serialNumber) {
      const isBlacklisted = this.blacklistedSerials.has(serialNumber.toLowerCase());
      results.push({
        checkType: 'blacklist',
        result: isBlacklisted ? 'fail' : 'pass',
        confidence: 0.95,
        details: isBlacklisted ? 'Serial number found in blacklist' : 'Serial number not in blacklist',
      });
    }

    // Issuer verification
    const issuer = textractResult.extractedData.issuer;
    if (issuer) {
      const isValidIssuer = await this.verifyIssuer(issuer, documentType);
      results.push({
        checkType: 'issuer_verification',
        result: isValidIssuer ? 'pass' : 'fail',
        confidence: 0.8,
        details: isValidIssuer ? 'Issuer is recognized' : 'Issuer not recognized or suspicious',
      });
    }

    // Template validation
    const templateValidation = await this.validateDocumentTemplate(textractResult, documentType);
    results.push({
      checkType: 'template_validation',
      result: templateValidation.isValid ? 'pass' : 'fail',
      confidence: templateValidation.confidence,
      details: templateValidation.details,
    });

    return results;
  }

  /**
   * Calculate overall fraud score
   */
  private calculateOverallFraudScore(
    issues: FraudIssue[],
    metadataAnalysis: MetadataAnalysisResult,
    patternMatches: PatternMatch[]
  ): number {
    let score = 0;
    let totalWeight = 0;

    // Weight issues by severity
    const severityWeights = { low: 0.2, medium: 0.5, high: 0.8, critical: 1.0 };
    
    issues.forEach(issue => {
      const weight = severityWeights[issue.severity] * issue.confidence;
      score += weight;
      totalWeight += weight;
    });

    // Factor in metadata analysis
    if (!metadataAnalysis.suspiciousMetadata) {
      score *= 0.8; // Reduce score if metadata is clean
    } else {
      score += 0.3; // Increase score for suspicious metadata
      totalWeight += 0.3;
    }

    // Factor in pattern matches
    const highConfidencePatterns = patternMatches.filter(match => match.matchConfidence > 0.7);
    if (highConfidencePatterns.length > 0) {
      score += highConfidencePatterns.length * 0.4;
      totalWeight += highConfidencePatterns.length * 0.4;
    }

    // Normalize score
    const normalizedScore = totalWeight > 0 ? Math.min(score / Math.max(totalWeight, 1), 1.0) : 0;
    
    return Number(normalizedScore.toFixed(3));
  }

  /**
   * Determine risk level based on fraud score
   */
  private determineRiskLevel(fraudScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (fraudScore >= 0.8) return 'critical';
    if (fraudScore >= 0.6) return 'high';
    if (fraudScore >= 0.3) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence in the fraud assessment
   */
  private calculateAssessmentConfidence(issues: FraudIssue[], ocrConfidence: number): number {
    // Base confidence on OCR quality
    let confidence = ocrConfidence;

    // Increase confidence with more detected issues
    const highConfidenceIssues = issues.filter(issue => issue.confidence > 0.7);
    confidence += highConfidenceIssues.length * 0.1;

    // Decrease confidence if OCR quality is poor
    if (ocrConfidence < 0.5) {
      confidence *= 0.7;
    }

    return Math.min(Number(confidence.toFixed(3)), 1.0);
  }

  /**
   * Helper methods for specific document type analysis
   */
  private analyzeCOAText(textractResult: TextractResult): FraudIssue[] {
    const issues: FraudIssue[] = [];
    const text = textractResult.ocrText.toLowerCase();

    // Check for required COA elements
    const requiredElements = ['certificate', 'authentic', 'issued', 'date'];
    const missingElements = requiredElements.filter(element => !text.includes(element));

    if (missingElements.length > 0) {
      issues.push({
        type: 'text_inconsistency',
        severity: 'medium',
        description: `Missing required COA elements: ${missingElements.join(', ')}`,
        evidence: { missingElements },
        confidence: 0.7,
      });
    }

    return issues;
  }

  private analyzeNFTText(textractResult: TextractResult): FraudIssue[] {
    const issues: FraudIssue[] = [];
    const text = textractResult.ocrText.toLowerCase();

    // Check for blockchain-related terms
    const blockchainTerms = ['blockchain', 'token', 'nft', 'contract', 'ethereum', 'polygon'];
    const foundTerms = blockchainTerms.filter(term => text.includes(term));

    if (foundTerms.length === 0) {
      issues.push({
        type: 'suspicious_content',
        severity: 'high',
        description: 'NFT certificate missing blockchain-related terminology',
        evidence: { expectedTerms: blockchainTerms },
        confidence: 0.8,
      });
    }

    return issues;
  }

  private analyzeAppraisalText(textractResult: TextractResult): FraudIssue[] {
    const issues: FraudIssue[] = [];
    const text = textractResult.ocrText.toLowerCase();

    // Check for required appraisal elements
    const requiredElements = ['appraisal', 'value', 'appraiser', 'date'];
    const missingElements = requiredElements.filter(element => !text.includes(element));

    if (missingElements.length > 1) {
      issues.push({
        type: 'text_inconsistency',
        severity: 'high',
        description: `Missing critical appraisal elements: ${missingElements.join(', ')}`,
        evidence: { missingElements },
        confidence: 0.8,
      });
    }

    return issues;
  }

  /**
   * Helper methods for various checks
   */
  private checkFormConsistency(forms: any[]): FraudIssue[] {
    const issues: FraudIssue[] = [];
    
    // Check for duplicate keys
    const keys = forms.map(form => form.key.toLowerCase());
    const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
    
    if (duplicateKeys.length > 0) {
      issues.push({
        type: 'text_inconsistency',
        severity: 'medium',
        description: 'Duplicate form fields detected',
        evidence: { duplicateKeys: Array.from(new Set(duplicateKeys)) },
        confidence: 0.7,
      });
    }

    return issues;
  }

  private detectImageEditing(buffer: Buffer): boolean {
    // Basic image editing detection (placeholder implementation)
    // In production, this would use more sophisticated image forensics
    
    // Check for common editing software signatures in EXIF data
    const content = buffer.toString('binary');
    const editingSoftwareSignatures = [
      'Adobe Photoshop',
      'GIMP',
      'Paint.NET',
      'Canva',
    ];

    return editingSoftwareSignatures.some(signature => content.includes(signature));
  }

  private async checkTemplateFormat(textractResult: TextractResult, documentType: string): Promise<{ matchConfidence: number }> {
    // Placeholder template format checking
    // In production, this would compare against known document templates
    
    const template = this.documentTemplates.get(documentType);
    if (!template) {
      return { matchConfidence: 0.5 }; // Unknown template
    }

    // Check if expected fields are present
    const extractedKeys = Object.keys(textractResult.extractedData.keyValuePairs);
    const expectedFields = template.expectedFields;
    const matchedFields = expectedFields.filter(field => 
      extractedKeys.some(key => key.toLowerCase().includes(field.toLowerCase()))
    );

    const matchConfidence = matchedFields.length / expectedFields.length;
    return { matchConfidence };
  }

  private async validateAgainstTemplate(textractResult: TextractResult, documentType: string): Promise<{ score: number }> {
    // Template validation logic
    const template = this.documentTemplates.get(documentType);
    if (!template) {
      return { score: 0.5 };
    }

    // Calculate layout similarity (placeholder)
    const layoutScore = 0.8; // This would be calculated based on actual layout comparison

    // Calculate field presence score
    const extractedKeys = Object.keys(textractResult.extractedData.keyValuePairs);
    const expectedFields = template.expectedFields;
    const fieldScore = expectedFields.filter(field => 
      extractedKeys.some(key => key.toLowerCase().includes(field.toLowerCase()))
    ).length / expectedFields.length;

    return { score: (layoutScore + fieldScore) / 2 };
  }

  private async verifyIssuer(issuer: string, documentType: string): Promise<boolean> {
    // Issuer verification logic (placeholder)
    // In production, this would check against a database of known issuers
    
    const knownIssuers = {
      coa: ['authentic certificates inc', 'global authentication services', 'certificate authority'],
      appraisal: ['certified appraisers guild', 'professional appraisal society', 'american appraisers'],
      nft: ['opensea', 'rarible', 'foundation', 'superrare'],
    };

    const validIssuers = knownIssuers[documentType as keyof typeof knownIssuers] || [];
    return validIssuers.some(validIssuer => 
      issuer.toLowerCase().includes(validIssuer.toLowerCase())
    );
  }

  private async validateDocumentTemplate(textractResult: TextractResult, documentType: string): Promise<{ 
    isValid: boolean; 
    confidence: number; 
    details: string; 
  }> {
    const template = this.documentTemplates.get(documentType);
    if (!template) {
      return {
        isValid: false,
        confidence: 0.0,
        details: 'No template available for validation',
      };
    }

    // Check required fields
    const extractedKeys = Object.keys(textractResult.extractedData.keyValuePairs);
    const requiredFields = template.expectedFields;
    const missingFields = requiredFields.filter(field => 
      !extractedKeys.some(key => key.toLowerCase().includes(field.toLowerCase()))
    );

    const isValid = missingFields.length === 0;
    const confidence = (requiredFields.length - missingFields.length) / requiredFields.length;

    return {
      isValid,
      confidence,
      details: isValid ? 'All required fields present' : `Missing fields: ${missingFields.join(', ')}`,
    };
  }

  private generateReviewNotes(issues: FraudIssue[], fraudScore: number, riskLevel: string): string[] {
    const notes: string[] = [];

    notes.push(`Overall fraud score: ${fraudScore.toFixed(3)} (${riskLevel} risk)`);

    if (issues.length === 0) {
      notes.push('No significant fraud indicators detected');
    } else {
      notes.push(`${issues.length} potential issue(s) detected:`);
      
      const criticalIssues = issues.filter(issue => issue.severity === 'critical');
      if (criticalIssues.length > 0) {
        notes.push(`- ${criticalIssues.length} critical issue(s) requiring immediate attention`);
      }

      const highIssues = issues.filter(issue => issue.severity === 'high');
      if (highIssues.length > 0) {
        notes.push(`- ${highIssues.length} high-severity issue(s)`);
      }

      // Add specific issue descriptions for critical issues
      criticalIssues.slice(0, 3).forEach(issue => {
        notes.push(`- CRITICAL: ${issue.description}`);
      });
    }

    if (fraudScore >= 0.7) {
      notes.push('RECOMMENDATION: Manual review required - high fraud risk detected');
    } else if (fraudScore >= 0.5) {
      notes.push('RECOMMENDATION: Additional verification recommended');
    } else {
      notes.push('Document appears legitimate based on automated analysis');
    }

    return notes;
  }


  /**
   * Update fraud patterns and blacklists (for admin use)
   */
  async addFraudPattern(pattern: string, confidence: number): Promise<void> {
    this.knownFraudPatterns.set(pattern, confidence);
  }

  async addBlacklistedSerial(serial: string): Promise<void> {
    this.blacklistedSerials.add(serial.toLowerCase());
  }

  async removeBlacklistedSerial(serial: string): Promise<void> {
    this.blacklistedSerials.delete(serial.toLowerCase());
  }

  /**
   * Get fraud detection statistics
   */
  getStatistics(): {
    fraudPatternsCount: number;
    blacklistedSerialsCount: number;
    templatesCount: number;
    modelVersion: string;
  } {
    return {
      fraudPatternsCount: this.knownFraudPatterns.size,
      blacklistedSerialsCount: this.blacklistedSerials.size,
      templatesCount: this.documentTemplates.size,
      modelVersion: this.config.mlModelVersion,
    };
  }
}

export { 
  FraudDetectionService, 
  FraudDetectionResult, 
  FraudDetectionConfig,
  FraudIssue,
  MetadataAnalysisResult,
  PatternMatch,
  CrossReferenceResult
};

export default new FraudDetectionService();