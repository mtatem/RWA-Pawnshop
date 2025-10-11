import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  User,
  Calendar,
  AlertCircle
} from "lucide-react";

interface FormSubmission {
  id: string;
  userId: string | null;
  formType: string;
  name: string | null;
  email: string;
  subject: string | null;
  category: string | null;
  priority: string;
  message: string;
  status: string;
  assignedTo: string | null;
  responseNotes: string | null;
  resolvedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function FormSubmissionsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch form submissions
  const { data: submissions = [], isLoading } = useQuery<FormSubmission[]>({
    queryKey: ["/api/admin/form-submissions", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" 
        ? "/api/admin/form-submissions"
        : `/api/admin/form-submissions?status=${statusFilter}`;
      const response = await apiRequest("GET", url);
      return response.json();
    },
  });

  // Update submission status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      responseNotes 
    }: { 
      id: string; 
      status: string; 
      responseNotes?: string;
    }) => {
      const response = await apiRequest("PATCH", `/api/admin/form-submissions/${id}/status`, {
        status,
        responseNotes,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Status Updated",
        description: `Form submission marked as ${variables.status}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/form-submissions"] });
      setSelectedSubmission(null);
      setResponseNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (id: string, status: string) => {
    updateStatusMutation.mutate({ 
      id, 
      status, 
      responseNotes: responseNotes || undefined 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "outline", className: "border-yellow-500 text-yellow-500" },
      in_progress: { variant: "outline", className: "border-blue-500 text-blue-500" },
      resolved: { variant: "outline", className: "border-green-500 text-green-500" },
      closed: { variant: "outline", className: "border-gray-500 text-gray-500" },
    };
    return variants[status] || variants.pending;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      low: { variant: "outline", className: "border-gray-500 text-gray-500" },
      normal: { variant: "outline", className: "border-blue-500 text-blue-500" },
      high: { variant: "outline", className: "border-orange-500 text-orange-500" },
      urgent: { variant: "outline", className: "border-red-500 text-red-500" },
    };
    return variants[priority] || variants.normal;
  };

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const inProgressCount = submissions.filter(s => s.status === 'in_progress').length;
  const resolvedCount = submissions.filter(s => s.status === 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Form Submissions</h2>
          <p className="text-muted-foreground">Manage and respond to user form submissions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-white" data-testid="total-submissions">
                {submissions.length}
              </p>
            </div>
            <Mail className="text-primary" size={24} />
          </div>
        </Card>

        <Card className="bg-card border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-500" data-testid="pending-submissions">
                {pendingCount}
              </p>
            </div>
            <Clock className="text-yellow-500" size={24} />
          </div>
        </Card>

        <Card className="bg-card border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-blue-500" data-testid="inprogress-submissions">
                {inProgressCount}
              </p>
            </div>
            <MessageSquare className="text-blue-500" size={24} />
          </div>
        </Card>

        <Card className="bg-card border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Resolved</p>
              <p className="text-2xl font-bold text-green-500" data-testid="resolved-submissions">
                {resolvedCount}
              </p>
            </div>
            <CheckCircle className="text-green-500" size={24} />
          </div>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          onClick={() => setStatusFilter("all")}
          size="sm"
          data-testid="filter-all"
        >
          All
        </Button>
        <Button
          variant={statusFilter === "pending" ? "default" : "outline"}
          onClick={() => setStatusFilter("pending")}
          size="sm"
          data-testid="filter-pending"
        >
          Pending
        </Button>
        <Button
          variant={statusFilter === "in_progress" ? "default" : "outline"}
          onClick={() => setStatusFilter("in_progress")}
          size="sm"
          data-testid="filter-inprogress"
        >
          In Progress
        </Button>
        <Button
          variant={statusFilter === "resolved" ? "default" : "outline"}
          onClick={() => setStatusFilter("resolved")}
          size="sm"
          data-testid="filter-resolved"
        >
          Resolved
        </Button>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading submissions...</p>
        </Card>
      ) : submissions.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No form submissions found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card
              key={submission.id}
              className="border border-border p-6 hover:border-primary transition-colors"
              data-testid={`submission-card-${submission.id}`}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-semibold text-white" data-testid={`submission-subject-${submission.id}`}>
                        {submission.subject || "No Subject"}
                      </h3>
                      <Badge {...getStatusBadge(submission.status)}>
                        {submission.status}
                      </Badge>
                      <Badge {...getPriorityBadge(submission.priority)}>
                        {submission.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        <span>{submission.name || "Anonymous"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail size={14} />
                        <span>{submission.email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatDate(submission.createdAt)}</span>
                      </div>
                      {submission.category && (
                        <div className="flex items-center gap-1">
                          <AlertCircle size={14} />
                          <span>{submission.category}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="bg-muted/20 rounded-lg p-4">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap" data-testid={`submission-message-${submission.id}`}>
                    {submission.message}
                  </p>
                </div>

                {/* Response Section */}
                {selectedSubmission === submission.id ? (
                  <div className="space-y-3 border-t border-border pt-4">
                    <Textarea
                      placeholder="Add response notes..."
                      value={responseNotes}
                      onChange={(e) => setResponseNotes(e.target.value)}
                      className="min-h-[100px]"
                      data-testid={`response-notes-${submission.id}`}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={() => handleStatusUpdate(submission.id, "in_progress")}
                        variant="outline"
                        size="sm"
                        data-testid={`button-inprogress-${submission.id}`}
                      >
                        Mark In Progress
                      </Button>
                      <Button
                        onClick={() => handleStatusUpdate(submission.id, "resolved")}
                        variant="default"
                        size="sm"
                        data-testid={`button-resolve-${submission.id}`}
                      >
                        Mark Resolved
                      </Button>
                      <Button
                        onClick={() => handleStatusUpdate(submission.id, "closed")}
                        variant="outline"
                        size="sm"
                        data-testid={`button-close-${submission.id}`}
                      >
                        Close
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedSubmission(null);
                          setResponseNotes("");
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 border-t border-border pt-4">
                    {submission.status === "pending" && (
                      <Button
                        onClick={() => setSelectedSubmission(submission.id)}
                        variant="outline"
                        size="sm"
                        data-testid={`button-respond-${submission.id}`}
                      >
                        Respond
                      </Button>
                    )}
                    {submission.responseNotes && (
                      <div className="flex-1 text-sm text-muted-foreground">
                        <span className="font-medium">Response: </span>
                        {submission.responseNotes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
