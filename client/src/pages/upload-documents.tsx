import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import DocumentUpload from "@/components/document-upload";
import Footer from "@/components/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Upload, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function UploadDocuments() {
  const [, params] = useRoute("/upload-documents/:submissionId");
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const submissionId = params?.submissionId;

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Redirect if no submission ID
  useEffect(() => {
    if (!submissionId) {
      setLocation("/dashboard");
    }
  }, [submissionId, setLocation]);

  // Fetch submission details
  const { data: submission, isLoading: submissionLoading } = useQuery({
    queryKey: [`/api/rwa-submissions/${submissionId}`],
    enabled: !!submissionId && isAuthenticated,
  });

  if (isLoading || submissionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <div className="text-lg">Loading...</div>
          </Card>
        </div>
      </div>
    );
  }

  if (!submissionId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => setLocation("/dashboard")}
          className="mb-6"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Asset Documents</h1>
          <p className="text-muted-foreground">
            Complete your submission by uploading the required documentation
          </p>
        </div>

        {/* Success & Thank You Alert */}
        <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            <div className="space-y-2">
              <div>
                <span className="font-semibold text-lg">Thank You for Your Submission!</span>
                {submission?.data?.assetName && (
                  <span className="ml-2 font-medium">({submission.data.assetName})</span>
                )}
              </div>
              <p className="text-sm">
                Your asset submission has been successfully received and is now under review by our team at RWApawn. 
                We'll notify you once the review is complete. Please upload your documents below to help expedite the process.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Submission Details */}
        {submission?.data && (
          <Card className="mb-6 p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <Upload className="mr-2 h-5 w-5 text-primary" />
              Submission Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Asset Name:</span>
                <p className="font-medium">{submission.data.assetName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Category:</span>
                <p className="font-medium capitalize">{submission.data.category}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estimated Value:</span>
                <p className="font-medium">${parseFloat(submission.data.estimatedValue).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium capitalize">{submission.data.status}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Document Upload Section */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Required Documents</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Upload the following documents to complete your submission. All documents are required for approval.
          </p>
          
          <DocumentUpload
            submissionId={submissionId}
            requiredDocuments={['coa', 'nft_certificate', 'photo']}
            onDocumentsChange={(docs) => {
              console.log('Documents updated:', docs);
            }}
            maxFiles={5}
            maxFileSize={50 * 1024 * 1024}
          />

          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Upload in progress? Your documents are automatically saved.
            </p>
            <Button
              onClick={() => setLocation("/dashboard")}
              data-testid="button-finish"
            >
              Finish & Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
