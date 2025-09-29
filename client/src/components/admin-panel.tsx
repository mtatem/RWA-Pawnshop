import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, HandHeart, TriangleAlert, TrendingUp, Gavel, Eye, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

interface AdminStats {
  pendingApprovals: number;
  activeLoans: number;
  expiringSoon: number;
  totalRevenue: string;
}

interface PendingSubmission {
  id: string;
  assetName: string;
  category: string;
  estimatedValue: string;
  walletAddress: string;
  userId: string;
  createdAt: string;
}

export default function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/dashboard/kpis");
      return response.json();
    },
    initialData: {
      pendingApprovals: 2,
      activeLoans: 157,
      expiringSoon: 8,
      totalRevenue: "48300",
    } as AdminStats,
  });

  // Fetch real pending submissions from API
  const { data: pendingSubmissions = [], isLoading, error } = useQuery({
    queryKey: ["/api/rwa-submissions/pending"],
    queryFn: async () => {
      console.log("AdminPanel: Fetching pending submissions...");
      const response = await apiRequest("GET", "/api/rwa-submissions/pending");
      const data = await response.json();
      console.log("AdminPanel: Received pending submissions:", data);
      return data;
    },
  });
  
  // Debug logging
  console.log("AdminPanel rendered:", {
    pendingSubmissions,
    isLoading,
    error,
    user: user?.email
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const response = await apiRequest("PATCH", `/api/rwa-submissions/${id}/status`, {
        status,
        adminNotes,
        reviewedBy: user?.id || "unknown-admin",
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.status === "approved" ? "Submission Approved" : "Submission Rejected",
        description: variables.status === "approved" 
          ? "The RWA submission has been approved and loan has been created."
          : "The RWA submission has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rwa-submissions/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (submissionId: string) => {
    approvalMutation.mutate({ id: submissionId, status: "approved" });
  };

  const handleReject = (submissionId: string, reason?: string) => {
    approvalMutation.mutate({ 
      id: submissionId, 
      status: "rejected", 
      adminNotes: reason || "Submission does not meet requirements" 
    });
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
    return `${diffInHours} hours ago`;
  };

  return (
    <section className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 text-white">Admin Dashboard</h2>
          <p className="text-sm sm:text-base text-muted-foreground px-4 sm:px-0">Manage RWA submissions and platform operations</p>
        </div>

        {/* Admin Stats - Mobile Optimized */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-card border border-border p-4 sm:p-6 glass-effect hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Pending Approvals</p>
                <p className="text-lg sm:text-2xl font-bold text-primary" data-testid="stat-pending-approvals">
                  {stats?.pendingApprovals || 0}
                </p>
              </div>
              <Clock className="text-lg sm:text-2xl text-primary" />
            </div>
          </Card>

          <Card className="bg-card border border-border p-4 sm:p-6 glass-effect hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Active Loans</p>
                <p className="text-lg sm:text-2xl font-bold text-secondary" data-testid="stat-active-loans">
                  {stats?.activeLoans || 0}
                </p>
              </div>
              <HandHeart className="text-lg sm:text-2xl text-secondary" />
            </div>
          </Card>

          <Card className="bg-card border border-border p-4 sm:p-6 glass-effect hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-lg sm:text-2xl font-bold text-destructive" data-testid="stat-expiring-soon">
                  {stats?.expiringSoon || 0}
                </p>
              </div>
              <TriangleAlert className="text-lg sm:text-2xl text-destructive" />
            </div>
          </Card>

          <Card className="bg-card border border-border p-4 sm:p-6 glass-effect hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-accent" data-testid="stat-total-revenue">
                  {formatCurrency(stats?.totalRevenue || "0")}
                </p>
              </div>
              <TrendingUp className="text-2xl text-accent" />
            </div>
          </Card>
        </div>

        {/* Pending Approvals */}
        <Card className="bg-card border border-border p-8 glass-effect">
          <h3 className="text-xl font-semibold mb-6 flex items-center">
            <Gavel className="mr-3 text-primary" />
            Pending RWA Approvals
          </h3>

          {pendingSubmissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No pending submissions to review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSubmissions.map((submission: any) => {
                const maxLoan = (parseFloat(submission.estimatedValue) * 0.7).toFixed(2);
                
                return (
                  <Card
                    key={submission.id}
                    className="border border-border p-6 hover:border-primary transition-colors"
                    data-testid={`submission-card-${submission.id}`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      <div>
                        <h4 className="font-medium mb-2" data-testid={`submission-name-${submission.id}`}>
                          {submission.assetName}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-1">{submission.category}</p>
                        <p className="text-sm text-muted-foreground">
                          Submitted: {formatTimeAgo(submission.createdAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Value</p>
                        <p className="font-medium" data-testid={`submission-value-${submission.id}`}>
                          {formatCurrency(submission.estimatedValue)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Max Loan: <span className="font-medium">{formatCurrency(maxLoan)}</span>
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Submitter</p>
                        <p className="font-mono text-xs" data-testid={`submission-wallet-${submission.id}`}>
                          {submission.walletAddress}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Fee Paid: <span className="text-primary">5 ICP</span>
                        </p>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-muted hover:bg-muted/80"
                          data-testid={`button-review-${submission.id}`}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Review Details
                        </Button>
                        
                        <Button
                          onClick={() => handleApprove(submission.id)}
                          disabled={approvalMutation.isPending}
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          data-testid={`button-approve-${submission.id}`}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        
                        <Button
                          onClick={() => handleReject(submission.id)}
                          disabled={approvalMutation.isPending}
                          variant="destructive"
                          size="sm"
                          data-testid={`button-reject-${submission.id}`}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
