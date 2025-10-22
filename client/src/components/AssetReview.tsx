import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Clock, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  DollarSign,
  Calendar,
  Star,
  Flag,
  MapPin,
  User,
  Camera,
  Shield,
  Download,
  RefreshCw,
  Filter
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { adminApiRequest, getAdminQueryFn } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";

interface AssetSubmission {
  id: string;
  assetName: string;
  category: string;
  description: string;
  estimatedValue: string;
  userId: string;
  walletAddress: string;
  documentIds: string[];
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  images: string[];
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface AssetReview {
  id: string;
  submissionId: string;
  reviewType: 'initial' | 'detailed' | 'physical_inspection' | 'coa_verification';
  status: 'pending' | 'in_progress' | 'completed' | 'escalated';
  priority: number; // 1=low, 2=medium, 3=high, 4=urgent
  assignedTo?: string;
  estimatedValue?: string;
  adjustedValue?: string;
  confidenceLevel: string;
  riskAssessment: string;
  reviewNotes?: string;
  inspectionRequired: boolean;
  inspectionScheduled?: string;
  coaStatus?: 'verified' | 'invalid' | 'missing' | 'pending';
  flaggedReasons?: string[];
  createdAt: string;
  updatedAt: string;
  submission?: AssetSubmission;
}

interface AssetReviewData {
  reviews: AssetReview[];
  totalCount: number;
  breakdown: {
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

export default function AssetReview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filters and selection
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedReview, setSelectedReview] = useState<AssetReview | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Form for asset review decisions
  const reviewForm = useForm({
    defaultValues: {
      decision: '',
      adjustedValue: '',
      reviewNotes: '',
      inspectionRequired: false,
      riskLevel: 'medium',
      confidenceLevel: '80'
    }
  });

