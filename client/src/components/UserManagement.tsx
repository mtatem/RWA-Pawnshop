import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Users, 
  User, 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Flag,
  Search,
  Filter,
  MoreHorizontal,
  Lock,
  Unlock,
  Eye,
  Mail,
  Phone,
  MapPin,
  Wallet,
  History,
  Ban,
  UserCheck,
  AlertCircle,
  Fingerprint,
  Key
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
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { adminApiRequest, getAdminQueryFn } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";

interface UserAccount {
  id: string;
  principalId: string;
  username?: string;
  email?: string;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycStatus: 'not_started' | 'in_progress' | 'completed' | 'failed';
  accountStatus: 'active' | 'suspended' | 'restricted' | 'banned';
  walletBindings: WalletBinding[];
  flags: UserFlag[];
  lastActivity: string;
  registrationDate: string;
  totalTransactions: number;
  totalVolume: string;
  riskScore: string;
  ipAddresses: string[];
  deviceFingerprints: string[];
}

interface WalletBinding {
  id: string;
  walletType: 'icp' | 'ethereum';
  walletAddress: string;
  bindingStatus: 'pending' | 'verified' | 'revoked';
  verificationMethod: string;
  bindingDate: string;
}

interface UserFlag {
  id: string;
  userId: string;
  flagType: 'fraud_suspicion' | 'document_issues' | 'kyc_failure' | 'suspicious_activity' | 'compliance_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'investigating' | 'resolved' | 'dismissed';
  flagReason: string;
  flaggedBy: string;
  flaggedAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  investigationNotes?: string;
}

