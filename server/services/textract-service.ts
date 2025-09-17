import { 
  TextractClient,
  DetectDocumentTextCommand,
  AnalyzeDocumentCommand,
  GetDocumentAnalysisCommand,
  StartDocumentAnalysisCommand,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
  Block,
  FeatureType,
  DocumentLocation
} from '@aws-sdk/client-textract';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// Configuration
const TEXTRACT_REGION = process.env.AWS_TEXTRACT_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

interface TextractConfig {
  maxDocumentSize: number; // 10MB for sync, 500MB for async
  supportedFormats: string[];
  confidenceThreshold: number;
}

const TEXTRACT_CONFIG: TextractConfig = {
  maxDocumentSize: 10 * 1024 * 1024, // 10MB for synchronous processing
  supportedFormats: ['image/jpeg', 'image/png', 'application/pdf'],
  confidenceThreshold: 80, // Minimum confidence score to consider text valid
};

interface TextractResult {
  ocrText: string;
  extractedData: ExtractedDocumentData;
  boundingBoxes: BoundingBox[];
  tables: TableData[];
  forms: FormData[];
  confidence: number;
  processingTime: number;
  rawResponse: any;
}

interface ExtractedDocumentData {
  documentType?: string;
  issuer?: string;
  dateIssued?: string;
  expirationDate?: string;
  serialNumber?: string;
  assetDetails?: Record<string, any>;
  certificationInfo?: Record<string, any>;
  keyValuePairs: Record<string, string>;
}

interface BoundingBox {
  text: string;
  confidence: number;
  geometry: {
    boundingBox: {
      width: number;
      height: number;
      left: number;
      top: number;
    };
    polygon: Array<{ x: number; y: number }>;
  };
}

interface TableData {
  rows: string[][];
  confidence: number;
  position: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

interface FormData {
  key: string;
  value: string;
  confidence: number;
  keyConfidence: number;
  valueConfidence: number;
}

interface AnalysisOptions {
  extractText: boolean;
  extractTables: boolean;
  extractForms: boolean;
  extractSignatures: boolean;
  useAsyncProcessing: boolean;
}

class TextractService {
  private textractClient: TextractClient | null = null;
  private s3Client: S3Client | null = null;
  private isDevelopmentMode: boolean = false;

  constructor() {
    // Initialize AWS clients with proper configuration
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      console.warn('AWS credentials not configured. Document analysis will use mock responses in development mode.');
      this.isDevelopmentMode = true;
      return; // Skip AWS client initialization
    }

