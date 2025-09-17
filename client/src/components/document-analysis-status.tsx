import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Shield, 
  Eye, 
  RotateCcw,
  FileText,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DocumentAnalysisStatusProps {
  documentId: string;
  onReanalyze?: () => void;
  showDetailedResults?: boolean;
}

interface AnalysisResult {
  id: string;
  textractJobId?: string;
  extractedText?: string;
  confidenceScore?: number;
  processingTimeSeconds?: number;
  detectedElements?: any;
  tablesExtracted?: any;
  formsExtracted?: any;
  keyValuePairs?: any;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

interface FraudDetectionResult {
  id: string;
  overallFraudScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  detectedIssues: Array<{
    type: string;
    severity: string;
    description: string;
    confidence: number;
  }>;
  authenticityScore: number;
  tamperingDetected: boolean;
  requiresManualReview: boolean;
  reviewNotes: string[];
  confidence: number;
  processedAt: string;
}

interface Document {
  id: string;
  originalFileName: string;
  documentType: string;
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  fileSize: number;
  mimeType: string;
  createdAt: string;
  storageUrl: string;
  thumbnailUrl?: string;
}

export default function DocumentAnalysisStatus({ 
  documentId, 
  onReanalyze,
  showDetailedResults = false 
}: DocumentAnalysisStatusProps) {
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const { toast } = useToast();

  // Fetch document analysis results
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/documents', documentId, 'analysis'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/documents/${documentId}/analysis`);
      return await response.json();
    },
    refetchInterval: (data) => {
      // Auto-refresh if still processing
      const status = data?.document?.analysisStatus;
      return status === 'pending' || status === 'processing' ? 3000 : false;
    },
    retry: false
  });

  const document: Document = data?.document;
  const analysis: AnalysisResult = data?.analysis;
  const fraudDetection: FraudDetectionResult = data?.fraudDetection;

  // Handle reanalysis
  const handleReanalyze = async () => {
    try {
      setIsReanalyzing(true);
      
      await apiRequest('POST', `/api/documents/${documentId}/reanalyze`, {
        analysisOptions: {
          extractText: true,
          extractTables: true,
          extractForms: true,
          detectFraud: true
        }
      });

      toast({
        title: "Re-analysis started",
        description: "Document re-analysis has been initiated"
      });

      // Refetch data and notify parent
      await refetch();
      onReanalyze?.();

    } catch (error: any) {
      toast({
        title: "Re-analysis failed",
        description: error.message || "Failed to start re-analysis",
        variant: "destructive"
      });
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Get status display components
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      processing: "outline", 
      completed: "default",
      failed: "destructive"
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      low: "default",
      medium: "secondary",
      high: "outline",
      critical: "destructive"
    } as const;

    const colors = {
      low: "text-green-600",
      medium: "text-yellow-600", 
      high: "text-orange-600",
      critical: "text-red-600"
    } as const;

    return (
      <Badge variant={variants[riskLevel as keyof typeof variants] || "secondary"}>
        <Shield className={`w-3 h-3 mr-1 ${colors[riskLevel as keyof typeof colors] || ""}`} />
        {riskLevel.toUpperCase()} RISK
      </Badge>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card data-testid="analysis-status-loading">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 animate-spin" />
            <span>Loading analysis results...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !document) {
    return (
      <Card data-testid="analysis-status-error">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Failed to load document analysis results
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="document-analysis-status">
      {/* Document Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Analysis Results
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(document.analysisStatus)}
              {document.analysisStatus === 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReanalyze}
                  disabled={isReanalyzing}
                  data-testid="button-reanalyze"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {isReanalyzing ? 'Re-analyzing...' : 'Re-analyze'}
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Document Info */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Document</p>
              <p className="text-sm text-gray-600" data-testid="document-filename">
                {document.originalFileName}
              </p>
              <p className="text-sm text-gray-500">
                {Math.round(document.fileSize / 1024)} KB • {document.documentType}
              </p>
            </div>

            {/* Analysis Status */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Analysis Status</p>
              <div className="flex items-center gap-2">
                {getStatusIcon(document.analysisStatus)}
                <span className="text-sm" data-testid="analysis-status-text">
                  {document.analysisStatus.charAt(0).toUpperCase() + document.analysisStatus.slice(1)}
                </span>
              </div>
              {analysis?.processingTimeSeconds && (
                <p className="text-sm text-gray-500">
                  Processed in {analysis.processingTimeSeconds}s
                </p>
              )}
            </div>

            {/* Processing Progress */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Progress</p>
              {document.analysisStatus === 'processing' && (
                <div className="space-y-1">
                  <Progress value={50} className="w-full" />
                  <p className="text-xs text-gray-500">Analyzing document...</p>
                </div>
              )}
              {document.analysisStatus === 'completed' && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Complete</span>
                </div>
              )}
              {document.analysisStatus === 'failed' && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Failed</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {analysis?.errorMessage && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription data-testid="analysis-error-message">
                {analysis.errorMessage}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Results */}
      {showDetailedResults && (analysis || fraudDetection) && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ocr" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ocr" data-testid="tab-ocr">OCR Results</TabsTrigger>
                <TabsTrigger value="fraud" data-testid="tab-fraud">Fraud Detection</TabsTrigger>
              </TabsList>
              
              {/* OCR Results Tab */}
              <TabsContent value="ocr" className="space-y-4">
                {analysis ? (
                  <div className="space-y-4">
                    {/* Confidence Score */}
                    {analysis.confidenceScore && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Confidence Score</p>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={analysis.confidenceScore * 100} 
                            className="w-full" 
                            data-testid="confidence-progress"
                          />
                          <span className="text-sm font-medium" data-testid="confidence-score">
                            {Math.round(analysis.confidenceScore * 100)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Extracted Text */}
                    {analysis.extractedText && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Extracted Text</p>
                        <div 
                          className="p-3 bg-gray-50 rounded text-sm max-h-40 overflow-y-auto"
                          data-testid="extracted-text"
                        >
                          {analysis.extractedText}
                        </div>
                      </div>
                    )}

                    {/* Key-Value Pairs */}
                    {analysis.keyValuePairs && Object.keys(analysis.keyValuePairs).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Key Information</p>
                        <div className="grid grid-cols-2 gap-2 text-sm" data-testid="key-value-pairs">
                          {Object.entries(analysis.keyValuePairs).map(([key, value]) => (
                            <div key={key} className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="font-medium">{key}:</span>
                              <span>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>OCR analysis not available</p>
                  </div>
                )}
              </TabsContent>

              {/* Fraud Detection Tab */}
              <TabsContent value="fraud" className="space-y-4">
                {fraudDetection ? (
                  <div className="space-y-4">
                    {/* Risk Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Risk Level</p>
                        {getRiskBadge(fraudDetection.riskLevel)}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Fraud Score</p>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-red-500" />
                          <span className="font-medium" data-testid="fraud-score">
                            {Math.round(fraudDetection.overallFraudScore * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Authenticity</p>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-500" />
                          <span className="font-medium" data-testid="authenticity-score">
                            {Math.round(fraudDetection.authenticityScore * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Manual Review Required */}
                    {fraudDetection.requiresManualReview && (
                      <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription data-testid="manual-review-required">
                          This document requires manual review due to detected risk factors.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Detected Issues */}
                    {fraudDetection.detectedIssues?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Detected Issues</p>
                        <div className="space-y-2" data-testid="detected-issues">
                          {fraudDetection.detectedIssues.map((issue, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline">{issue.type}</Badge>
                                <Badge variant={
                                  issue.severity === 'high' ? 'destructive' : 
                                  issue.severity === 'medium' ? 'secondary' : 'default'
                                }>
                                  {issue.severity}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{issue.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Confidence: {Math.round(issue.confidence * 100)}%
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Review Notes */}
                    {fraudDetection.reviewNotes?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Review Notes</p>
                        <ul className="space-y-1 text-sm" data-testid="review-notes">
                          {fraudDetection.reviewNotes.map((note, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Eye className="w-3 h-3 mt-0.5 text-gray-400" />
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Fraud detection analysis not available</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}