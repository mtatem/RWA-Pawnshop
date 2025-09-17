import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Eye, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FileText, 
  Image,
  ExternalLink,
  Maximize2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DocumentViewerProps {
  documentId: string;
  showOcrOverlay?: boolean;
  compact?: boolean;
}

interface Document {
  id: string;
  originalFileName: string;
  documentType: string;
  analysisStatus: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
}

interface AnalysisResult {
  extractedText?: string;
  detectedElements?: Array<{
    type: string;
    text: string;
    confidence: number;
    boundingBox: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  }>;
  keyValuePairs?: Record<string, any>;
}

export default function DocumentViewer({ 
  documentId, 
  showOcrOverlay = false, 
  compact = false 
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'text' | 'elements'>('none');
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch document and analysis data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/documents', documentId, 'analysis'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/documents/${documentId}/analysis`);
      return await response.json();
    }
  });

  const documentData: Document = data?.document;
  const analysis: AnalysisResult = data?.analysis;

  // Handle zoom
  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    if (direction === 'in') {
      setZoom(prev => Math.min(prev * 1.2, 5));
    } else if (direction === 'out') {
      setZoom(prev => Math.max(prev / 1.2, 0.2));
    } else {
      setZoom(1);
    }
  };

  // Handle rotation
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Handle download
  const handleDownload = async () => {
    try {
      const response = await fetch(documentData.storageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = documentData.originalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Get document type icon
  const getDocumentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  // Render OCR overlay
  const renderOcrOverlay = () => {
    if (!analysis?.detectedElements || activeOverlay === 'none') return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {analysis.detectedElements.map((element, index) => {
          const style = {
            left: `${element.boundingBox.left}%`,
            top: `${element.boundingBox.top}%`,
            width: `${element.boundingBox.width}%`,
            height: `${element.boundingBox.height}%`,
            opacity: activeOverlay === 'text' ? 0.7 : 0.3,
          };

          return (
            <div
              key={index}
              className={`absolute border-2 ${
                element.type === 'text' ? 'border-blue-500 bg-blue-100' :
                element.type === 'table' ? 'border-green-500 bg-green-100' :
                'border-yellow-500 bg-yellow-100'
              }`}
              style={style}
              title={`${element.type}: ${element.text} (${Math.round(element.confidence * 100)}%)`}
            >
              {activeOverlay === 'text' && (
                <div className="absolute -top-6 left-0 text-xs bg-black text-white px-1 rounded max-w-40 truncate">
                  {element.text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={compact ? "h-48" : "h-96"} data-testid="document-viewer-loading">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading document...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !documentData) {
    return (
      <Card className={compact ? "h-48" : "h-96"} data-testid="document-viewer-error">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Failed to load document</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Document viewer content
  const viewerContent = (
    <div className="space-y-4" data-testid="document-viewer">
      {/* Document Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getDocumentIcon(documentData.mimeType)}
            <span className="font-medium" data-testid="document-title">
              {documentData.originalFileName}
            </span>
            <Badge variant="outline" data-testid="document-type">
              {documentData.documentType}
            </Badge>
            {documentData.analysisStatus === 'completed' && (
              <Badge variant="default">Analyzed</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleDownload} data-testid="button-download">
              <Download className="w-4 h-4" />
            </Button>
            <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-fullscreen">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl h-[90vh]">
                <DialogHeader>
                  <DialogTitle>{documentData.originalFileName}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                  {/* Full-screen viewer content would go here */}
                  <DocumentViewer 
                    documentId={documentId} 
                    showOcrOverlay={true} 
                    compact={false}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Viewer Controls */}
      {showOcrOverlay && analysis && (
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
          <div className="flex items-center gap-2">
            <Button
              variant={activeOverlay === 'none' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveOverlay('none')}
              data-testid="button-overlay-none"
            >
              Image
            </Button>
            <Button
              variant={activeOverlay === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveOverlay('text')}
              data-testid="button-overlay-text"
            >
              Text
            </Button>
            <Button
              variant={activeOverlay === 'elements' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveOverlay('elements')}
              data-testid="button-overlay-elements"
            >
              Elements
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleZoom('out')} data-testid="button-zoom-out">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm px-2" data-testid="zoom-level">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={() => handleZoom('in')} data-testid="button-zoom-in">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRotate} data-testid="button-rotate">
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleZoom('reset')} data-testid="button-zoom-reset">
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* Document Display */}
      <div className={`relative overflow-hidden bg-gray-100 rounded ${compact ? 'h-48' : 'h-96'}`}>
        <div 
          ref={containerRef}
          className="w-full h-full overflow-auto flex items-center justify-center"
        >
          <div className="relative">
            {documentData.mimeType.startsWith('image/') ? (
              <div className="relative">
                <img
                  ref={imageRef}
                  src={documentData.storageUrl}
                  alt={documentData.originalFileName}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                  }}
                  data-testid="document-image"
                />
                {renderOcrOverlay()}
              </div>
            ) : documentData.mimeType === 'application/pdf' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">PDF Document</p>
                  <Button variant="outline" onClick={handleDownload} data-testid="button-download-pdf">
                    <Download className="w-4 h-4 mr-2" />
                    Download to View
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Preview not available</p>
                  <Button variant="outline" onClick={handleDownload} className="mt-2">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Results Tab */}
      {!compact && analysis && (
        <Tabs defaultValue="text" className="w-full">
          <TabsList>
            <TabsTrigger value="text" data-testid="tab-extracted-text">Extracted Text</TabsTrigger>
            <TabsTrigger value="data" data-testid="tab-key-data">Key Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="space-y-2">
            {analysis.extractedText ? (
              <div 
                className="p-4 bg-gray-50 rounded text-sm max-h-40 overflow-y-auto whitespace-pre-wrap"
                data-testid="extracted-text-content"
              >
                {analysis.extractedText}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No text extracted
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="data" className="space-y-2">
            {analysis.keyValuePairs && Object.keys(analysis.keyValuePairs).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2" data-testid="key-value-data">
                {Object.entries(analysis.keyValuePairs).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium">{key}:</span>
                    <span className="text-gray-600">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No structured data extracted
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );

  return compact ? (
    <Card className="h-full">
      <CardContent className="p-4 h-full">
        {viewerContent}
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Document Viewer
        </CardTitle>
      </CardHeader>
      <CardContent>
        {viewerContent}
      </CardContent>
    </Card>
  );
}