    this.textractClient = new TextractClient({
      region: TEXTRACT_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    this.s3Client = new S3Client({
      region: TEXTRACT_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   * Analyze a document using AWS Textract
   * Supports both synchronous and asynchronous processing based on file size
   */
  async analyzeDocument(
    documentBuffer: Buffer,
    mimeType: string,
    options: Partial<AnalysisOptions> = {}
  ): Promise<TextractResult> {
    const startTime = Date.now();

    // Return mock response in development mode
    if (this.isDevelopmentMode) {
      return this.getMockAnalysisResult(startTime);
    }

    try {
      // Validate document format
      this.validateDocumentFormat(mimeType);

      // Set default options
      const analysisOptions: AnalysisOptions = {
        extractText: true,
        extractTables: true,
        extractForms: true,
        extractSignatures: false,
        useAsyncProcessing: documentBuffer.length > TEXTRACT_CONFIG.maxDocumentSize,
        ...options,
      };

      let result: TextractResult;

      if (analysisOptions.useAsyncProcessing) {
        result = await this.processDocumentAsync(documentBuffer, mimeType, analysisOptions);
      } else {
        result = await this.processDocumentSync(documentBuffer, analysisOptions);
      }

      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;

      return result;
    } catch (error) {
      console.error('Textract analysis failed:', error);
      throw new Error(`Document analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process document synchronously for smaller files
   */
  private async processDocumentSync(
    documentBuffer: Buffer,
    options: AnalysisOptions
  ): Promise<TextractResult> {
    const features: FeatureType[] = [];
    if (options.extractTables) features.push('TABLES');
    if (options.extractForms) features.push('FORMS');
    if (options.extractSignatures) features.push('SIGNATURES');

    let response;

    if (features.length > 0) {
      // Use AnalyzeDocument for advanced features
      const command = new AnalyzeDocumentCommand({
        Document: {
          Bytes: documentBuffer,
        },
        FeatureTypes: features,
      });

      response = await this.textractClient.send(command);
    } else {
      // Use DetectDocumentText for simple text extraction
      const command = new DetectDocumentTextCommand({
        Document: {
          Bytes: documentBuffer,
        },
      });

      response = await this.textractClient.send(command);
    }

    return this.processTextractResponse(response.Blocks || []);
  }

  /**
   * Process document asynchronously for larger files
   * Note: This requires S3 storage setup for document processing
   */
  private async processDocumentAsync(
    documentBuffer: Buffer,
    mimeType: string,
    options: AnalysisOptions
  ): Promise<TextractResult> {
    // For async processing, we need to upload to S3 first
    // This is a placeholder implementation - in production, you would:
    // 1. Upload document to S3
    // 2. Start async Textract job
    // 3. Poll for completion
    // 4. Retrieve results

    throw new Error('Async processing not implemented yet. Use smaller documents or implement S3 integration.');
  }

  /**
   * Process Textract response blocks into structured data
   */
  private processTextractResponse(blocks: Block[]): TextractResult {
    const ocrText = this.extractTextFromBlocks(blocks);
    const boundingBoxes = this.extractBoundingBoxes(blocks);
    const tables = this.extractTables(blocks);
    const forms = this.extractForms(blocks);
    const extractedData = this.extractStructuredData(ocrText, forms);
    const confidence = this.calculateOverallConfidence(blocks);

    return {
      ocrText,
      extractedData,
      boundingBoxes,
      tables,
      forms,
      confidence,
      processingTime: 0, // Will be set by caller
      rawResponse: blocks,
    };
  }

  /**
   * Extract plain text from Textract blocks
   */
  private extractTextFromBlocks(blocks: Block[]): string {
    return blocks
      .filter(block => block.BlockType === 'LINE')
      .map(block => block.Text || '')
      .join('\n');
  }

  /**
   * Extract bounding box information for text elements
   */
  private extractBoundingBoxes(blocks: Block[]): BoundingBox[] {
    return blocks
      .filter(block => block.BlockType === 'WORD' && block.Confidence && block.Confidence >= TEXTRACT_CONFIG.confidenceThreshold)
      .map(block => ({
        text: block.Text || '',
        confidence: block.Confidence || 0,
        geometry: {
          boundingBox: {
            width: block.Geometry?.BoundingBox?.Width || 0,
            height: block.Geometry?.BoundingBox?.Height || 0,
            left: block.Geometry?.BoundingBox?.Left || 0,
            top: block.Geometry?.BoundingBox?.Top || 0,
          },
          polygon: block.Geometry?.Polygon?.map(point => ({
            x: point.X || 0,
            y: point.Y || 0,
          })) || [],
        },
      }));
  }

  /**
   * Extract table data from Textract blocks
   */
  private extractTables(blocks: Block[]): TableData[] {
    const tables: TableData[] = [];
    const tableBlocks = blocks.filter(block => block.BlockType === 'TABLE');

    for (const tableBlock of tableBlocks) {
      const cells: { [key: string]: { text: string; confidence: number } } = {};
      const cellBlocks = blocks.filter(block => 
        block.BlockType === 'CELL' && 
        tableBlock.Relationships?.some(rel => 
          rel.Type === 'CHILD' && rel.Ids?.includes(block.Id || '')
        )
      );

      // Build cell data
      for (const cellBlock of cellBlocks) {
        const rowIndex = cellBlock.RowIndex || 0;
        const columnIndex = cellBlock.ColumnIndex || 0;
        const key = `${rowIndex}-${columnIndex}`;

        // Get cell text from word blocks
        const cellText = this.getCellText(blocks, cellBlock);
        cells[key] = {
          text: cellText,
          confidence: cellBlock.Confidence || 0,
        };
      }

      // Convert to 2D array
      const maxRow = Math.max(...Object.keys(cells).map(key => parseInt(key.split('-')[0])));
      const maxCol = Math.max(...Object.keys(cells).map(key => parseInt(key.split('-')[1])));
      
      const rows: string[][] = [];
      for (let r = 1; r <= maxRow; r++) {
        const row: string[] = [];
        for (let c = 1; c <= maxCol; c++) {
          const cellData = cells[`${r}-${c}`];
          row.push(cellData?.text || '');
        }
        rows.push(row);
      }

      tables.push({
        rows,
        confidence: tableBlock.Confidence || 0,
        position: {
          top: tableBlock.Geometry?.BoundingBox?.Top || 0,
          left: tableBlock.Geometry?.BoundingBox?.Left || 0,
          width: tableBlock.Geometry?.BoundingBox?.Width || 0,
          height: tableBlock.Geometry?.BoundingBox?.Height || 0,
        },
      });
    }

    return tables;
  }

  /**
   * Extract form data (key-value pairs) from Textract blocks
   */
  private extractForms(blocks: Block[]): FormData[] {
    const forms: FormData[] = [];
    const keyValueBlocks = blocks.filter(block => block.BlockType === 'KEY_VALUE_SET');

    const keyBlocks = keyValueBlocks.filter(block => block.EntityTypes?.includes('KEY'));
    const valueBlocks = keyValueBlocks.filter(block => block.EntityTypes?.includes('VALUE'));

    for (const keyBlock of keyBlocks) {
      // Find corresponding value block
      const valueRelation = keyBlock.Relationships?.find(rel => rel.Type === 'VALUE');
      if (!valueRelation?.Ids?.length) continue;

      const valueBlock = valueBlocks.find(block => block.Id === valueRelation.Ids?.[0]);
      if (!valueBlock) continue;

      const key = this.getBlockText(blocks, keyBlock);
      const value = this.getBlockText(blocks, valueBlock);

      if (key && value) {
        forms.push({
          key: key.trim(),
          value: value.trim(),
          confidence: Math.min(keyBlock.Confidence || 0, valueBlock.Confidence || 0),
          keyConfidence: keyBlock.Confidence || 0,
          valueConfidence: valueBlock.Confidence || 0,
        });
      }
    }

    return forms;
  }

  /**
   * Extract structured data from OCR text and forms
   */
  private extractStructuredData(ocrText: string, forms: FormData[]): ExtractedDocumentData {
    const keyValuePairs: Record<string, string> = {};
    forms.forEach(form => {
      keyValuePairs[form.key] = form.value;
    });

    // Pattern matching for common document types
    const extractedData: ExtractedDocumentData = { keyValuePairs };

    // Certificate of Authenticity patterns
    if (this.detectDocumentType(ocrText, 'coa')) {
      extractedData.documentType = 'certificate_of_authenticity';
      extractedData.serialNumber = this.extractSerialNumber(ocrText);
      extractedData.issuer = this.extractIssuer(ocrText);
      extractedData.dateIssued = this.extractDateIssued(ocrText);
      extractedData.assetDetails = this.extractAssetDetails(ocrText, forms);
    }

    // NFT Certificate patterns
    if (this.detectDocumentType(ocrText, 'nft')) {
      extractedData.documentType = 'nft_certificate';
      extractedData.serialNumber = this.extractTokenId(ocrText);
      extractedData.certificationInfo = this.extractNFTInfo(ocrText, forms);
    }

    // Appraisal document patterns
    if (this.detectDocumentType(ocrText, 'appraisal')) {
      extractedData.documentType = 'appraisal';
      extractedData.issuer = this.extractAppraiser(ocrText);
      extractedData.dateIssued = this.extractAppraisalDate(ocrText);
      extractedData.assetDetails = this.extractAppraisalDetails(ocrText, forms);
    }

    return extractedData;
  }

  /**
   * Helper methods for text extraction and pattern matching
   */
  private getCellText(blocks: Block[], cellBlock: Block): string {
    const childWordIds = cellBlock.Relationships
      ?.find(rel => rel.Type === 'CHILD')
      ?.Ids || [];

    return childWordIds
      .map(id => blocks.find(block => block.Id === id))
      .filter(block => block?.BlockType === 'WORD')
      .map(block => block?.Text || '')
      .join(' ');
  }

  private getBlockText(blocks: Block[], block: Block): string {
    const childIds = block.Relationships
      ?.find(rel => rel.Type === 'CHILD')
      ?.Ids || [];

    return childIds
      .map(id => blocks.find(b => b.Id === id))
      .filter(b => b?.BlockType === 'WORD')
      .map(b => b?.Text || '')
      .join(' ');
  }

  private calculateOverallConfidence(blocks: Block[]): number {
    const confidenceScores = blocks
      .filter(block => block.Confidence !== undefined)
      .map(block => block.Confidence || 0);

    if (confidenceScores.length === 0) return 0;

    return confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
  }

  private validateDocumentFormat(mimeType: string): void {
    if (!TEXTRACT_CONFIG.supportedFormats.includes(mimeType)) {
      throw new Error(`Unsupported document format: ${mimeType}. Supported formats: ${TEXTRACT_CONFIG.supportedFormats.join(', ')}`);
    }
  }

  // Document type detection methods
  private detectDocumentType(text: string, type: string): boolean {
    const normalizedText = text.toLowerCase();
    
    const patterns = {
      coa: ['certificate of authenticity', 'authenticity certificate', 'coa', 'authentication'],
      nft: ['non-fungible token', 'nft', 'token id', 'blockchain certificate', 'digital asset'],
      appraisal: ['appraisal', 'appraised value', 'appraiser', 'valuation', 'market value'],
      insurance: ['insurance', 'policy', 'coverage', 'insured value', 'premium'],
    };

    const typePatterns = patterns[type as keyof typeof patterns] || [];
    return typePatterns.some(pattern => normalizedText.includes(pattern));
  }

  // Data extraction methods
  private extractSerialNumber(text: string): string | undefined {
    const patterns = [
      /serial\s*(?:number|#)[\s:]*([A-Z0-9-]+)/i,
      /s\/n[\s:]*([A-Z0-9-]+)/i,
      /serial[\s:]*([A-Z0-9-]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  private extractIssuer(text: string): string | undefined {
    const patterns = [
      /issued\s+by[\s:]*([^\n]+)/i,
      /issuer[\s:]*([^\n]+)/i,
      /certified\s+by[\s:]*([^\n]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }

    return undefined;
  }

  private extractDateIssued(text: string): string | undefined {
    const patterns = [
      /issue\s*date[\s:]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /dated[\s:]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  private extractTokenId(text: string): string | undefined {
    const patterns = [
      /token\s*id[\s:]*([A-Z0-9-]+)/i,
      /nft[\s#:]*([A-Z0-9-]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  private extractAppraiser(text: string): string | undefined {
    const patterns = [
      /appraiser[\s:]*([^\n]+)/i,
      /certified\s+appraiser[\s:]*([^\n]+)/i,
      /by[\s:]*([^\n]+appraiser[^\n]*)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }

    return undefined;
  }

  private extractAppraisalDate(text: string): string | undefined {
    const patterns = [
      /appraisal\s*date[\s:]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /date\s*of\s*appraisal[\s:]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }

    return this.extractDateIssued(text);
  }

  private extractAssetDetails(text: string, forms: FormData[]): Record<string, any> {
    const details: Record<string, any> = {};

    // Extract common asset details
    const valueMatch = text.match(/(?:value|worth)[\s:]*\$?([\d,]+(?:\.\d{2})?)/i);
    if (valueMatch) details.estimatedValue = valueMatch[1];

    const weightMatch = text.match(/([\d.]+)\s*(grams?|oz|ounces?|carats?)/i);
    if (weightMatch) {
      details.weight = parseFloat(weightMatch[1]);
      details.weightUnit = weightMatch[2];
    }

    // Add form data as additional details
    forms.forEach(form => {
      if (form.confidence >= TEXTRACT_CONFIG.confidenceThreshold) {
        details[form.key.toLowerCase().replace(/\s+/g, '_')] = form.value;
      }
    });

    return details;
  }

  private extractNFTInfo(text: string, forms: FormData[]): Record<string, any> {
    const info: Record<string, any> = {};

    // Extract blockchain information
    const blockchainMatch = text.match(/blockchain[\s:]*([^\n]+)/i);
    if (blockchainMatch) info.blockchain = blockchainMatch[1].trim();

    const contractMatch = text.match(/contract[\s:]*([0-9a-fA-Fx]+)/i);
    if (contractMatch) info.contractAddress = contractMatch[1];

    // Add form data
    forms.forEach(form => {
      if (form.confidence >= TEXTRACT_CONFIG.confidenceThreshold) {
        info[form.key.toLowerCase().replace(/\s+/g, '_')] = form.value;
      }
    });

    return info;
  }

  private extractAppraisalDetails(text: string, forms: FormData[]): Record<string, any> {
    const details: Record<string, any> = {};

    // Extract appraisal-specific information
    const marketValueMatch = text.match(/market\s*value[\s:]*\$?([\d,]+(?:\.\d{2})?)/i);
    if (marketValueMatch) details.marketValue = marketValueMatch[1];

    const replacementValueMatch = text.match(/replacement\s*value[\s:]*\$?([\d,]+(?:\.\d{2})?)/i);
    if (replacementValueMatch) details.replacementValue = replacementValueMatch[1];

    // Add form data
    forms.forEach(form => {
      if (form.confidence >= TEXTRACT_CONFIG.confidenceThreshold) {
        details[form.key.toLowerCase().replace(/\s+/g, '_')] = form.value;
      }
    });

    return details;
  }

  // Mock response for development mode
  private getMockAnalysisResult(startTime: number): TextractResult {
    return {
      jobId: `mock-job-${Date.now()}`,
      extractedText: `Sample extracted text from document analysis.
This is a mock response used in development mode.
Document contains key information that would normally be extracted by AWS Textract.`,
      confidence: 0.95,
      processingTime: Date.now() - startTime,
      detectedElements: [
        {
          type: 'text',
          text: 'Sample Header Text',
          confidence: 0.98,
          boundingBox: { left: 10, top: 5, width: 200, height: 30 }
        },
        {
          type: 'text', 
          text: 'Sample body content with important information',
          confidence: 0.92,
          boundingBox: { left: 10, top: 50, width: 300, height: 20 }
        }
      ],
      tables: [],
      forms: [
        {
          key: 'Document Type',
          value: 'Certificate of Authenticity',
          confidence: 0.94,
          keyConfidence: 0.96,
          valueConfidence: 0.92
        },
        {
          key: 'Asset Name',
          value: 'Gold Ring',
          confidence: 0.89,
          keyConfidence: 0.91,
          valueConfidence: 0.87
        }
      ],
      rawResponse: { mockResponse: true }
    };
  }
}

export { TextractService, TextractResult, AnalysisOptions };
export default new TextractService();