  // Fetch pending asset reviews
  const { data: assetReviewData, isLoading, refetch } = useQuery<AssetReviewData>({
    queryKey: ["/api/admin/assets/pending", { status: statusFilter === 'all' ? '' : statusFilter, priority: priorityFilter === 'all' ? '' : priorityFilter }],
    queryFn: getAdminQueryFn({ on401: "throw" }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create asset review mutation
  const createReviewMutation = useMutation({
    mutationFn: async ({ submissionId, reviewData }: { submissionId: string; reviewData: any }) => {
      const response = await adminApiRequest("POST", `/api/admin/assets/${submissionId}/review`, reviewData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review Created",
        description: "Asset review has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/assets/pending"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Review",
        description: error.message || "An error occurred while creating the review.",
        variant: "destructive",
      });
    },
  });

  // Update asset review mutation
  const updateReviewMutation = useMutation({
    mutationFn: async ({ reviewId, updates }: { reviewId: string; updates: any }) => {
      const response = await adminApiRequest("PATCH", `/api/admin/assets/review/${reviewId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review Updated",
        description: "Asset review has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/assets/pending"] });
      setIsReviewDialogOpen(false);
      setSelectedReview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update asset review.",
        variant: "destructive",
      });
    },
  });

  // Approve asset mutation
  const approveAssetMutation = useMutation({
    mutationFn: async ({ submissionId, reviewData }: { submissionId: string; reviewData: any }) => {
      const response = await adminApiRequest("POST", `/api/admin/assets/${submissionId}/approve`, reviewData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Asset Approved",
        description: "Asset submission has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/assets/pending"] });
      setIsReviewDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve asset submission.",
        variant: "destructive",
      });
    },
  });

  // Reject asset mutation
  const rejectAssetMutation = useMutation({
    mutationFn: async ({ submissionId, reasoning }: { submissionId: string; reasoning: string }) => {
      const response = await adminApiRequest("POST", `/api/admin/assets/${submissionId}/reject`, { reasoning });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Asset Rejected",
        description: "Asset submission has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/assets/pending"] });
      setIsReviewDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject asset submission.",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'in_progress': return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'escalated': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  // Convert numeric priority to string label
  const getPriorityLabel = (priority: number): string => {
    switch (priority) {
      case 1: return 'LOW';
      case 2: return 'MEDIUM';
      case 3: return 'HIGH';
      case 4: return 'URGENT';
      default: return 'NORMAL';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 4: return 'bg-red-100 text-red-800 border-red-200'; // urgent
      case 3: return 'bg-orange-100 text-orange-800 border-orange-200'; // high
      case 2: return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // medium
      case 1: return 'bg-green-100 text-green-800 border-green-200'; // low
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCoaStatusColor = (status?: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'invalid': return 'bg-red-100 text-red-800';
      case 'missing': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Less than an hour ago";
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  };

  const handleAssignReview = (reviewId: string) => {
    updateReviewMutation.mutate({
      reviewId,
      updates: { 
        status: 'in_progress',
        assignedTo: 'current-admin-id' // This should be actual admin ID
      }
    });
  };

  const handleApproveAsset = (data: any) => {
    if (!selectedReview?.submission) return;
    
    approveAssetMutation.mutate({
      submissionId: selectedReview.submission.id,
      reviewData: {
        estimatedValue: data.adjustedValue || selectedReview.submission.estimatedValue,
        reasoning: data.reviewNotes,
        conditions: data.conditions || []
      }
    });
  };

  const handleRejectAsset = (reasoning: string) => {
    if (!selectedReview?.submission) return;
    
    rejectAssetMutation.mutate({
      submissionId: selectedReview.submission.id,
      reasoning
    });
  };

  const filteredReviews = assetReviewData?.reviews?.filter(review => {
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || review.submission?.category === categoryFilter;
    return matchesCategory;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Asset Review Workflow</h2>
          <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-6 space-y-3">
                <div className="bg-gray-200 h-4 w-3/4 rounded"></div>
                <div className="bg-gray-200 h-6 w-1/2 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="asset-review">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="asset-review-title">
            Asset Review Workflow
          </h2>
          <p className="text-muted-foreground">
            Manual asset verification and approval processes
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center gap-2">
            <FileText className="h-3 w-3" />
            {assetReviewData?.totalCount || 0} Pending Reviews
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            data-testid="refresh-reviews-button"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {assetReviewData?.breakdown?.byStatus && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(assetReviewData.breakdown.byStatus).map(([status, count]) => (
            <Card key={status} data-testid={`status-card-${status}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(status)}
                    <span className="font-medium capitalize">{status.replace('_', ' ')}</span>
                  </div>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-background dark:bg-black border-border dark:border-gray-800">
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]" data-testid="priority-filter">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent className="bg-background dark:bg-black border-border dark:border-gray-800">
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="all">All Priorities</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]" data-testid="category-filter">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-background dark:bg-black border-border dark:border-gray-800">
                <SelectItem value="jewelry">Jewelry</SelectItem>
                <SelectItem value="watches">Watches</SelectItem>
                <SelectItem value="art">Art</SelectItem>
                <SelectItem value="collectibles">Collectibles</SelectItem>
                <SelectItem value="vehicles">Vehicles</SelectItem>
                <SelectItem value="all">All Categories</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No Asset Reviews</h3>
              <p className="text-gray-500">No asset reviews match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review.id} className={`border-l-4 ${
              review.priority === 4 ? 'border-l-red-500' :
              review.priority === 3 ? 'border-l-orange-500' :
              review.priority === 2 ? 'border-l-yellow-500' :
              'border-l-green-500'
            }`} data-testid={`review-card-${review.id}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {getStatusIcon(review.status)}
                      <Badge className={getPriorityColor(review.priority)}>
                        {getPriorityLabel(review.priority)}
                      </Badge>
                      <Badge variant="outline">
                        {review.reviewType.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {review.coaStatus && (
                        <Badge className={getCoaStatusColor(review.coaStatus)}>
                          COA: {review.coaStatus.toUpperCase()}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold mb-2" data-testid={`review-title-${review.id}`}>
                      {review.submission?.assetName || 'Unknown Asset'}
                    </h3>

                    <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-4">
                      <div>
                        <span className="font-medium">Category:</span>{' '}
                        {review.submission?.category || 'Unknown'}
                      </div>
                      <div>
                        <span className="font-medium">Estimated Value:</span>{' '}
                        {review.submission?.estimatedValue ? formatCurrency(review.submission.estimatedValue) : 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>{' '}
                        {formatTimeAgo(review.createdAt)}
                      </div>
                    </div>

                    {review.adjustedValue && (
                      <div className="flex items-center space-x-2 mb-3">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          <span className="font-medium">Adjusted Value:</span>{' '}
                          <span className="text-green-600 font-bold">
                            {formatCurrency(review.adjustedValue)}
                          </span>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4" />
                        <span>Confidence: {review.confidenceLevel}%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Shield className="h-4 w-4" />
                        <span>Risk: {review.riskAssessment}</span>
                      </div>
                      {review.inspectionRequired && (
                        <div className="flex items-center space-x-1">
                          <Camera className="h-4 w-4 text-orange-600" />
                          <span className="text-orange-600">Inspection Required</span>
                        </div>
                      )}
                    </div>

                    {review.reviewNotes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-sm">Review Notes:</span>
                        <p className="text-sm text-gray-700 mt-1">{review.reviewNotes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedReview(review)}
                          data-testid={`review-asset-${review.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review Asset
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Asset Review: {selectedReview?.submission?.assetName}
                          </DialogTitle>
                          <DialogDescription>
                            Review ID: {selectedReview?.id}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedReview && (
                          <Tabs defaultValue="details" className="space-y-6">
                            <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="details">Asset Details</TabsTrigger>
                              <TabsTrigger value="images">Images</TabsTrigger>
                              <TabsTrigger value="documents">Documents</TabsTrigger>
                              <TabsTrigger value="review">Review Decision</TabsTrigger>
                            </TabsList>

                            {/* Asset Details Tab */}
                            <TabsContent value="details" className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                  <Label className="text-sm font-medium">Asset Information</Label>
                                  <div className="space-y-2 mt-2">
                                    <div><span className="font-medium">Name:</span> {selectedReview.submission?.assetName}</div>
                                    <div><span className="font-medium">Category:</span> {selectedReview.submission?.category}</div>
                                    <div><span className="font-medium">Estimated Value:</span> {selectedReview.submission?.estimatedValue ? formatCurrency(selectedReview.submission.estimatedValue) : 'N/A'}</div>
                                    <div><span className="font-medium">Description:</span></div>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                                      {selectedReview.submission?.description || 'No description provided'}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Review Information</Label>
                                  <div className="space-y-2 mt-2">
                                    <div><span className="font-medium">Review Type:</span> {selectedReview.reviewType.replace('_', ' ')}</div>
                                    <div><span className="font-medium">Priority:</span> {getPriorityLabel(selectedReview.priority)}</div>
                                    <div><span className="font-medium">Confidence Level:</span> {selectedReview.confidenceLevel}%</div>
                                    <div><span className="font-medium">Risk Assessment:</span> {selectedReview.riskAssessment}</div>
                                    {selectedReview.coaStatus && (
                                      <div><span className="font-medium">COA Status:</span> {selectedReview.coaStatus}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            {/* Images Tab */}
                            <TabsContent value="images" className="space-y-4">
                              <div className="grid md:grid-cols-3 gap-4">
                                {selectedReview.submission?.images?.length ? (
                                  selectedReview.submission.images.map((image, index) => (
                                    <div key={index} className="relative">
                                      <img 
                                        src={image} 
                                        alt={`Asset image ${index + 1}`}
                                        className="w-full h-48 object-cover rounded-lg border"
                                      />
                                      <Button size="sm" variant="secondary" className="absolute top-2 right-2">
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))
                                ) : (
                                  <div className="col-span-3 text-center py-8">
                                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500">No images available</p>
                                  </div>
                                )}
                              </div>
                            </TabsContent>

                            {/* Documents Tab */}
                            <TabsContent value="documents" className="space-y-4">
                              <div className="space-y-3">
                                {selectedReview.submission?.documentIds?.length ? (
                                  selectedReview.submission.documentIds.map((docId, index) => (
                                    <div key={docId} className="flex items-center justify-between p-3 border rounded">
                                      <div className="flex items-center space-x-3">
                                        <FileText className="h-5 w-5 text-gray-600" />
                                        <span>Document {index + 1}</span>
                                      </div>
                                      <Button size="sm" variant="outline">
                                        <Eye className="h-4 w-4 mr-2" />
                                        View
                                      </Button>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-8">
                                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500">No documents available</p>
                                  </div>
                                )}
                              </div>
                            </TabsContent>

                            {/* Review Decision Tab */}
                            <TabsContent value="review" className="space-y-6">
                              <Form {...reviewForm}>
                                <form className="space-y-4">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <FormField
                                      control={reviewForm.control}
                                      name="adjustedValue"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Adjusted Value (USD)</FormLabel>
                                          <FormControl>
                                            <Input 
                                              type="number" 
                                              placeholder="Enter adjusted value" 
                                              {...field} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={reviewForm.control}
                                      name="confidenceLevel"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Confidence Level (%)</FormLabel>
                                          <FormControl>
                                            <Input 
                                              type="number" 
                                              min="0" 
                                              max="100" 
                                              {...field} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  <FormField
                                    control={reviewForm.control}
                                    name="reviewNotes"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Review Notes</FormLabel>
                                        <FormControl>
                                          <Textarea 
                                            placeholder="Enter detailed review notes..." 
                                            className="min-h-[100px]"
                                            {...field} 
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <div className="flex gap-4 pt-4 border-t">
                                    <Button 
                                      type="button"
                                      onClick={() => {
                                        const formData = reviewForm.getValues();
                                        handleApproveAsset(formData);
                                      }}
                                      className="flex-1"
                                      data-testid={`approve-asset-${selectedReview.id}`}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve Asset
                                    </Button>
                                    <Button 
                                      type="button"
                                      variant="destructive"
                                      onClick={() => {
                                        const notes = reviewForm.getValues().reviewNotes;
                                        if (notes) {
                                          handleRejectAsset(notes);
                                        } else {
                                          toast({
                                            title: "Review Notes Required",
                                            description: "Please provide review notes for rejection.",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                      className="flex-1"
                                      data-testid={`reject-asset-${selectedReview.id}`}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject Asset
                                    </Button>
                                  </div>
                                </form>
                              </Form>
                            </TabsContent>
                          </Tabs>
                        )}
                      </DialogContent>
                    </Dialog>

                    {review.status === 'pending' && (
                      <Button 
                        size="sm"
                        onClick={() => handleAssignReview(review.id)}
                        data-testid={`assign-review-${review.id}`}
                      >
                        Assign to Me
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}