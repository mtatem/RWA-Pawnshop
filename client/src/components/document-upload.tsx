import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Image, AlertTriangle, CheckCircle, Clock, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type DocumentType = 'coa' | 'nft_certificate' | 'insurance' | 'appraisal' | 'photo' | 'video' | 'other';

interface UploadedDocument {
  id: string;
  originalFileName: string;
  documentType: DocumentType;
  fileSize: number;
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  uploadProgress?: number;
  storageUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

interface DocumentUploadProps {
  submissionId: string;
  requiredDocuments: DocumentType[];
  onDocumentsChange: (documents: UploadedDocument[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  'coa': 'Certificate of Authenticity',
  'nft_certificate': 'NFT Certificate',
  'insurance': 'Insurance Documentation',
  'appraisal': 'Professional Appraisal',
  'photo': 'Photographs',
  'video': 'Video Documentation',
  'other': 'Other Documents'
};

const ACCEPTED_FILE_TYPES = {
  'image/*': ['jpg', 'jpeg', 'png', 'webp'],
  'application/pdf': ['pdf']
};

export default function DocumentUpload({
  submissionId,
  requiredDocuments,
  onDocumentsChange,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024 // 50MB
}: DocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // File validation
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit`;
    }

    // Check file type
    const isValidType = Object.keys(ACCEPTED_FILE_TYPES).some(acceptedType => {
      if (acceptedType === 'image/*') {
        return file.type.startsWith('image/');
      }
      return file.type === acceptedType;
    });

    if (!isValidType) {
      return 'File type not supported. Please use JPG, PNG, WEBP, or PDF files.';
    }

    return null;
  };

  // Upload single file
  const uploadFile = async (file: File, documentType: DocumentType): Promise<UploadedDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('submissionId', submissionId);
    formData.append('documentType', documentType);
    formData.append('priority', '1');

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.document.id,
        originalFileName: file.name,
        documentType,
        fileSize: file.size,
        analysisStatus: 'pending',
        uploadProgress: 100,
        storageUrl: data.document.storageUrl,
        thumbnailUrl: data.document.thumbnailUrl
      };
    } catch (error: any) {
      throw new Error(error.message || 'Upload failed');
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null, documentType?: DocumentType) => {
    if (!files || files.length === 0) return;

    // Check total file limit
    if (documents.length + files.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive"
      });
      return;
    }

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate each file
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    // Show validation errors
    if (errors.length > 0) {
      toast({
        title: "File validation failed",
        description: errors.join('\n'),
        variant: "destructive"
      });
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    const newDocuments: UploadedDocument[] = [];

    // Upload files in parallel
    try {
      const uploadPromises = validFiles.map(async (file, index) => {
        // Determine document type - use provided type or prompt user
        const type = documentType || await promptForDocumentType(file);
        
        // Add placeholder document
        const placeholderDoc: UploadedDocument = {
          id: `temp-${Date.now()}-${index}`,
          originalFileName: file.name,
          documentType: type,
          fileSize: file.size,
          analysisStatus: 'pending',
          uploadProgress: 0
        };

        setDocuments(prev => [...prev, placeholderDoc]);

        try {
          const uploadedDoc = await uploadFile(file, type);
          
          // Replace placeholder with actual document
          setDocuments(prev => 
            prev.map(doc => 
              doc.id === placeholderDoc.id ? uploadedDoc : doc
            )
          );

          newDocuments.push(uploadedDoc);

          toast({
            title: "Upload successful",
            description: `${file.name} uploaded and analysis started`
          });

          // Start polling for analysis results
          pollAnalysisStatus(uploadedDoc.id);

        } catch (error: any) {
          // Update placeholder with error
          setDocuments(prev => 
            prev.map(doc => 
              doc.id === placeholderDoc.id 
                ? { ...doc, analysisStatus: 'failed', error: error.message }
                : doc
            )
          );

          toast({
            title: "Upload failed",
            description: `${file.name}: ${error.message}`,
            variant: "destructive"
          });
        }
      });

      await Promise.allSettled(uploadPromises);
    } finally {
      setUploading(false);
    }

    // Notify parent of changes
    const updatedDocuments = [...documents, ...newDocuments];
    onDocumentsChange(updatedDocuments);
  }, [documents, submissionId, maxFiles, maxFileSize, toast, onDocumentsChange]);

  // Simple document type selection (in production, use a modal)
  const promptForDocumentType = async (file: File): Promise<DocumentType> => {
    // For now, auto-assign based on file type
    if (file.type.startsWith('image/')) {
      return 'photo';
    } else if (file.type === 'application/pdf') {
      return 'coa'; // Default PDF to CoA
    }
    return 'other';
  };

  // Poll analysis status
  const pollAnalysisStatus = async (documentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/analysis`);
        if (!response.ok) throw new Error('Failed to fetch analysis status');
        
        const data = await response.json();
        
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === documentId 
              ? { ...doc, analysisStatus: data.document.analysisStatus }
              : doc
          )
        );