interface UserManagementData {
  users: UserAccount[];
  totalCount: number;
  flaggedCount: number;
  breakdown: {
    byVerificationStatus: Record<string, number>;
    byAccountStatus: Record<string, number>;
    byRiskLevel: Record<string, number>;
  };
}

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filters and selection
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [flagFilter, setFlagFilter] = useState<string>('flagged');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);

  // Form for user flagging
  const flagForm = useForm({
    defaultValues: {
      flagType: '',
      severity: 'medium',
      flagReason: '',
      investigationNotes: '',
      notifyUser: false
    }
  });

  // Form for user restrictions
  const restrictForm = useForm({
    defaultValues: {
      restrictionType: '',
      duration: '',
      reason: '',
      affectedFeatures: [] as string[]
    }
  });

  // Fetch user management data
  const { data: userManagementData, isLoading, refetch } = useQuery<UserManagementData>({
    queryKey: ["/api/admin/users/flagged", { 
      status: statusFilter === 'all' ? '' : statusFilter, 
      verification: verificationFilter === 'all' ? '' : verificationFilter, 
      flagged: flagFilter === 'all' ? '' : flagFilter 
    }],
    queryFn: getAdminQueryFn({ on401: "throw" }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Flag user mutation
  const flagUserMutation = useMutation({
    mutationFn: async ({ userId, flagData }: { userId: string; flagData: any }) => {
      const response = await adminApiRequest("POST", `/api/admin/users/${userId}/flag`, flagData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Flagged",
        description: "User has been flagged successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/flagged"] });
      setIsFlagDialogOpen(false);
      flagForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Flag User",
        description: error.message || "An error occurred while flagging the user.",
        variant: "destructive",
      });
    },
  });

  // Update user flag mutation
  const updateFlagMutation = useMutation({
    mutationFn: async ({ flagId, updates }: { flagId: string; updates: any }) => {
      const response = await adminApiRequest("PATCH", `/api/admin/users/flags/${flagId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Flag Updated",
        description: "User flag has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/flagged"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user flag.",
        variant: "destructive",
      });
    },
  });

  // Restrict user mutation
  const restrictUserMutation = useMutation({
    mutationFn: async ({ userId, restrictions }: { userId: string; restrictions: any }) => {
      const response = await adminApiRequest("POST", `/api/admin/users/${userId}/restrict`, restrictions);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Restricted",
        description: "User restrictions have been applied successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/flagged"] });
    },
    onError: (error: any) => {
      toast({
        title: "Restriction Failed",
        description: error.message || "Failed to apply user restrictions.",
        variant: "destructive",
      });
    },
  });

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'suspended': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'restricted': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'banned': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFlagSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskScoreColor = (score: string) => {
    const numScore = parseFloat(score);
    if (numScore >= 0.8) return 'text-red-600';
    if (numScore >= 0.6) return 'text-orange-600';
    if (numScore >= 0.4) return 'text-yellow-600';
    return 'text-green-600';
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

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
    }).format(parseFloat(amount));
  };

  const handleFlagUser = (data: any) => {
    if (!selectedUser) return;
    
    flagUserMutation.mutate({
      userId: selectedUser.id,
      flagData: {
        flagType: data.flagType,
        severity: data.severity,
        flagReason: data.flagReason,
        investigationNotes: data.investigationNotes,
        notifyUser: data.notifyUser
      }
    });
  };

  const handleResolveFlag = (flagId: string, resolution: string) => {
    updateFlagMutation.mutate({
      flagId,
      updates: { 
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
        investigationNotes: resolution
      }
    });
  };

  const handleRestrictUser = (data: any) => {
    if (!selectedUser) return;
    
    restrictUserMutation.mutate({
      userId: selectedUser.id,
      restrictions: data
    });
  };

  const filteredUsers = userManagementData?.users?.filter(user => {
    const matchesSearch = !searchTerm || 
      user.principalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
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
    <div className="space-y-6 p-6" data-testid="user-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="user-management-title">
            User Management
          </h2>
          <p className="text-muted-foreground">
            Advanced user account oversight and management
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center gap-2">
            <Users className="h-3 w-3" />
            {userManagementData?.totalCount || 0} Total Users
          </Badge>
          <Badge variant="destructive" className="flex items-center gap-2">
            <Flag className="h-3 w-3" />
            {userManagementData?.flaggedCount || 0} Flagged
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            data-testid="refresh-users-button"
          >
            <Users className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {userManagementData?.breakdown?.byAccountStatus && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(userManagementData.breakdown.byAccountStatus).map(([status, count]) => (
            <Card key={status} data-testid={`status-card-${status}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
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
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by Principal ID, username, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-users-input"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="status-filter">
                <SelectValue placeholder="Account status" />
              </SelectTrigger>
              <SelectContent className="bg-background dark:bg-black border-border dark:border-gray-800">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
              </SelectContent>
            </Select>

            <Select value={verificationFilter} onValueChange={setVerificationFilter}>
              <SelectTrigger className="w-[180px]" data-testid="verification-filter">
                <SelectValue placeholder="Verification status" />
              </SelectTrigger>
              <SelectContent className="bg-background dark:bg-black border-border dark:border-gray-800">
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
              </SelectContent>
            </Select>

            <Select value={flagFilter} onValueChange={setFlagFilter}>
              <SelectTrigger className="w-[180px]" data-testid="flag-filter">
                <SelectValue placeholder="Flag status" />
              </SelectTrigger>
              <SelectContent className="bg-background dark:bg-black border-border dark:border-gray-800">
                <SelectItem value="flagged">Flagged Users</SelectItem>
                <SelectItem value="unflagged">Clean Users</SelectItem>
                <SelectItem value="all">All Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No Users Found</h3>
              <p className="text-gray-500">No users match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className={`border-l-4 ${
              user.flags?.length > 0 && user.flags.some(f => f.status === 'active') ? 'border-l-red-500' :
              user.accountStatus === 'suspended' ? 'border-l-yellow-500' :
              user.accountStatus === 'restricted' ? 'border-l-orange-500' :
              user.accountStatus === 'banned' ? 'border-l-red-500' :
              'border-l-green-500'
            }`} data-testid={`user-card-${user.id}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {getVerificationIcon(user.verificationStatus)}
                      <Badge className={getAccountStatusColor(user.accountStatus)}>
                        {user.accountStatus.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        KYC: {user.kycStatus.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {user.flags?.some(f => f.status === 'active') && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <Flag className="h-3 w-3" />
                          FLAGGED
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold mb-2" data-testid={`user-title-${user.id}`}>
                      {user.username || 'Anonymous User'}
                    </h3>

                    <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-4">
                      <div>
                        <span className="font-medium">Principal ID:</span>{' '}
                        <span className="font-mono">{user.principalId.slice(0, 12)}...</span>
                      </div>
                      <div>
                        <span className="font-medium">Risk Score:</span>{' '}
                        <span className={`font-bold ${getRiskScoreColor(user.riskScore)}`}>
                          {(parseFloat(user.riskScore) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Last Activity:</span>{' '}
                        {formatTimeAgo(user.lastActivity)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Wallet className="h-4 w-4" />
                        <span>{user.walletBindings?.length || 0} wallets</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <History className="h-4 w-4" />
                        <span>{user.totalTransactions} transactions</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>{formatCurrency(user.totalVolume)} volume</span>
                      </div>
                    </div>

                    {user.flags?.some(f => f.status === 'active') && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-800">Active Flags</span>
                        </div>
                        {user.flags.filter(f => f.status === 'active').map((flag) => (
                          <div key={flag.id} className="text-sm">
                            <Badge className={getFlagSeverityColor(flag.severity)}>
                              {flag.severity.toUpperCase()}
                            </Badge>
                            <span className="ml-2 text-red-700">{flag.flagReason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Dialog open={isUserDetailOpen} onOpenChange={setIsUserDetailOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                          data-testid={`view-user-${user.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            User Details: {selectedUser?.username || 'Anonymous'}
                          </DialogTitle>
                          <DialogDescription>
                            Principal ID: {selectedUser?.principalId}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedUser && (
                          <Tabs defaultValue="overview" className="space-y-6">
                            <TabsList className="grid w-full grid-cols-5">
                              <TabsTrigger value="overview">Overview</TabsTrigger>
                              <TabsTrigger value="wallets">Wallets</TabsTrigger>
                              <TabsTrigger value="flags">Flags</TabsTrigger>
                              <TabsTrigger value="security">Security</TabsTrigger>
                              <TabsTrigger value="actions">Actions</TabsTrigger>
                            </TabsList>

                            {/* Overview Tab */}
                            <TabsContent value="overview" className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                  <Label className="text-sm font-medium">Account Information</Label>
                                  <div className="space-y-2 mt-2">
                                    <div><span className="font-medium">Username:</span> {selectedUser.username || 'N/A'}</div>
                                    <div><span className="font-medium">Email:</span> {selectedUser.email || 'N/A'}</div>
                                    <div><span className="font-medium">Registration:</span> {new Date(selectedUser.registrationDate).toLocaleDateString()}</div>
                                    <div><span className="font-medium">Verification Status:</span> {selectedUser.verificationStatus}</div>
                                    <div><span className="font-medium">KYC Status:</span> {selectedUser.kycStatus}</div>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Activity & Risk</Label>
                                  <div className="space-y-2 mt-2">
                                    <div><span className="font-medium">Account Status:</span> {selectedUser.accountStatus}</div>
                                    <div><span className="font-medium">Total Transactions:</span> {selectedUser.totalTransactions}</div>
                                    <div><span className="font-medium">Total Volume:</span> {formatCurrency(selectedUser.totalVolume)}</div>
                                    <div><span className="font-medium">Risk Score:</span> <span className={getRiskScoreColor(selectedUser.riskScore)}>{(parseFloat(selectedUser.riskScore) * 100).toFixed(1)}%</span></div>
                                    <div><span className="font-medium">Last Activity:</span> {formatTimeAgo(selectedUser.lastActivity)}</div>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            {/* Wallets Tab */}
                            <TabsContent value="wallets" className="space-y-4">
                              <div className="space-y-3">
                                {selectedUser.walletBindings?.length ? (
                                  selectedUser.walletBindings.map((wallet) => (
                                    <div key={wallet.id} className="flex items-center justify-between p-3 border rounded">
                                      <div className="flex items-center space-x-3">
                                        <Wallet className="h-5 w-5 text-gray-600" />
                                        <div>
                                          <div className="font-medium">{wallet.walletType.toUpperCase()}</div>
                                          <div className="text-sm text-gray-600 font-mono">
                                            {wallet.walletAddress.slice(0, 20)}...
                                          </div>
                                        </div>
                                      </div>
                                      <Badge className={wallet.bindingStatus === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                        {wallet.bindingStatus.toUpperCase()}
                                      </Badge>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-8">
                                    <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500">No wallet bindings</p>
                                  </div>
                                )}
                              </div>
                            </TabsContent>

                            {/* Flags Tab */}
                            <TabsContent value="flags" className="space-y-4">
                              <div className="space-y-3">
                                {selectedUser.flags?.length ? (
                                  selectedUser.flags.map((flag) => (
                                    <div key={flag.id} className="p-4 border rounded">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                          <Badge className={getFlagSeverityColor(flag.severity)}>
                                            {flag.severity.toUpperCase()}
                                          </Badge>
                                          <Badge variant="outline">
                                            {flag.status.toUpperCase()}
                                          </Badge>
                                        </div>
                                        <span className="text-sm text-gray-500">
                                          {formatTimeAgo(flag.flaggedAt)}
                                        </span>
                                      </div>
                                      <div className="text-sm">
                                        <div className="font-medium">{flag.flagType.replace('_', ' ')}</div>
                                        <div className="text-gray-600 mt-1">{flag.flagReason}</div>
                                        {flag.investigationNotes && (
                                          <div className="mt-2 p-2 bg-gray-50 rounded">
                                            <span className="font-medium">Notes:</span> {flag.investigationNotes}
                                          </div>
                                        )}
                                      </div>
                                      {flag.status === 'active' && (
                                        <div className="flex gap-2 mt-3">
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => handleResolveFlag(flag.id, 'Resolved after investigation')}
                                          >
                                            Resolve Flag
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-8">
                                    <Flag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500">No flags on this account</p>
                                  </div>
                                )}
                              </div>
                            </TabsContent>

                            {/* Security Tab */}
                            <TabsContent value="security" className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                  <Label className="text-sm font-medium">IP Addresses</Label>
                                  <div className="space-y-1 mt-2">
                                    {selectedUser.ipAddresses?.length ? (
                                      selectedUser.ipAddresses.map((ip, index) => (
                                        <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                                          {ip}
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm text-gray-500">No IP addresses recorded</p>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Device Fingerprints</Label>
                                  <div className="space-y-1 mt-2">
                                    {selectedUser.deviceFingerprints?.length ? (
                                      selectedUser.deviceFingerprints.map((fingerprint, index) => (
                                        <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                                          {fingerprint.slice(0, 20)}...
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm text-gray-500">No device fingerprints recorded</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            {/* Actions Tab */}
                            <TabsContent value="actions" className="space-y-6">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                  <Label className="text-sm font-medium">Flag User</Label>
                                  <Dialog open={isFlagDialogOpen} onOpenChange={setIsFlagDialogOpen}>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" className="w-full mt-2">
                                        <Flag className="h-4 w-4 mr-2" />
                                        Add Flag
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Flag User Account</DialogTitle>
                                        <DialogDescription>
                                          Add a flag to this user account for investigation.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <Form {...flagForm}>
                                        <form onSubmit={flagForm.handleSubmit(handleFlagUser)} className="space-y-4">
                                          <FormField
                                            control={flagForm.control}
                                            name="flagType"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Flag Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                  <FormControl>
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select flag type" />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent className="bg-background dark:bg-black border-border dark:border-gray-800">
                                                    <SelectItem value="fraud_suspicion">Fraud Suspicion</SelectItem>
                                                    <SelectItem value="document_issues">Document Issues</SelectItem>
                                                    <SelectItem value="kyc_failure">KYC Failure</SelectItem>
                                                    <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                                                    <SelectItem value="compliance_violation">Compliance Violation</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />

                                          <FormField
                                            control={flagForm.control}
                                            name="severity"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Severity</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                  <FormControl>
                                                    <SelectTrigger>
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent className="bg-background dark:bg-black border-border dark:border-gray-800">
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                    <SelectItem value="critical">Critical</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />

                                          <FormField
                                            control={flagForm.control}
                                            name="flagReason"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Reason</FormLabel>
                                                <FormControl>
                                                  <Textarea 
                                                    placeholder="Describe the reason for flagging..." 
                                                    {...field} 
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />

                                          <div className="flex gap-2">
                                            <Button type="submit" className="flex-1">
                                              Flag User
                                            </Button>
                                            <Button 
                                              type="button" 
                                              variant="outline" 
                                              onClick={() => setIsFlagDialogOpen(false)}
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </form>
                                      </Form>
                                    </DialogContent>
                                  </Dialog>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Account Actions</Label>
                                  <div className="space-y-2 mt-2">
                                    {selectedUser.accountStatus === 'active' && (
                                      <>
                                        <Button variant="outline" className="w-full" size="sm">
                                          <Lock className="h-4 w-4 mr-2" />
                                          Suspend Account
                                        </Button>
                                        <Button variant="outline" className="w-full" size="sm">
                                          <Ban className="h-4 w-4 mr-2" />
                                          Restrict Account
                                        </Button>
                                      </>
                                    )}
                                    {selectedUser.accountStatus !== 'active' && (
                                      <Button variant="outline" className="w-full" size="sm">
                                        <Unlock className="h-4 w-4 mr-2" />
                                        Restore Account
                                      </Button>
                                    )}
                                    <Button variant="outline" className="w-full" size="sm">
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Force KYC Review
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                          </Tabs>
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
                        <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                          View Full Profile
                        </DropdownMenuItem>
                        {user.accountStatus === 'active' && (
                          <>
                            <DropdownMenuItem>Suspend Account</DropdownMenuItem>
                            <DropdownMenuItem>Restrict Features</DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem>Contact User</DropdownMenuItem>
                        <DropdownMenuItem>View Transaction History</DropdownMenuItem>
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