import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
  Key,
  Trash2
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
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface UserAccount {
  id: string;
  principalId: string | null;
  username?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role: 'registered' | 'registered_kyc' | 'manager' | 'administrator';
  isAdmin: boolean;
  accountStatus: 'active' | 'suspended' | 'restricted' | 'banned';
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycStatus: 'not_started' | 'in_progress' | 'completed' | 'failed';
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
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
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    flaggedUsers: number;
  };
}

interface UserDetailsData {
  user: UserAccount;
  kycInfo: any;
  walletBindings: WalletBinding[];
  rwaSubmissions: any[];
  pawnLoans: any[];
  transactions: any[];
  flags: UserFlag[];
  activityLog: any[];
}

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  
  // State for filters and selection
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserDetailsData | null>(null);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isRoleChangeOpen, setIsRoleChangeOpen] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditKycOpen, setIsEditKycOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [kycStatus, setKycStatus] = useState('');
  const [kycReviewNotes, setKycReviewNotes] = useState('');
  const [kycRejectionReason, setKycRejectionReason] = useState('');

  // Initialize KYC form when dialog opens
  useEffect(() => {
    if (isEditKycOpen && userDetailsData?.kycInfo) {
      setKycStatus(userDetailsData.kycInfo.status || '');
      setKycReviewNotes(userDetailsData.kycInfo.reviewNotes || '');
      setKycRejectionReason(userDetailsData.kycInfo.rejectionReason || '');
    }
  }, [isEditKycOpen, userDetailsData]);

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

  // Form for role changes
  const roleChangeForm = useForm({
    defaultValues: {
      newRole: '',
      reason: ''
    }
  });

  // Password reset form schema
  const passwordResetSchema = z.object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
    reason: z.string().min(1, "Reason is required"),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

  // Form for password reset
  const passwordResetForm = useForm({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
      reason: ''
    }
  });

  // Fetch user management data
  const { data: userManagementData, isLoading, refetch } = useQuery<UserManagementData>({
    queryKey: ["/api/admin/users", currentPage, searchTerm, statusFilter, verificationFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(verificationFilter !== 'all' && { verification: verificationFilter })
      });
      const response = await fetch(`/api/admin/users?${params}`);
      if (response.status === 401) throw new Error('Unauthorized');
      if (!response.ok) throw new Error('Failed to fetch users');
      const result = await response.json();
      return result.data; // Extract the data property
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch user details when a user is selected
  const { data: userDetailsData, isLoading: userDetailsLoading } = useQuery<UserDetailsData>({
    queryKey: [`/api/admin/users/${selectedUser?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!selectedUser?.id,
  });

  // Flag user mutation
  const flagUserMutation = useMutation({
    mutationFn: async ({ userId, flagData }: { userId: string; flagData: any }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/flag`, flagData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Flagged",
        description: "User has been flagged successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
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
      const response = await apiRequest("PATCH", `/api/admin/users/flags/${flagId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Flag Updated",
        description: "User flag has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
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
      const response = await apiRequest("POST", `/api/admin/users/${userId}/restrict`, restrictions);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Restricted",
        description: "User restrictions have been applied successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Restriction Failed",
        description: error.message || "Failed to apply user restrictions.",
        variant: "destructive",
      });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/admin/users", userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "User has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsCreateUserOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create User",
        description: error.message || "An error occurred while creating the user.",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "User has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsEditUserOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update User",
        description: error.message || "An error occurred while updating the user.",
        variant: "destructive",
      });
    },
  });

  // Change user role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole, reason }: { userId: string; newRole: string; reason: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role: newRole, reason });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Role Changed",
        description: "User role has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsRoleChangeOpen(false);
      roleChangeForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Change Role",
        description: error.message || "An error occurred while changing the user's role.",
        variant: "destructive",
      });
    },
  });

  // Password reset mutation
  const passwordResetMutation = useMutation({
    mutationFn: async ({ userId, newPassword, reason }: { userId: string; newPassword: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/reset-password`, { newPassword, reason });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Reset",
        description: "User password has been reset successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsPasswordResetOpen(false);
      passwordResetForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Reset Password",
        description: error.message || "An error occurred while resetting the user password.",
        variant: "destructive",
      });
    }
  });

  // Delete user mutation (Administrator only)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "User has been permanently deleted from the system.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDeleteConfirmOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      // Handle specific error cases
      if (error.code === 'DELETE_BLOCKED_BY_DEPENDENCIES') {
        const dependencyList = error.dependencies
          ?.map((dep: any) => dep.description)
          .join(', ') || 'existing records';
        
        toast({
          title: "Cannot Delete User",
          description: `User cannot be deleted because they have ${dependencyList}. Please resolve these dependencies first.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to Delete User", 
          description: error.message || "An error occurred while deleting the user.",
          variant: "destructive",
        });
      }
    },
  });

  // Update KYC status mutation
  const updateKycMutation = useMutation({
    mutationFn: async ({ kycId, status, reviewNotes, rejectionReason }: { 
      kycId: string; 
      status: string; 
      reviewNotes: string;
      rejectionReason?: string;
    }) => {
      const response = await apiRequest("PATCH", `/api/admin/kyc/${kycId}/review`, {
        status: status === 'approved' ? 'completed' : status,
        reviewNotes,
        rejectionReason
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "KYC Status Updated",
        description: "KYC status has been updated successfully.",
      });
      // Invalidate both the user details and the main user list
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${selectedUser?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsEditKycOpen(false);
      // Reset KYC form state
      setKycStatus('');
      setKycReviewNotes('');
      setKycRejectionReason('');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update KYC",
        description: error.message || "An error occurred while updating KYC status.",
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

  const getRoleDisplay = (role: string) => {
    // Use role field as the sole source of truth
    switch (role) {
      case 'administrator':
        return { text: 'ADMINISTRATOR', variant: 'default' as const };
      case 'manager':
        return { text: 'MANAGER', variant: 'default' as const };
      case 'registered_kyc':
        return { text: 'VERIFIED USER', variant: 'secondary' as const };
      case 'registered':
        return { text: 'USER', variant: 'outline' as const };
      default:
        return { text: 'USER', variant: 'outline' as const };
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'registered_kyc':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'registered':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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

  const handleChangeRole = (data: any) => {
    if (!selectedUser) return;
    
    changeRoleMutation.mutate({
      userId: selectedUser.id,
      newRole: data.newRole,
      reason: data.reason
    });
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteUserMutation.mutate(selectedUser.id);
  };

  const filteredUsers = userManagementData?.users || [];

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
            {userManagementData?.stats?.totalUsers || 0} Total Users
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3" />
            {userManagementData?.stats?.activeUsers || 0} Active
          </Badge>
          <Badge variant="destructive" className="flex items-center gap-2">
            <Flag className="h-3 w-3" />
            {userManagementData?.stats?.flaggedUsers || 0} Flagged
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
          <Button 
            size="sm" 
            onClick={() => setIsCreateUserOpen(true)}
            data-testid="create-user-button"
          >
            <User className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {userManagementData?.stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="stats-card-total">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Total Users</span>
                </div>
                <span className="text-2xl font-bold">{userManagementData.stats.totalUsers}</span>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stats-card-active">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Active Users</span>
                </div>
                <span className="text-2xl font-bold">{userManagementData.stats.activeUsers}</span>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stats-card-verified">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Verified Users</span>
                </div>
                <span className="text-2xl font-bold">{userManagementData.stats.verifiedUsers}</span>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stats-card-flagged">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Flag className="h-4 w-4 text-red-500" />
                  <span className="font-medium">Flagged Users</span>
                </div>
                <span className="text-2xl font-bold">{userManagementData.stats.flaggedUsers}</span>
              </div>
            </CardContent>
          </Card>
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
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleDisplay(user.role).text}
                      </Badge>
                      {!user.emailVerified && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          UNVERIFIED EMAIL
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold mb-2" data-testid={`user-title-${user.id}`}>
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.username || user.email || 'Anonymous User'
                      }
                    </h3>

                    <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-4">
                      <div>
                        <span className="font-medium">Principal ID:</span>{' '}
                        <span className="font-mono">
                          {user.principalId ? user.principalId.slice(0, 12) + '...' : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Email:</span>{' '}
                        <span className="break-all">{user.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Last Login:</span>{' '}
                        {user.lastLoginAt ? formatTimeAgo(user.lastLoginAt) : 'Never'}
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>Joined {formatTimeAgo(user.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className={`h-4 w-4 ${user.emailVerified ? 'text-green-500' : 'text-red-500'}`} />
                        <span>{user.emailVerified ? 'Email Verified' : 'Email Not Verified'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Shield className={`h-4 w-4 ${user.isActive ? 'text-green-500' : 'text-red-500'}`} />
                        <span>{user.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
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
                              <TabsTrigger value="kyc">KYC Info</TabsTrigger>
                              <TabsTrigger value="assets">Submitted Assets</TabsTrigger>
                              <TabsTrigger value="history">History</TabsTrigger>
                              <TabsTrigger value="actions">Actions</TabsTrigger>
                            </TabsList>

                            {/* Overview Tab */}
                            <TabsContent value="overview" className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                  <Label className="text-sm font-medium">Account Information</Label>
                                  <div className="space-y-2 mt-2">
                                    <div><span className="font-medium">Full Name:</span> {selectedUser.firstName && selectedUser.lastName ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'N/A'}</div>
                                    <div><span className="font-medium">Username:</span> {selectedUser.username || 'N/A'}</div>
                                    <div><span className="font-medium">Email:</span> {selectedUser.email || 'N/A'}</div>
                                    <div><span className="font-medium">Phone:</span> {selectedUser.phone || 'N/A'}</div>
                                    <div><span className="font-medium">Registration:</span> {new Date(selectedUser.createdAt).toLocaleDateString()}</div>
                                    <div><span className="font-medium">Verification Status:</span> {selectedUser.verificationStatus}</div>
                                    <div><span className="font-medium">KYC Status:</span> {selectedUser.kycStatus}</div>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Account Status</Label>
                                  <div className="space-y-2 mt-2">
                                    <div><span className="font-medium">Account Status:</span> {selectedUser.accountStatus}</div>
                                    <div><span className="font-medium">Role:</span> {selectedUser.isAdmin ? 'Admin' : 'User'}</div>
                                    <div><span className="font-medium">Email Verified:</span> {selectedUser.emailVerified ? 'Yes' : 'No'}</div>
                                    <div><span className="font-medium">Active:</span> {selectedUser.isActive ? 'Yes' : 'No'}</div>
                                    <div><span className="font-medium">Principal ID:</span> <span className="font-mono text-xs break-all">{selectedUser.principalId || 'N/A'}</span></div>
                                    <div><span className="font-medium">Last Login:</span> {selectedUser.lastLoginAt ? formatTimeAgo(selectedUser.lastLoginAt) : 'Never'}</div>
                                    <div><span className="font-medium">Last Updated:</span> {formatTimeAgo(selectedUser.updatedAt)}</div>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            {/* KYC Info Tab */}
                            <TabsContent value="kyc" className="space-y-4">
                              {userDetailsData?.kycInfo ? (
                                <div className="space-y-6">
                                  <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                      <Label className="text-sm font-medium">KYC Status</Label>
                                      <div className="space-y-3 mt-2">
                                        <div className="p-4 border rounded">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium">Status:</span>
                                            <Badge className={userDetailsData.kycInfo.status === 'approved' ? 'bg-green-100 text-green-800' : userDetailsData.kycInfo.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                                              {userDetailsData.kycInfo.status?.toUpperCase() || 'PENDING'}
                                            </Badge>
                                          </div>
                                          <div className="text-sm space-y-1 mt-3">
                                            <div><span className="font-medium">Document Type:</span> {userDetailsData.kycInfo.documentType || 'N/A'}</div>
                                            <div><span className="font-medium">Document Country:</span> {userDetailsData.kycInfo.documentCountry || 'N/A'}</div>
                                            <div><span className="font-medium">Submitted:</span> {userDetailsData.kycInfo.submittedAt ? new Date(userDetailsData.kycInfo.submittedAt).toLocaleString() : 'N/A'}</div>
                                            {userDetailsData.kycInfo.reviewedAt && (
                                              <div><span className="font-medium">Reviewed:</span> {new Date(userDetailsData.kycInfo.reviewedAt).toLocaleString()}</div>
                                            )}
                                            {userDetailsData.kycInfo.rejectionReason && (
                                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                                <span className="font-medium">Rejection Reason:</span>
                                                <p className="text-xs mt-1">{userDetailsData.kycInfo.rejectionReason}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <Label className="text-sm font-medium">Document Images</Label>
                                      <div className="space-y-2 mt-2">
                                        <div className="grid grid-cols-1 gap-2">
                                          {userDetailsData.kycInfo.documentImageKeyEncrypted && (
                                            <div className="border rounded p-2">
                                              <p className="text-xs font-medium mb-1">Front</p>
                                              <img 
                                                src={`/api/admin/kyc/document/${userDetailsData.kycInfo.id}/front`}
                                                alt="Document front"
                                                className="w-full h-32 object-contain bg-gray-100 rounded"
                                                data-testid="img-kyc-front"
                                              />
                                            </div>
                                          )}
                                          {userDetailsData.kycInfo.documentBackImageKeyEncrypted && (
                                            <div className="border rounded p-2">
                                              <p className="text-xs font-medium mb-1">Back</p>
                                              <img 
                                                src={`/api/admin/kyc/document/${userDetailsData.kycInfo.id}/back`}
                                                alt="Document back"
                                                className="w-full h-32 object-contain bg-gray-100 rounded"
                                                data-testid="img-kyc-back"
                                              />
                                            </div>
                                          )}
                                          {userDetailsData.kycInfo.selfieImageKeyEncrypted && (
                                            <div className="border rounded p-2">
                                              <p className="text-xs font-medium mb-1">Selfie</p>
                                              <img 
                                                src={`/api/admin/kyc/document/${userDetailsData.kycInfo.id}/selfie`}
                                                alt="Selfie"
                                                className="w-full h-32 object-contain bg-gray-100 rounded"
                                                data-testid="img-kyc-selfie"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Edit KYC Button */}
                                  <div className="flex justify-end">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setIsEditKycOpen(true)}
                                      data-testid="button-edit-kyc"
                                    >
                                      Edit KYC Status
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                  <p>No KYC information submitted</p>
                                </div>
                              )}
                            </TabsContent>

                            {/* Submitted Assets Tab */}
                            <TabsContent value="assets" className="space-y-4">
                              {userDetailsData?.rwaSubmissions && userDetailsData.rwaSubmissions.length > 0 ? (
                                <div className="space-y-4">
                                  {userDetailsData.rwaSubmissions.map((submission: any) => (
                                    <Card key={submission.id}>
                                      <CardContent className="pt-6">
                                        <div className="grid md:grid-cols-2 gap-6">
                                          <div>
                                            <h4 className="font-semibold text-lg mb-2">{submission.assetName}</h4>
                                            <div className="space-y-1 text-sm">
                                              <div><span className="font-medium">Category:</span> {submission.category}</div>
                                              <div><span className="font-medium">Estimated Value:</span> ${submission.estimatedValue}</div>
                                              <div><span className="font-medium">Status:</span> <Badge className={submission.status === 'approved' ? 'bg-green-100 text-green-800' : submission.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>{submission.status?.toUpperCase()}</Badge></div>
                                              <div><span className="font-medium">Submitted:</span> {new Date(submission.createdAt).toLocaleDateString()}</div>
                                              {submission.description && (
                                                <div className="mt-2">
                                                  <span className="font-medium">Description:</span>
                                                  <p className="text-xs mt-1 text-gray-600">{submission.description}</p>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <div>
                                            <Label className="text-sm font-medium mb-2 block">Asset Documents</Label>
                                            <div className="grid grid-cols-1 gap-2">
                                              {submission.coaUrl && (
                                                <div className="border rounded p-2">
                                                  <p className="text-xs font-medium mb-1">Certificate of Authenticity</p>
                                                  <img 
                                                    src={submission.coaUrl}
                                                    alt="COA"
                                                    className="w-full h-24 object-contain bg-gray-100 rounded"
                                                    data-testid={`img-asset-coa-${submission.id}`}
                                                  />
                                                </div>
                                              )}
                                              {submission.nftUrl && (
                                                <div className="border rounded p-2">
                                                  <p className="text-xs font-medium mb-1">NFT Certificate</p>
                                                  <img 
                                                    src={submission.nftUrl}
                                                    alt="NFT"
                                                    className="w-full h-24 object-contain bg-gray-100 rounded"
                                                    data-testid={`img-asset-nft-${submission.id}`}
                                                  />
                                                </div>
                                              )}
                                              {submission.physicalDocsUrl && (
                                                <div className="border rounded p-2">
                                                  <p className="text-xs font-medium mb-1">Physical Documentation</p>
                                                  <img 
                                                    src={submission.physicalDocsUrl}
                                                    alt="Physical Docs"
                                                    className="w-full h-24 object-contain bg-gray-100 rounded"
                                                    data-testid={`img-asset-docs-${submission.id}`}
                                                  />
                                                </div>
                                              )}
                                              {submission.images && submission.images.map((img: string, idx: number) => (
                                                <div key={idx} className="border rounded p-2">
                                                  <p className="text-xs font-medium mb-1">Image {idx + 1}</p>
                                                  <img 
                                                    src={img}
                                                    alt={`Asset image ${idx + 1}`}
                                                    className="w-full h-24 object-cover bg-gray-100 rounded"
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                  <p>No asset submissions found</p>
                                </div>
                              )}
                            </TabsContent>

                            {/* History Tab */}
                            <TabsContent value="history" className="space-y-4">
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-sm font-medium">Account Activity</Label>
                                  <div className="mt-2 space-y-2">
                                    <div className="p-4 border rounded">
                                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                          <span className="font-medium text-gray-600">Registration Date:</span>
                                          <p>{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-600">Last Login:</span>
                                          <p>{selectedUser.lastLoginAt ? formatTimeAgo(selectedUser.lastLoginAt) : 'Never'}</p>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-600">Account Status:</span>
                                          <p>{selectedUser.accountStatus}</p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="p-4 border rounded">
                                      <h4 className="font-medium mb-2">Pawn Activity</h4>
                                      <div className="text-center py-8 text-gray-500">
                                        <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p>Transaction history would be displayed here</p>
                                        <p className="text-sm">Feature coming soon</p>
                                      </div>
                                    </div>
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
                        <DropdownMenuItem onClick={() => {
                          setEditingUser(user);
                          setIsEditUserOpen(true);
                        }}>
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedUser(user);
                          setIsRoleChangeOpen(true);
                          roleChangeForm.setValue('newRole', user.role);
                        }}>
                          <Key className="h-4 w-4 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedUser(user);
                          setIsPasswordResetOpen(true);
                        }}>
                          <Key className="h-4 w-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        {user.accountStatus === 'active' && (
                          <>
                            <DropdownMenuItem>Suspend Account</DropdownMenuItem>
                            <DropdownMenuItem>Restrict Features</DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem>Contact User</DropdownMenuItem>
                        <DropdownMenuItem>View Transaction History</DropdownMenuItem>
                        {roles.isAdministrator && (
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="text-red-600 focus:text-red-600"
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
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

      {/* Create User Dialog */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Add a new user to the system. They will receive an email with login instructions.
            </DialogDescription>
          </DialogHeader>
          <CreateUserForm 
            onSuccess={() => setIsCreateUserOpen(false)}
            createUserMutation={createUserMutation}
          />
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={(open) => {
        setIsEditUserOpen(open);
        if (!open) {
          setEditingUser(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Edit User: {editingUser?.firstName} {editingUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <EditUserForm 
              user={editingUser}
              onSuccess={() => {
                setIsEditUserOpen(false);
                setEditingUser(null);
              }}
              updateUserMutation={updateUserMutation}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm User Deletion
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The user and all their data will be permanently deleted from the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-800">User to be deleted:</p>
                <p className="text-sm text-red-700">
                  {selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email || selectedUser.username})
                </p>
                <p className="text-sm text-red-700">Role: {selectedUser.role}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Are you absolutely sure you want to delete this user? This action will:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Permanently remove the user account</li>
              <li>Delete all associated data and records</li>
              <li>Revoke all access and permissions</li>
            </ul>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteConfirmOpen(false)}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={deleteUserMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordResetOpen} onOpenChange={(open) => {
        setIsPasswordResetOpen(open);
        if (!open) {
          passwordResetForm.reset();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Reset User Password
            </DialogTitle>
            <DialogDescription>
              Reset password for {selectedUser?.firstName} {selectedUser?.lastName} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordResetForm}>
            <form onSubmit={passwordResetForm.handleSubmit((data) => {
              if (!selectedUser) return;
              
              if (data.newPassword !== data.confirmPassword) {
                toast({
                  title: "Passwords Don't Match",
                  description: "Please make sure both password fields match.",
                  variant: "destructive",
                });
                return;
              }
              
              passwordResetMutation.mutate({
                userId: selectedUser.id,
                newPassword: data.newPassword,
                reason: data.reason
              });
            })} className="space-y-4">
              <FormField
                control={passwordResetForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password *</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter new password (min 8 chars)" 
                        {...field} 
                        data-testid="input-new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordResetForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password *</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm new password" 
                        {...field} 
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordResetForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Password Reset *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please explain why you are resetting this user's password..." 
                        {...field} 
                        data-testid="input-reset-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPasswordResetOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={passwordResetMutation.isPending}
                  data-testid="button-reset-password"
                >
                  {passwordResetMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit KYC Dialog */}
      <Dialog open={isEditKycOpen} onOpenChange={(open) => {
        setIsEditKycOpen(open);
        if (!open) {
          // Reset form state when closing dialog
          setKycStatus('');
          setKycReviewNotes('');
          setKycRejectionReason('');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Edit KYC Status
            </DialogTitle>
            <DialogDescription>
              Update KYC verification status for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          {userDetailsData?.kycInfo && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>KYC Status</Label>
                <Select 
                  value={kycStatus}
                  onValueChange={setKycStatus}
                >
                  <SelectTrigger data-testid="select-kyc-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-black border-border dark:border-gray-800">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Review Notes</Label>
                <Textarea 
                  placeholder="Add review notes or feedback..."
                  value={kycReviewNotes}
                  onChange={(e) => setKycReviewNotes(e.target.value)}
                  data-testid="input-kyc-notes"
                />
              </div>

              {kycStatus === 'rejected' && (
                <div className="space-y-2">
                  <Label>Rejection Reason</Label>
                  <Textarea 
                    placeholder="Explain why the KYC was rejected..."
                    value={kycRejectionReason}
                    onChange={(e) => setKycRejectionReason(e.target.value)}
                    data-testid="input-rejection-reason"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditKycOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    updateKycMutation.mutate({
                      kycId: userDetailsData.kycInfo.id,
                      status: kycStatus,
                      reviewNotes: kycReviewNotes,
                      rejectionReason: kycStatus === 'rejected' ? kycRejectionReason : undefined
                    });
                  }}
                  disabled={updateKycMutation.isPending || !kycReviewNotes.trim()}
                  data-testid="button-save-kyc"
                >
                  {updateKycMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create User Form Component
function CreateUserForm({ onSuccess, createUserMutation }: { 
  onSuccess: () => void; 
  createUserMutation: any;
}) {
  // Create user form schema - simplified for admin creation
  const createUserFormSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    username: z.string().min(3, "Username must be at least 3 characters").optional(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    isAdmin: z.boolean().default(false),
    emailVerified: z.boolean().default(true),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

  const createUserForm = useForm<z.infer<typeof createUserFormSchema>>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      email: "",
      username: "",
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
      isAdmin: false,
      emailVerified: true,
    },
  });

  const handleCreateUser = async (values: z.infer<typeof createUserFormSchema>) => {
    const { confirmPassword, ...userData } = values;
    createUserMutation.mutate(userData, {
      onSuccess: () => {
        createUserForm.reset();
        onSuccess();
      },
    });
  };

  return (
    <Form {...createUserForm}>
      <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={createUserForm.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} data-testid="input-first-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createUserForm.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={createUserForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address *</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} data-testid="input-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={createUserForm.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username (optional)</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} data-testid="input-username" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={createUserForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password *</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Min. 8 characters" {...field} data-testid="input-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createUserForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password *</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Confirm password" {...field} data-testid="input-confirm-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <FormField
            control={createUserForm.control}
            name="emailVerified"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-email-verified"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Email Verified</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Mark email as verified (user won't need to verify email)
                  </p>
                </div>
              </FormItem>
            )}
          />
          
          <FormField
            control={createUserForm.control}
            name="isAdmin"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-is-admin"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Admin Privileges</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Grant admin access to the user (use carefully)
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            data-testid="button-cancel-create-user"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createUserMutation.isPending}
            data-testid="button-submit-create-user"
          >
            {createUserMutation.isPending ? "Creating..." : "Create User"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Edit User Form Component
function EditUserForm({ user, onSuccess, updateUserMutation }: { 
  user: UserAccount;
  onSuccess: () => void; 
  updateUserMutation: any;
}) {
  // Edit user form schema - no password required for editing
  const editUserFormSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    username: z.string().min(3, "Username must be at least 3 characters").optional(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    isAdmin: z.boolean().default(false),
    emailVerified: z.boolean().default(true),
    accountStatus: z.enum(['active', 'suspended', 'restricted', 'banned'] as const),
  });

  const editUserForm = useForm<z.infer<typeof editUserFormSchema>>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      email: user.email || "",
      username: user.username || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      isAdmin: user.isAdmin || false,
      emailVerified: user.emailVerified || false,
      accountStatus: user.accountStatus || 'active',
    },
  });

  // Reset form when user changes
  useEffect(() => {
    editUserForm.reset({
      email: user.email || "",
      username: user.username || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      isAdmin: user.isAdmin || false,
      emailVerified: user.emailVerified || false,
      accountStatus: user.accountStatus || 'active',
    });
  }, [user, editUserForm]);

  const handleUpdateUser = async (values: z.infer<typeof editUserFormSchema>) => {
    // Sync role with isAdmin
    const updates = {
      ...values,
      // If isAdmin is checked, set role to administrator
      // If isAdmin is unchecked and current role is administrator, set to registered
      // Otherwise, keep the existing role
      role: values.isAdmin 
        ? 'administrator' 
        : (user.role === 'administrator' ? 'registered' : user.role)
    };
    
    updateUserMutation.mutate(
      { userId: user.id, updates },
      {
        onSuccess: () => {
          editUserForm.reset();
          onSuccess();
        },
      }
    );
  };

  return (
    <Form {...editUserForm}>
      <form onSubmit={editUserForm.handleSubmit(handleUpdateUser)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={editUserForm.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} data-testid="input-edit-first-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={editUserForm.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} data-testid="input-edit-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={editUserForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address *</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} data-testid="input-edit-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={editUserForm.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username (optional)</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} data-testid="input-edit-username" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <FormField
            control={editUserForm.control}
            name="accountStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Status</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger data-testid="select-account-status">
                      <SelectValue placeholder="Select account status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="restricted">Restricted</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={editUserForm.control}
            name="emailVerified"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-edit-email-verified"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Email Verified</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    User's email address is verified
                  </p>
                </div>
              </FormItem>
            )}
          />
          
          <FormField
            control={editUserForm.control}
            name="isAdmin"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-edit-is-admin"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Admin Privileges</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Grant admin access to the user (use carefully)
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            data-testid="button-cancel-edit-user"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateUserMutation.isPending}
            data-testid="button-submit-edit-user"
          >
            {updateUserMutation.isPending ? "Updating..." : "Update User"}
          </Button>
        </div>
      </form>
    </Form>
  );
}