import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  Shield, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Search,
  Filter,
  MoreHorizontal,
  FileText,
  Calendar,
  Flag,
  Fingerprint,
  UserCheck,
  AlertCircle,
  Edit,
  Save,
  X
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { adminApiRequest, getAdminQueryFn } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface KycSubmission {
  id: string;
  userId: string;
  documentType: string;
  documentCountry: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  user?: {
    id: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface KycDocuments {
  documentFront: string | null;
  documentBack: string | null;
  selfie: string | null;
}

interface KycSubmissionsData {
  submissions: KycSubmission[];
  totalCount: number;
  breakdown: {
    byStatus: Record<string, number>;
  };
}

// Review form schema
const kycReviewSchema = z.object({
  status: z.enum(['completed', 'rejected'], {
    required_error: "Status is required"
  }),
  reviewNotes: z.string().min(1, "Review notes are required").max(1000, "Review notes too long"),
  rejectionReason: z.string().optional()
});

type KycReviewForm = z.infer<typeof kycReviewSchema>;

export default function KycManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filters and search
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKyc, setSelectedKyc] = useState<KycSubmission | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  
  // Review form
  const reviewForm = useForm<KycReviewForm>({
    resolver: zodResolver(kycReviewSchema),
    defaultValues: {
      status: 'completed',
      reviewNotes: '',
      rejectionReason: ''
    }
  });

  // Fetch KYC submissions with filters
  const { data: kycData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/kyc', { status: statusFilter, search: searchTerm }],
    queryFn: getAdminQueryFn({ on401: "throw" }),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Review KYC submission mutation
  const reviewKycMutation = useMutation({
    mutationFn: async ({ kycId, reviewData }: { kycId: string; reviewData: KycReviewForm }) => {
      const response = await adminApiRequest('PATCH', `/api/admin/kyc/${kycId}/review`, reviewData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "KYC Review Completed",
        description: "The KYC submission has been reviewed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/kyc'] });
      setIsReviewDialogOpen(false);
      setSelectedKyc(null);
      reviewForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Review Failed",
        description: error.message || "Failed to review KYC submission. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onReviewSubmit = (data: KycReviewForm) => {
    if (selectedKyc) {
      reviewKycMutation.mutate({ kycId: selectedKyc.id, reviewData: data });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">In Progress</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100">Unknown</Badge>;
    }
  };

  const getDocumentTypeBadge = (documentType: string) => {
    const formattedType = documentType.replace('_', ' ').toUpperCase();
    return <Badge variant="outline">{formattedType}</Badge>;
  };

  // State for document blob URLs
  const [documentImages, setDocumentImages] = useState<{
    documentFront: string | null;
    documentBack: string | null;
    selfie: string | null;
  }>({
    documentFront: null,
    documentBack: null,
    selfie: null
  });
  const [loadingImages, setLoadingImages] = useState(false);

  // Fetch KYC documents when reviewing
  const { data: kycDocuments, isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/admin/kyc', selectedKyc?.id, 'documents'],
    queryFn: getAdminQueryFn({ on401: "throw" }),
    enabled: !!selectedKyc?.id && isReviewDialogOpen,
  });

  // Fetch images with authentication and create blob URLs
  useEffect(() => {
    let isMounted = true;
    const urls: string[] = [];
    
    const fetchImages = async () => {
      if (!kycDocuments?.data || !isReviewDialogOpen || !selectedKyc) {
        // Reset images when dialog closes
        setDocumentImages({ documentFront: null, documentBack: null, selfie: null });
        return;
      }
      
      setLoadingImages(true);
      const images: any = {
        documentFront: null,
        documentBack: null,
        selfie: null
      };

      try {
        const docs = (kycDocuments as any).data;
        
        // Fetch document front
        if (docs.documentFront && isMounted) {
          try {
            const response = await adminApiRequest('GET', docs.documentFront);
            if (response.ok && isMounted) {
              const blob = await response.blob();
              if (isMounted) {
                const blobUrl = URL.createObjectURL(blob);
                images.documentFront = blobUrl;
                urls.push(blobUrl);
              }
            }
          } catch (err) {
            console.error('Error fetching document front:', err);
          }
        }

        // Fetch document back
        if (docs.documentBack && isMounted) {
          try {
            const response = await adminApiRequest('GET', docs.documentBack);
            if (response.ok && isMounted) {
              const blob = await response.blob();
              if (isMounted) {
                const blobUrl = URL.createObjectURL(blob);
                images.documentBack = blobUrl;
                urls.push(blobUrl);
              }
            }
          } catch (err) {
            console.error('Error fetching document back:', err);
          }
        }

        // Fetch selfie
        if (docs.selfie && isMounted) {
          try {
            const response = await adminApiRequest('GET', docs.selfie);
            if (response.ok && isMounted) {
              const blob = await response.blob();
              if (isMounted) {
                const blobUrl = URL.createObjectURL(blob);
                images.selfie = blobUrl;
                urls.push(blobUrl);
              }
            }
          } catch (err) {
            console.error('Error fetching selfie:', err);
          }
        }

        if (isMounted) {
          setDocumentImages(images);
        }
      } catch (error) {
        console.error('Error fetching KYC documents:', error);
        if (isMounted) {
          toast({
            title: "Error Loading Documents",
            description: "Failed to load KYC documents. Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setLoadingImages(false);
        }
      }
    };

    fetchImages();

    // Cleanup blob URLs when dialog closes or effect re-runs
    return () => {
      isMounted = false;
      urls.forEach(url => URL.revokeObjectURL(url));
      // Reset state when unmounting
      setDocumentImages({ documentFront: null, documentBack: null, selfie: null });
    };
  }, [kycDocuments, isReviewDialogOpen, selectedKyc, toast]);

  const handleReviewClick = (kyc: KycSubmission) => {
    setSelectedKyc(kyc);
    reviewForm.reset({
      status: 'completed',
      reviewNotes: '',
      rejectionReason: ''
    });
    setIsReviewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load KYC data. Please try refreshing the page.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const submissions = (kycData as any)?.data?.submissions || [];
  const breakdown = (kycData as any)?.data?.breakdown || { byStatus: {} };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Pending Review</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {breakdown.byStatus?.pending || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Verified</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {breakdown.byStatus?.completed || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Rejected</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {breakdown.byStatus?.rejected || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">In Progress</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {breakdown.byStatus?.in_progress || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>KYC Management</span>
          </CardTitle>
          <CardDescription>
            Review and manage user identity verification submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by user email, name, or document type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                data-testid="search-kyc"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="filter-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* KYC Submissions List */}
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No KYC submissions found</p>
              </div>
            ) : (
              submissions.map((kyc) => (
                <Card key={kyc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium">
                              {kyc.user?.firstName && kyc.user?.lastName 
                                ? `${kyc.user.firstName} ${kyc.user.lastName}`
                                : kyc.user?.username || 'Unknown User'
                              }
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {kyc.user?.email || 'No email'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(kyc.status)}
                            {getDocumentTypeBadge(kyc.documentType)}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Submitted: {new Date(kyc.submittedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Flag className="h-4 w-4" />
                            <span>Country: {kyc.documentCountry}</span>
                          </div>
                          {kyc.reviewedAt && (
                            <div className="flex items-center space-x-1">
                              <UserCheck className="h-4 w-4" />
                              <span>Reviewed: {new Date(kyc.reviewedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {kyc.rejectionReason && (
                          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            <p className="text-sm text-red-700 dark:text-red-300">
                              <strong>Rejection Reason:</strong> {kyc.rejectionReason}
                            </p>
                          </div>
                        )}

                        {kyc.reviewNotes && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <strong>Review Notes:</strong> {kyc.reviewNotes}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReviewClick(kyc)}
                          disabled={kyc.status === 'completed'}
                          data-testid={`review-kyc-${kyc.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {kyc.status === 'completed' ? 'Verified' : 'Review'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review KYC Submission</DialogTitle>
            <DialogDescription>
              Review and approve or reject this KYC verification
            </DialogDescription>
          </DialogHeader>
          
          {selectedKyc && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <p className="font-medium">
                  {selectedKyc.user?.firstName && selectedKyc.user?.lastName 
                    ? `${selectedKyc.user.firstName} ${selectedKyc.user.lastName}`
                    : selectedKyc.user?.username || 'Unknown User'
                  }
                </p>
                <p className="text-sm text-muted-foreground">{selectedKyc.user?.email}</p>
                <p className="text-sm text-muted-foreground">
                  Document: {selectedKyc?.documentType?.replace('_', ' ').toUpperCase() || 'Not specified'} ({selectedKyc?.documentCountry || 'N/A'})
                </p>
              </div>

              {/* KYC Documents Display */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Submitted Documents</h4>
                {documentsLoading || loadingImages ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {documentImages.documentFront && (
                      <div className="space-y-1">
                        <Label className="text-xs">Document Front</Label>
                        <div className="border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <img 
                            src={documentImages.documentFront} 
                            alt="Document Front" 
                            className="w-full h-auto"
                            data-testid="img-document-front"
                          />
                        </div>
                      </div>
                    )}
                    
                    {documentImages.documentBack && (
                      <div className="space-y-1">
                        <Label className="text-xs">Document Back</Label>
                        <div className="border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <img 
                            src={documentImages.documentBack} 
                            alt="Document Back" 
                            className="w-full h-auto"
                            data-testid="img-document-back"
                          />
                        </div>
                      </div>
                    )}
                    
                    {documentImages.selfie && (
                      <div className="space-y-1">
                        <Label className="text-xs">Selfie Verification</Label>
                        <div className="border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <img 
                            src={documentImages.selfie} 
                            alt="Selfie" 
                            className="w-full h-auto"
                            data-testid="img-selfie"
                          />
                        </div>
                      </div>
                    )}
                    
                    {!documentImages.documentFront && !documentImages.documentBack && !documentImages.selfie && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No documents available
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Form {...reviewForm}>
                <form onSubmit={reviewForm.handleSubmit(onReviewSubmit)} className="space-y-4">
                  <FormField
                    control={reviewForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review Decision</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-review-status">
                              <SelectValue placeholder="Select review decision" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="completed">Approve & Verify</SelectItem>
                            <SelectItem value="rejected">Reject</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={reviewForm.control}
                    name="reviewNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Add notes about your review decision..."
                            data-testid="textarea-review-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {reviewForm.watch('status') === 'rejected' && (
                    <FormField
                      control={reviewForm.control}
                      name="rejectionReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rejection Reason</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Explain why this KYC submission is being rejected..."
                              data-testid="textarea-rejection-reason"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsReviewDialogOpen(false)}
                      data-testid="button-cancel-review"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={reviewKycMutation.isPending}
                      data-testid="button-submit-review"
                    >
                      {reviewKycMutation.isPending ? "Submitting..." : "Submit Review"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}