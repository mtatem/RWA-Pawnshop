import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  RotateCcw, 
  Play, 
  FileText,
  Users,
  TrendingUp,
  Shield,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DocumentViewer from "./document-viewer";
import DocumentAnalysisStatus from "./document-analysis-status";

interface QueueItem {
  id: string;
  documentId: string;
  priority: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed';
  errorMessage?: string;
  createdAt: string;
  document: {
    id: string;
    originalFileName: string;
    documentType: string;
    analysisStatus: string;
    submissionId: string;
  };
}

interface DocumentStats {
  documents: {
    total_documents: number;
    pending_analysis: number;
    processing_analysis: number;
    completed_analysis: number;
    failed_analysis: number;
    avg_processing_time: number;
  };
  fraud_detection: {
    total_analyzed: number;
    high_risk: number;
    critical_risk: number;
    requires_review: number;
    avg_fraud_score: number;
  };
  timestamp: string;
}

export default function AdminDocumentQueue() {
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch document queue
  const { data: queueData, isLoading: queueLoading, error: queueError } = useQuery({
    queryKey: ['/api/admin/documents/queue'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/documents/queue');
      return await response.json();
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch document statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/documents/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/documents/stats');
      return await response.json();
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Process single document mutation
  const processMutation = useMutation({
    mutationFn: async (queueId: string) => {
      const response = await apiRequest('POST', `/api/admin/documents/queue/${queueId}/process`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Processing Started",
        description: "Document processing has been initiated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents/queue'] });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to start document processing",
        variant: "destructive",
      });
    },
  });

  // Batch analyze mutation
  const batchMutation = useMutation({
    mutationFn: async (documentIds: string[]) => {
      const response = await apiRequest('POST', '/api/admin/documents/batch-analyze', { documentIds });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Batch Analysis Started",
        description: `Processing ${data.processed?.length || 0} documents`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents/queue'] });
    },
    onError: (error: any) => {
      toast({
        title: "Batch Analysis Failed",
        description: error.message || "Failed to start batch analysis",
        variant: "destructive",
      });
    },
  });

  // Get status badge for queue items
  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { variant: "secondary" as const, icon: Clock, text: "Pending" },
      processing: { variant: "outline" as const, icon: Clock, text: "Processing" },
      failed: { variant: "destructive" as const, icon: AlertTriangle, text: "Failed" },
    };
    
    const config = badges[status as keyof typeof badges] || badges.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  // Get priority badge
  const getPriorityBadge = (priority: number) => {
    const variants = {
      1: { variant: "default" as const, text: "Low" },
      2: { variant: "secondary" as const, text: "Medium" }, 
      3: { variant: "destructive" as const, text: "High" },
    };
    
    const config = variants[priority as keyof typeof variants] || variants[1];
    
    return (
      <Badge variant={config.variant}>
        {config.text} Priority
      </Badge>
    );
  };

  // Handle batch processing
  const handleBatchProcess = () => {
    const pendingDocuments = queueData?.queue
      ?.filter((item: QueueItem) => item.status === 'pending')
      ?.map((item: QueueItem) => item.documentId) || [];
      
    if (pendingDocuments.length === 0) {
      toast({
        title: "No Documents to Process",
        description: "There are no pending documents in the queue",
        variant: "default",
      });
      return;
    }
    
    batchMutation.mutate(pendingDocuments);
  };

  const stats: DocumentStats = statsData;
  const queue: QueueItem[] = queueData?.queue || [];
  const totalPending = queueData?.totalPending || 0;
  const totalProcessing = queueData?.totalProcessing || 0;
  const totalFailed = queueData?.totalFailed || 0;

  return (
    <div className="space-y-6" data-testid="admin-document-queue">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-2xl font-bold" data-testid="stat-total-documents">
                    {stats.documents.total_documents}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Queue Status</p>
                  <p className="text-2xl font-bold" data-testid="stat-queue-pending">
                    {totalPending}
                  </p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Risk</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="stat-high-risk">
                    {stats.fraud_detection.high_risk + stats.fraud_detection.critical_risk}
                  </p>
                  <p className="text-xs text-gray-500">Documents</p>
                </div>
                <Shield className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Processing</p>
                  <p className="text-2xl font-bold" data-testid="stat-avg-processing">
                    {Math.round(stats.documents.avg_processing_time || 0)}s
                  </p>
                  <p className="text-xs text-gray-500">Per Document</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Document Queue ({queue.length})
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchProcess}
                    disabled={batchMutation.isPending || totalPending === 0}
                    data-testid="button-batch-process"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Process All ({totalPending})
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pending">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pending" data-testid="tab-pending">
                    Pending ({totalPending})
                  </TabsTrigger>
                  <TabsTrigger value="processing" data-testid="tab-processing">
                    Processing ({totalProcessing})
                  </TabsTrigger>
                  <TabsTrigger value="failed" data-testid="tab-failed">
                    Failed ({totalFailed})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-3">
                  {queue
                    .filter(item => item.status === 'pending')
                    .map((item) => (
                      <QueueItemCard
                        key={item.id}
                        item={item}
                        onProcess={() => processMutation.mutate(item.id)}
                        onView={() => setSelectedDocument(item.documentId)}
                        isProcessing={processMutation.isPending}
                      />
                    ))}
                </TabsContent>

                <TabsContent value="processing" className="space-y-3">
                  {queue
                    .filter(item => item.status === 'processing')
                    .map((item) => (
                      <QueueItemCard
                        key={item.id}
                        item={item}
                        onView={() => setSelectedDocument(item.documentId)}
                        isProcessing={false}
                      />
                    ))}
                </TabsContent>

                <TabsContent value="failed" className="space-y-3">
                  {queue
                    .filter(item => item.status === 'failed')
                    .map((item) => (
                      <QueueItemCard
                        key={item.id}
                        item={item}
                        onProcess={() => processMutation.mutate(item.id)}
                        onView={() => setSelectedDocument(item.documentId)}
                        isProcessing={processMutation.isPending}
                        showRetry
                      />
                    ))}
                </TabsContent>
              </Tabs>

              {queue.length === 0 && !queueLoading && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No documents in queue</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Document Details */}
        <div>
          {selectedDocument ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Document Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocumentViewer 
                    documentId={selectedDocument}
                    showOcrOverlay={true}
                    compact={true}
                  />
                </CardContent>
              </Card>
              
              <DocumentAnalysisStatus 
                documentId={selectedDocument}
                showDetailedResults={true}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Select a document to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Queue Item Card Component
interface QueueItemCardProps {
  item: QueueItem;
  onProcess?: () => void;
  onView: () => void;
  isProcessing: boolean;
  showRetry?: boolean;
}

function QueueItemCard({ item, onProcess, onView, isProcessing, showRetry }: QueueItemCardProps) {
  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { variant: "secondary" as const, icon: Clock, text: "Pending" },
      processing: { variant: "outline" as const, icon: Clock, text: "Processing" },
      failed: { variant: "destructive" as const, icon: AlertTriangle, text: "Failed" },
    };
    
    const config = badges[status as keyof typeof badges] || badges.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: number) => {
    const variants = {
      1: { variant: "default" as const, text: "Low" },
      2: { variant: "secondary" as const, text: "Medium" }, 
      3: { variant: "destructive" as const, text: "High" },
    };
    
    const config = variants[priority as keyof typeof variants] || variants[1];
    
    return (
      <Badge variant={config.variant}>
        {config.text} Priority
      </Badge>
    );
  };

  return (
    <div 
      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
      data-testid={`queue-item-${item.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="font-medium" data-testid={`item-filename-${item.id}`}>
            {item.document.originalFileName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(item.status)}
          {getPriorityBadge(item.priority)}
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>
          <span>Type: {item.document.documentType}</span>
          {item.retryCount > 0 && (
            <span className="ml-2">• Retries: {item.retryCount}/{item.maxRetries}</span>
          )}
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onView}
            data-testid={`button-view-${item.id}`}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {onProcess && (showRetry || item.status === 'pending') && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onProcess}
              disabled={isProcessing}
              data-testid={`button-process-${item.id}`}
            >
              {showRetry ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {item.errorMessage && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-sm" data-testid={`error-message-${item.id}`}>
            {item.errorMessage}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}