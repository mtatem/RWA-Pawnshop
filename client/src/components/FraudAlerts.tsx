import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  AlertTriangle, 
  Shield, 
  Eye, 
  User, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Filter,
  Search,
  MoreHorizontal,
  Flag,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface FraudAlert {
  id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  targetType: string;
  targetId: string;
  userId?: string;
  riskScore: string;
  alertData: any;
  detectionMethod: string;
  modelVersion?: string;
  evidence?: any;
  falsePositiveRisk: string;
  assignedTo?: string;
  investigationNotes?: string;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  escalated: boolean;
  escalatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface FraudAlertsData {
  alerts: FraudAlert[];
  totalCount: number;
  breakdown: {
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
}

export default function FraudAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filters and search
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  
  // Fetch fraud alerts with filters
  const { data: fraudAlertsData, isLoading, refetch } = useQuery<FraudAlertsData>({
    queryKey: ["/api/admin/alerts/fraud", { status: statusFilter, severity: severityFilter }],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create fraud alert mutation
  const createAlertMutation = useMutation({
    mutationFn: async (alertData: any) => {
      const response = await apiRequest("POST", "/api/admin/alerts/fraud", alertData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Fraud Alert Created",
        description: "New fraud alert has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts/fraud"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Alert",
        description: error.message || "An error occurred while creating the fraud alert.",
        variant: "destructive",
      });
    },
  });

  // Update fraud alert mutation
  const updateAlertMutation = useMutation({
    mutationFn: async ({ alertId, updates }: { alertId: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/alerts/fraud/${alertId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Alert Updated",
        description: "Fraud alert has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts/fraud"] });
      setSelectedAlert(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update fraud alert.",
        variant: "destructive",
      });
    },
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Flag className="h-4 w-4 text-yellow-600" />;
      case 'low': return <Flag className="h-4 w-4 text-blue-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'investigating': return <Eye className="h-4 w-4 text-blue-600" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'false_positive': return <XCircle className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case 'user': return <User className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'submission': return <FileText className="h-4 w-4" />;
      case 'transaction': return <ArrowRight className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatRiskScore = (score: string) => {
    const numScore = parseFloat(score) * 100;
    return `${numScore.toFixed(1)}%`;
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

  const handleAssignAlert = (alertId: string) => {
    updateAlertMutation.mutate({
      alertId,
      updates: { 
        status: 'investigating',
        assignedTo: 'current-admin-id' // This should be actual admin ID
      }
    });
  };

  const handleResolveAlert = (alertId: string, resolution: string) => {
    updateAlertMutation.mutate({
      alertId,
      updates: { 
        status: 'resolved',
        resolution,
        resolvedAt: new Date().toISOString()
      }
    });
  };

  const handleMarkFalsePositive = (alertId: string) => {
    updateAlertMutation.mutate({
      alertId,
      updates: { 
        status: 'false_positive',
        resolution: 'Marked as false positive after investigation'
      }
    });
  };

  const filteredAlerts = fraudAlertsData?.alerts?.filter(alert => 
    alert.alertType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.targetId.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Fraud Detection Alerts</h2>
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
    <div className="space-y-6 p-6" data-testid="fraud-alerts">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="fraud-alerts-title">
            Fraud Detection Alerts
          </h2>
          <p className="text-muted-foreground">
            Real-time fraud detection and security monitoring
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            {fraudAlertsData?.totalCount || 0} Total Alerts
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            data-testid="refresh-alerts-button"
          >
            <Shield className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alert Summary Cards */}
      {fraudAlertsData?.breakdown && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(fraudAlertsData.breakdown.bySeverity).map(([severity, count]) => (
            <Card key={severity} data-testid={`severity-card-${severity}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getSeverityIcon(severity)}
                    <span className="font-medium capitalize">{severity}</span>
                  </div>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search alerts by type or target ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-alerts-input"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="false_positive">False Positive</SelectItem>
                <SelectItem value="">All Statuses</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]" data-testid="severity-filter">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="">All Severities</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No Fraud Alerts</h3>
              <p className="text-gray-500">No fraud alerts match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <Card key={alert.id} className={`border-l-4 ${
              alert.severity === 'critical' ? 'border-l-red-500' :
              alert.severity === 'high' ? 'border-l-orange-500' :
              alert.severity === 'medium' ? 'border-l-yellow-500' :
              'border-l-blue-500'
            }`} data-testid={`alert-card-${alert.id}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {getSeverityIcon(alert.severity)}
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getStatusIcon(alert.status)}
                        {alert.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {getTargetIcon(alert.targetType)}
                        {alert.targetType.toUpperCase()}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-semibold mb-2" data-testid={`alert-title-${alert.id}`}>
                      {alert.alertType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>

                    <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Risk Score:</span>{' '}
                        <span className="text-red-600 font-bold">
                          {formatRiskScore(alert.riskScore)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Target ID:</span>{' '}
                        <span className="font-mono">{alert.targetId.slice(0, 8)}...</span>
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>{' '}
                        {formatTimeAgo(alert.createdAt)}
                      </div>
                    </div>

                    {alert.investigationNotes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-sm">Investigation Notes:</span>
                        <p className="text-sm text-gray-700 mt-1">{alert.investigationNotes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedAlert(alert)}
                          data-testid={`view-alert-${alert.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            {getSeverityIcon(alert.severity)}
                            Fraud Alert Details
                          </DialogTitle>
                          <DialogDescription>
                            Alert ID: {alert.id}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedAlert && (
                          <div className="space-y-6">
                            {/* Alert Overview */}
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Alert Type</Label>
                                <p className="text-sm">{selectedAlert.alertType.replace(/_/g, ' ')}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Detection Method</Label>
                                <p className="text-sm">{selectedAlert.detectionMethod}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Risk Score</Label>
                                <div className="flex items-center gap-2">
                                  <Progress value={parseFloat(selectedAlert.riskScore) * 100} className="flex-1" />
                                  <span className="text-sm font-bold">
                                    {formatRiskScore(selectedAlert.riskScore)}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">False Positive Risk</Label>
                                <p className="text-sm">{formatRiskScore(selectedAlert.falsePositiveRisk)}</p>
                              </div>
                            </div>

                            {/* Evidence */}
                            {selectedAlert.evidence && (
                              <div>
                                <Label className="text-sm font-medium">Evidence</Label>
                                <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto">
                                  {JSON.stringify(selectedAlert.evidence, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Alert Data */}
                            <div>
                              <Label className="text-sm font-medium">Alert Data</Label>
                              <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto">
                                {JSON.stringify(selectedAlert.alertData, null, 2)}
                              </pre>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4 border-t">
                              {selectedAlert.status === 'open' && (
                                <Button 
                                  size="sm"
                                  onClick={() => handleAssignAlert(selectedAlert.id)}
                                  data-testid={`assign-alert-${selectedAlert.id}`}
                                >
                                  Start Investigation
                                </Button>
                              )}
                              
                              {(selectedAlert.status === 'investigating' || selectedAlert.status === 'open') && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleResolveAlert(selectedAlert.id, 'Resolved after investigation')}
                                    data-testid={`resolve-alert-${selectedAlert.id}`}
                                  >
                                    Mark Resolved
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleMarkFalsePositive(selectedAlert.id)}
                                    data-testid={`false-positive-${selectedAlert.id}`}
                                  >
                                    False Positive
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {alert.status === 'open' && (
                          <DropdownMenuItem onClick={() => handleAssignAlert(alert.id)}>
                            Start Investigation
                          </DropdownMenuItem>
                        )}
                        {(alert.status === 'investigating' || alert.status === 'open') && (
                          <>
                            <DropdownMenuItem onClick={() => handleResolveAlert(alert.id, 'Resolved')}>
                              Mark Resolved
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkFalsePositive(alert.id)}>
                              Mark False Positive
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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