        // Stop polling if analysis is complete or failed
        if (data.document.analysisStatus === 'completed' || 
            data.document.analysisStatus === 'failed') {
          clearInterval(pollInterval);
        }

      } catch (error) {
        console.error('Failed to fetch analysis status:', error);
        clearInterval(pollInterval);
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
  };

  // Remove document
  const removeDocument = (id: string) => {
    const updatedDocuments = documents.filter(doc => doc.id !== id);
    setDocuments(updatedDocuments);
    onDocumentsChange(updatedDocuments);
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Click to upload
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Get analysis status display
  const getStatusBadge = (status: string, error?: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" data-testid={`status-pending`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" data-testid={`status-processing`}><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'completed':
        return <Badge variant="default" data-testid={`status-completed`}><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive" data-testid={`status-failed`}><AlertTriangle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary" data-testid={`status-unknown`}>{status}</Badge>;
    }
  };

  // Check completion status
  const getCompletionStatus = () => {
    const requiredCount = requiredDocuments.length;
    const uploadedByType = documents.reduce((acc, doc) => {
      if (!acc[doc.documentType]) acc[doc.documentType] = 0;
      acc[doc.documentType]++;
      return acc;
    }, {} as Record<DocumentType, number>);

    const completed = requiredDocuments.every(type => uploadedByType[type] > 0);
    const completedCount = requiredDocuments.filter(type => uploadedByType[type] > 0).length;

    return { completed, completedCount, requiredCount };
  };

  const { completed, completedCount, requiredCount } = getCompletionStatus();

  return (
    <div className="space-y-4" data-testid="document-upload">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Document Upload
            {requiredCount > 0 && (
              <Badge variant={completed ? "default" : "secondary"} data-testid="completion-status">
                {completedCount}/{requiredCount} Required
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Required Documents List */}
          {requiredDocuments.length > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>Required Documents:</strong>{' '}
                {requiredDocuments.map(type => DOCUMENT_TYPE_LABELS[type]).join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Drop Zone */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            data-testid="upload-dropzone"
          >
            <div className="space-y-2">
              <Upload className="w-12 h-12 mx-auto text-gray-400" />
              <div>
                <p className="text-lg font-medium">Drop files here or click to upload</p>
                <p className="text-sm text-gray-500">
                  Supports JPG, PNG, WEBP, and PDF files up to {Math.round(maxFileSize / 1024 / 1024)}MB
                </p>
              </div>
              <Button variant="outline" disabled={uploading} data-testid="button-upload">
                {uploading ? 'Uploading...' : 'Choose Files'}
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            data-testid="input-file-upload"
          />
        </CardContent>
      </Card>

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents ({documents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`document-item-${doc.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded">
                      {doc.originalFileName.toLowerCase().includes('.pdf') ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <Image className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`document-name-${doc.id}`}>
                        {doc.originalFileName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {DOCUMENT_TYPE_LABELS[doc.documentType]} • {Math.round(doc.fileSize / 1024)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(doc.analysisStatus, doc.error)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(doc.id)}
                      data-testid={`button-remove-${doc.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}