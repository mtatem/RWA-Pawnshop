import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { 
  ArrowLeft, 
  User as UserIcon, 
  Mail, 
  Lock, 
  Wallet, 
  Shield, 
  Settings, 
  Eye, 
  EyeOff,
  Camera,
  Edit,
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Package,
  Upload,
  FileText,
  DollarSign,
  Calendar,
  Plus,
  Copy,
  RefreshCw,
  ExternalLink,
  Coins
} from "lucide-react";

import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useICPWallet } from "@/hooks/useICPWallet";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from '@/components/ObjectUploader';

// Password change form schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Profile update form schema
const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50, "First name too long"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name too long"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username too long").optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional()
});

// MFA-related schemas
const mfaVerifySchema = z.object({
  totpToken: z.string().min(6, "TOTP token must be 6 digits").max(6, "TOTP token must be 6 digits")
});

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;
type ProfileUpdateForm = z.infer<typeof profileUpdateSchema>;
type MfaVerifyForm = z.infer<typeof mfaVerifySchema>;

// Pawn asset form schema
const pawnAssetSchema = z.object({
  assetName: z.string().min(1, "Asset name is required").max(100, "Asset name too long"),
  category: z.enum(["watches", "jewelry", "electronics", "art", "collectibles", "other"], {
    required_error: "Category is required"
  }),
  estimatedValue: z.string().min(1, "Estimated value is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Must be a valid positive number"
  ),
  description: z.string().optional(),
  walletAddress: z.string().min(1, "Wallet address is required")
});

type PawnAssetForm = z.infer<typeof pawnAssetSchema>;

// KYC form schema - must match backend validation
const kycSchema = z.object({
  documentType: z.enum(["passport", "drivers_license", "national_id"], {
    required_error: "Document type is required"
  }),
  fullName: z.string().min(1, "Full name is required").max(100, "Full name too long"),
  documentNumber: z.string().min(1, "Document number is required").max(50, "Document number too long"),
  documentCountry: z.string().min(2, "Country code required").max(3, "Invalid country code"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  nationality: z.string().min(1, "Nationality is required"),
  occupation: z.string().min(1, "Occupation is required"),
  sourceOfFunds: z.enum(["employment", "business_ownership", "investments", "inheritance", "savings", "pension", "other"], {
    required_error: "Source of funds is required"
  }),
  annualIncome: z.enum(["under_25k", "25k_50k", "50k_100k", "100k_250k", "250k_500k", "over_500k"], {
    required_error: "Annual income range is required"
  })
});

type KYCForm = z.infer<typeof kycSchema>;

interface WalletBinding {
  id: string;
  walletType: string;
  walletAddress: string;
  principalId?: string;
  bindingStatus: string;
  isPrimary: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

interface UserActivity {
  id: string;
  activityType: string;
  ipAddress?: string;
  location?: string;
  success: boolean;
  createdAt: string;
}

interface KYCInformation {
  id: string;
  userId: string;
  documentType: string;
  documentCountry: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

interface RwaSubmission {
  id: string;
  userId: string;
  assetName: string;
  category: string;
  estimatedValue: string;
  description?: string;
  status: string;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PawnLoan {
  id: string;
  userId: string;
  submissionId: string;
  loanAmount: string;
  assetValue: string;
  fee: string;
  status: string;
  expiryDate: string;
  redeemedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Profile() {
  const { user, isLoading: userLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { 
    wallet, 
    isConnecting, 
    isConnected, 
    connectPlug, 
    connectInternetIdentity, 
    disconnect, 
    refreshBalance,
    isPlugAvailable,
    error: walletError 
  } = useICPWallet();
  
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPawnForm, setShowPawnForm] = useState(false);
  
  // KYC document upload state
  const [documentFrontFile, setDocumentFrontFile] = useState<File | null>(null);
  const [documentBackFile, setDocumentBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  
  // MFA state management
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState<{
    qrCodeUrl: string;
    manualEntryKey: string;
    backupCodes: string[];
    setupExpiresAt: string;
  } | null>(null);

  // Profile form
  const profileForm = useForm<ProfileUpdateForm>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      phone: "",
      city: "",
      state: "",
      country: "",
      postalCode: ""
    }
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        email: user.email || "",
        phone: user.phoneEncrypted || "",
        city: user.city || "",
        state: user.state || "",
        country: user.country || "",
        postalCode: user.postalCode || ""
      });
    }
  }, [user, profileForm]);

  // Password change form
  const passwordForm = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  // MFA verification form
  const mfaForm = useForm<MfaVerifyForm>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: {
      totpToken: ""
    }
  });

  // Fetch user's wallet bindings
  const { data: walletBindings, isLoading: walletsLoading } = useQuery<WalletBinding[]>({
    queryKey: ["/api/user/wallets"],
    enabled: !!user
  });

  // Fetch user activity
  const { data: userActivity, isLoading: activityLoading } = useQuery<UserActivity[]>({
    queryKey: ["/api/user/activity"],
    enabled: !!user
  });

  // Fetch user's RWA submissions
  const { data: rwaSubmissions, isLoading: submissionsLoading } = useQuery<RwaSubmission[]>({
    queryKey: ["/api/rwa-submissions/user", user?.id],
    enabled: !!user?.id
  });

  // Fetch user's pawn loans
  const { data: pawnLoans, isLoading: loansLoading } = useQuery<PawnLoan[]>({
    queryKey: ["/api/pawn-loans/user", user?.id],
    enabled: !!user?.id
  });

  // Fetch user's KYC information
  // Use user-scoped cache key to prevent cross-user data leakage
  const { data: kycInfo, isLoading: kycLoading, error: kycError } = useQuery<KYCInformation>({
    queryKey: ["/api/user/kyc", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/user/kyc", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const json = await res.json();
      return json.data; // Extract the data field from API response
    },
    enabled: !!user?.id
  });

  // KYC form
  const kycForm = useForm<KYCForm>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      documentType: "passport",
      fullName: "",
      documentNumber: "",
      documentCountry: "US",
      dateOfBirth: "",
      nationality: "",
      occupation: "",
      sourceOfFunds: "employment",
      annualIncome: "under_25k"
    }
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdateForm) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      return response;
    },
    onSuccess: async (data) => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      
      // Force immediate data refresh and form sync
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeForm) => {
      const response = await apiRequest("POST", "/api/user/change-password", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    }
  });

  // MFA setup mutation
  const mfaSetupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/mfa/setup");
      return response.json();
    },
    onSuccess: (data) => {
      setMfaSetupData(data.data);
      setShowMfaSetup(true);
      toast({
        title: "MFA Setup Started",
        description: "Scan the QR code with your authenticator app to continue.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "MFA Setup Failed",
        description: error.message || "Failed to start MFA setup. Please try again.",
        variant: "destructive",
      });
    }
  });

  // MFA enable mutation
  const mfaEnableMutation = useMutation({
    mutationFn: async (data: MfaVerifyForm) => {
      const response = await apiRequest("POST", "/api/mfa/enable", data);
      return response.json();
    },
    onSuccess: () => {
      setShowMfaSetup(false);
      setMfaSetupData(null);
      mfaForm.reset();
      
      // Force refresh user data to update MFA status immediately
      queryClient.clear(); // Clear all cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "MFA Enabled",
        description: "Two-factor authentication has been successfully enabled for your account.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "MFA Enable Failed",
        description: error.message || "Failed to enable MFA. Please check your authenticator and try again.",
        variant: "destructive",
      });
    }
  });

  // KYC submission mutation
  const submitKYCMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/user/kyc", {
        method: "POST",
        body: data
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "KYC Submitted",
        description: "Your KYC verification has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/kyc", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "KYC Submission Failed",
        description: error.message || "Failed to submit KYC verification. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onProfileSubmit = (data: ProfileUpdateForm) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordChangeForm) => {
    changePasswordMutation.mutate(data);
  };

  const onKYCSubmit = (data: KYCForm) => {
    // Validate files before submission
    if (!documentFrontFile) {
      toast({
        title: "Document Required",
        description: "Please upload the front of your ID document",
        variant: "destructive"
      });
      return;
    }
    
    if (!selfieFile) {
      toast({
        title: "Selfie Required", 
        description: "Please upload a selfie photo",
        variant: "destructive"
      });
      return;
    }
    
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    // Append file uploads
    formData.append('documentImage', documentFrontFile);
    if (documentBackFile) {
      formData.append('documentBackImage', documentBackFile);
    }
    formData.append('selfieImage', selfieFile);
    
    submitKYCMutation.mutate(formData);
  };

  // MFA handler functions
  const onMfaSetup = () => {
    mfaSetupMutation.mutate();
  };

  const onMfaEnable = (data: MfaVerifyForm) => {
    mfaEnableMutation.mutate(data);
  };

  const onMfaCancel = () => {
    setShowMfaSetup(false);
    setMfaSetupData(null);
    mfaForm.reset();
  };

  const getKYCStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Verified</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Under Review</Badge>;
      case "failed":
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100">Not Started</Badge>;
    }
  };

  const canPawnAssets = () => {
    return user?.kycStatus === "completed";
  };

  // Handle upload parameters for ObjectUploader
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  // Profile image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const response = await apiRequest("PATCH", "/api/user/profile-image", { 
        profileImageUrl: imageUrl 
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Profile Image Updated",
        description: "Your profile image has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to update profile image. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Pawn loan redemption mutation
  const redeemLoanMutation = useMutation({
    mutationFn: async (loanId: string) => {
      const response = await apiRequest("PATCH", `/api/pawn-loans/${loanId}/redeem`, {});
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Asset Redeemed",
        description: "Your asset has been successfully redeemed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pawn-loans/user", user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Redemption Failed",
        description: error.message || "Failed to redeem asset. Please try again.",
        variant: "destructive",
      });
    }
  });

  // New RWA submission mutation
  const submitRwaMutation = useMutation({
    mutationFn: async (rwaData: any) => {
      const response = await apiRequest("POST", "/api/rwa-submissions", rwaData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "RWA Submitted",
        description: "Your asset has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rwa-submissions/user", user?.id] });
      setShowPawnForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit asset. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle Uppy upload complete
  // Handle successful upload completion
  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const imageUrl = uploadedFile.uploadURL;
      if (imageUrl) {
        // The backend will normalize the GCS URL to our app's object path
        uploadImageMutation.mutate(imageUrl);
      }
    }
  };

  // Pawn asset form
  const pawnForm = useForm<PawnAssetForm>({
    resolver: zodResolver(pawnAssetSchema),
    defaultValues: {
      assetName: "",
      category: "other",
      estimatedValue: "",
      description: "",
      walletAddress: ""
    }
  });

  const onPawnSubmit = (data: PawnAssetForm) => {
    // Check KYC requirement before submission
    if (!canPawnAssets()) {
      toast({
        title: "KYC Verification Required",
        description: "You must complete your identity verification in the KYC tab before you can pawn assets.",
        variant: "destructive",
      });
      return;
    }
    
    submitRwaMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-500", label: "Active" },
      suspended: { color: "bg-yellow-500", label: "Suspended" },
      banned: { color: "bg-red-500", label: "Banned" },
      restricted: { color: "bg-orange-500", label: "Restricted" },
      verified: { color: "bg-green-500", label: "Verified" },
      pending: { color: "bg-yellow-500", label: "Pending" },
      unverified: { color: "bg-gray-500", label: "Unverified" },
      rejected: { color: "bg-red-500", label: "Rejected" }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unverified;
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case "login": return <UserIcon className="h-4 w-4" />;
      case "logout": return <ArrowLeft className="h-4 w-4" />;
      case "password_change": return <Lock className="h-4 w-4" />;
      case "profile_update": return <Edit3 className="h-4 w-4" />;
      case "wallet_bind": return <Wallet className="h-4 w-4" />;
      case "kyc_submit": return <Shield className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading profile...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              You need to be logged in to view your profile.
            </p>
            <Link href="/login">
              <Button className="w-full" data-testid="button-login">
                Sign In
              </Button>
            </Link>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-4" data-testid="button-back-dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            
            <div className="flex items-start space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.profileImageUrl || ""} />
                <AvatarFallback className="text-2xl">
                  {(user.firstName?.[0] || user.username?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <h1 className="text-3xl font-bold" data-testid="text-user-name">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user.username || "User"}
                </h1>
                <p className="text-muted-foreground" data-testid="text-user-email">{user.email}</p>
                <div className="flex gap-2">
                  {getStatusBadge(user.accountStatus || "active")}
                  {getStatusBadge(user.verificationStatus || "unverified")}
                </div>
              </div>
              
              <div className="ml-4">
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={5 * 1024 * 1024} // 5MB
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleUploadComplete}
                  buttonClassName="rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </ObjectUploader>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
              <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
              <TabsTrigger value="kyc" data-testid="tab-kyc">KYC</TabsTrigger>
              <TabsTrigger value="wallets" data-testid="tab-wallets">Wallets</TabsTrigger>
              <TabsTrigger value="assets" data-testid="tab-assets">Assets</TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>
                        Manage your personal information and account settings
                      </CardDescription>
                    </div>
                    <Button
                      variant={isEditing ? "outline" : "default"}
                      onClick={() => setIsEditing(!isEditing)}
                      data-testid={isEditing ? "button-cancel-edit" : "button-edit-profile"}
                    >
                      {isEditing ? (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Edit3 className="mr-2 h-4 w-4" />
                          Edit
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={!isEditing} data-testid="input-first-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={!isEditing} data-testid="input-last-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={!isEditing} data-testid="input-username" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" disabled={!isEditing} data-testid="input-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={!isEditing} data-testid="input-city" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State/Province</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={!isEditing} data-testid="input-state" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {isEditing && (
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="submit"
                            disabled={updateProfileMutation.isPending}
                            data-testid="button-save-profile"
                          >
                            {updateProfileMutation.isPending ? (
                              "Saving..."
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your account password for better security
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type={showCurrentPassword ? "text" : "password"}
                                  data-testid="input-current-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                  data-testid="button-toggle-current-password"
                                >
                                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type={showNewPassword ? "text" : "password"}
                                  data-testid="input-new-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  data-testid="button-toggle-new-password"
                                >
                                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type={showConfirmPassword ? "text" : "password"}
                                  data-testid="input-confirm-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  data-testid="button-toggle-confirm-password"
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        data-testid="button-change-password"
                      >
                        {changePasswordMutation.isPending ? (
                          "Changing Password..."
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Change Password
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Multi-Factor Authentication</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        {user.mfaEnabled ? "Enabled" : "Not enabled"}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={onMfaSetup}
                      disabled={mfaSetupMutation.isPending}
                      data-testid="button-manage-mfa"
                    >
                      {mfaSetupMutation.isPending ? "Starting Setup..." : (user.mfaEnabled ? "Manage" : "Enable")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>KYC Verification</CardTitle>
                  <CardDescription>
                    Complete identity verification to unlock all platform features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Identity Verification Status</p>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(user.kycStatus || "not_started")}
                        <span className="text-sm text-muted-foreground">
                          {user.kycStatus === "completed" ? "Verified" : 
                           user.kycStatus === "pending" ? "Under Review" :
                           user.kycStatus === "in_progress" ? "In Progress" :
                           "Not Started"}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      data-testid="button-kyc-verification"
                      onClick={() => setActiveTab('kyc')}
                    >
                      {user.kycStatus === "completed" ? "View Status" : 
                       user.kycStatus === "pending" || user.kycStatus === "in_progress" ? "View Status" :
                       "Start Verification"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* KYC Tab */}
            <TabsContent value="kyc" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>KYC Verification</span>
                  </CardTitle>
                  <CardDescription>
                    Complete your identity verification to enable asset pawning features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {kycLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : kycInfo ? (
                    <div className="space-y-6">
                      {/* Current KYC Status */}
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4" />
                            <span className="font-medium">Verification Status</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Document Type: {kycInfo?.documentType?.replace('_', ' ').toUpperCase() || 'Not specified'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Submitted: {kycInfo?.submittedAt ? new Date(kycInfo.submittedAt).toLocaleDateString() : 'Not submitted'}
                          </p>
                          {kycInfo.rejectionReason && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                              Rejection Reason: {kycInfo.rejectionReason}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          {getKYCStatusBadge(kycInfo.status)}
                        </div>
                      </div>

                      {/* Resubmit if rejected */}
                      {kycInfo.status === "rejected" && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Your verification was rejected. Please update your information and resubmit.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Link to KYC page for editing */}
                      {(kycInfo.status === "pending" || kycInfo.status === "rejected") && (
                        <Link href="/kyc">
                          <Button variant="outline" className="w-full" data-testid="button-go-to-kyc">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit KYC Submission
                          </Button>
                        </Link>
                      )}
                    </div>
                  ) : (
                    /* KYC Submission Form */
                    <Form {...kycForm}>
                      <form onSubmit={kycForm.handleSubmit(onKYCSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={kycForm.control}
                            name="documentType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Document Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-document-type">
                                      <SelectValue placeholder="Select document type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="passport">Passport</SelectItem>
                                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                                    <SelectItem value="national_id">National ID</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={kycForm.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Legal Name</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-full-name" placeholder="Enter your full legal name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={kycForm.control}
                            name="documentNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Document Number</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-document-number" placeholder="Enter document number" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={kycForm.control}
                            name="documentCountry"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Document Country</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-document-country" placeholder="US" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={kycForm.control}
                            name="dateOfBirth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date of Birth</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" data-testid="input-date-of-birth" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={kycForm.control}
                            name="nationality"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nationality</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-nationality" placeholder="Enter your nationality" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={kycForm.control}
                            name="occupation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Occupation</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-occupation" placeholder="Enter your occupation" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={kycForm.control}
                            name="sourceOfFunds"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Source of Funds</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-source-of-funds">
                                      <SelectValue placeholder="Select source of funds" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-gray-900 dark:bg-gray-900 text-white dark:text-white border-gray-700">
                                    <SelectItem value="employment">Employment/Salary</SelectItem>
                                    <SelectItem value="business_ownership">Business Ownership</SelectItem>
                                    <SelectItem value="investments">Investments/Trading</SelectItem>
                                    <SelectItem value="inheritance">Inheritance</SelectItem>
                                    <SelectItem value="savings">Personal Savings</SelectItem>
                                    <SelectItem value="pension">Pension/Retirement</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={kycForm.control}
                            name="annualIncome"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Annual Income Range</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-annual-income">
                                      <SelectValue placeholder="Select income range" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-gray-900 dark:bg-gray-900 text-white dark:text-white border-gray-700">
                                    <SelectItem value="under_25k">Under $25,000</SelectItem>
                                    <SelectItem value="25k_50k">$25,000 - $50,000</SelectItem>
                                    <SelectItem value="50k_100k">$50,000 - $100,000</SelectItem>
                                    <SelectItem value="100k_250k">$100,000 - $250,000</SelectItem>
                                    <SelectItem value="250k_500k">$250,000 - $500,000</SelectItem>
                                    <SelectItem value="over_500k">Over $500,000</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Document Upload Section */}
                        <div className="space-y-4 pt-4 border-t">
                          <h3 className="text-lg font-semibold">Document Uploads</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Document Front */}
                            <div className="space-y-2">
                              <Label htmlFor="document-front">
                                ID Document (Front) <span className="text-red-500">*</span>
                              </Label>
                              <div className="flex items-center gap-4">
                                <Input
                                  id="document-front"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => setDocumentFrontFile(e.target.files?.[0] || null)}
                                  data-testid="input-document-front"
                                  className="cursor-pointer"
                                />
                                {documentFrontFile && (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                )}
                              </div>
                              {documentFrontFile && (
                                <p className="text-sm text-muted-foreground">
                                  {documentFrontFile.name}
                                </p>
                              )}
                            </div>

                            {/* Document Back */}
                            <div className="space-y-2">
                              <Label htmlFor="document-back">
                                ID Document (Back) <span className="text-muted-foreground">(Optional)</span>
                              </Label>
                              <div className="flex items-center gap-4">
                                <Input
                                  id="document-back"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => setDocumentBackFile(e.target.files?.[0] || null)}
                                  data-testid="input-document-back"
                                  className="cursor-pointer"
                                />
                                {documentBackFile && (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                )}
                              </div>
                              {documentBackFile && (
                                <p className="text-sm text-muted-foreground">
                                  {documentBackFile.name}
                                </p>
                              )}
                            </div>

                            {/* Selfie */}
                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor="selfie">
                                Selfie Photo <span className="text-red-500">*</span>
                              </Label>
                              <div className="flex items-center gap-4">
                                <Input
                                  id="selfie"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                                  data-testid="input-selfie"
                                  className="cursor-pointer"
                                />
                                {selfieFile && (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                )}
                              </div>
                              {selfieFile && (
                                <p className="text-sm text-muted-foreground">
                                  {selfieFile.name}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                Please upload a clear photo of yourself holding your ID document
                              </p>
                            </div>
                          </div>
                        </div>

                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Important:</strong> You must complete KYC verification before you can pawn assets on our platform. This helps us comply with regulatory requirements and ensures the security of all transactions.
                          </AlertDescription>
                        </Alert>

                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={submitKYCMutation.isPending}
                          data-testid="button-submit-kyc"
                        >
                          {submitKYCMutation.isPending ? "Submitting..." : "Submit KYC Verification"}
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Wallets Tab */}
            <TabsContent value="wallets" className="space-y-6">
              {/* Current Wallet Connection */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Current Wallet</CardTitle>
                      <CardDescription>
                        Your currently connected ICP wallet
                      </CardDescription>
                    </div>
                    {isConnected && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={refreshBalance}
                        data-testid="button-refresh-balance"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isConnecting ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="ml-3">Connecting wallet...</p>
                    </div>
                  ) : isConnected && wallet ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-black dark:bg-black border-gray-700 dark:border-gray-700">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-green-900/50 dark:bg-green-900/50 rounded-full">
                              <Wallet className="h-5 w-5 text-green-400 dark:text-green-400" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-white dark:text-white">
                                  {wallet.walletType === 'plug' ? 'Plug Wallet' : 'Internet Identity'}
                                </span>
                                <Badge className="bg-green-500 text-white">Connected</Badge>
                              </div>
                              <p className="text-sm text-gray-300 dark:text-gray-300">Ready for transactions</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Principal ID</Label>
                              <div className="flex items-center space-x-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                                  {wallet.principalId}
                                </code>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => {
                                    navigator.clipboard.writeText(wallet.principalId);
                                    toast({ title: "Copied!", description: "Principal ID copied to clipboard" });
                                  }}
                                  data-testid="button-copy-principal"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Account ID</Label>
                              <div className="flex items-center space-x-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                                  {wallet.accountId}
                                </code>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => {
                                    navigator.clipboard.writeText(wallet.accountId);
                                    toast({ title: "Copied!", description: "Account ID copied to clipboard" });
                                  }}
                                  data-testid="button-copy-account"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                            <div className="flex items-center space-x-2">
                              <Coins className="h-5 w-5 text-blue-400" />
                              <span className="font-semibold text-lg text-white">{wallet.balance.toFixed(4)} ICP</span>
                              <span className="text-sm text-gray-400">≈ ${(wallet.balance * 12.50).toFixed(2)} USD</span>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={disconnect}
                              data-testid="button-disconnect-wallet"
                            >
                              Disconnect
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">No Wallet Connected</h3>
                      <p className="text-muted-foreground mb-6">Connect your ICP wallet to view balance and manage assets</p>
                      
                      {walletError && (
                        <Alert className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{walletError}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {isPlugAvailable && (
                          <Button 
                            onClick={connectPlug}
                            disabled={isConnecting}
                            data-testid="button-connect-plug"
                          >
                            {isConnecting ? "Connecting..." : "Connect Plug Wallet"}
                          </Button>
                        )}
                        <Button 
                          variant="outline"
                          onClick={connectInternetIdentity}
                          disabled={isConnecting}
                          data-testid="button-connect-ii"
                        >
                          {isConnecting ? "Connecting..." : "Connect Internet Identity"}
                        </Button>
                      </div>
                      
                      {!isPlugAvailable && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Don't have Plug wallet? 
                            <a 
                              href="https://plugwallet.ooo/" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-medium underline hover:no-underline"
                            >
                              Install it here <ExternalLink className="h-3 w-3 inline ml-1" />
                            </a>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Wallet Assets & RWA Opportunities */}
              {isConnected && wallet && (
                <Card>
                  <CardHeader>
                    <CardTitle>Wallet Assets & RWA Opportunities</CardTitle>
                    <CardDescription>
                      Real-world assets you can pawn and current wallet holdings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Available for Pawning */}
                      <div className="space-y-3">
                        <h4 className="font-semibold flex items-center">
                          <Package className="h-4 w-4 mr-2 text-orange-500" />
                          Available to Pawn
                        </h4>
                        {rwaSubmissions && rwaSubmissions.filter(sub => sub.status === 'approved' && !pawnLoans?.some(loan => loan.submissionId === sub.id && loan.status === 'active')).length > 0 ? (
                          <div className="space-y-2">
                            {rwaSubmissions
                              .filter(sub => sub.status === 'approved' && !pawnLoans?.some(loan => loan.submissionId === sub.id && loan.status === 'active'))
                              .slice(0, 3)
                              .map((asset) => (
                                <div key={asset.id} className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-900/20">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium text-sm">{asset.assetName}</p>
                                      <p className="text-xs text-muted-foreground">{asset.category}</p>
                                      <p className="text-xs text-orange-600 dark:text-orange-400">
                                        Max loan: ${Math.floor(Number(asset.estimatedValue) * 0.7)}
                                      </p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => setShowPawnForm(true)}>
                                      Pawn
                                    </Button>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No approved assets available for pawning</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Current Holdings */}
                      <div className="space-y-3">
                        <h4 className="font-semibold flex items-center">
                          <Coins className="h-4 w-4 mr-2 text-blue-500" />
                          Current Holdings
                        </h4>
                        <div className="space-y-2">
                          <div className="p-3 border rounded-lg">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">ICP</span>
                                </div>
                                <div>
                                  <p className="font-medium">Internet Computer</p>
                                  <p className="text-xs text-muted-foreground">ICP</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{wallet.balance.toFixed(4)}</p>
                                <p className="text-xs text-muted-foreground">≈ ${(wallet.balance * 12.50).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-center py-4 text-muted-foreground">
                            <p className="text-xs">Additional token support coming soon</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="font-semibold mb-3">Quick Actions</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Link href="/dashboard">
                          <Button variant="outline" size="sm" disabled={!canPawnAssets()} className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Pawn Asset
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => setActiveTab('assets')}>
                          <Package className="h-4 w-4 mr-2" />
                          View Assets
                        </Button>
                        <Button variant="outline" size="sm" onClick={refreshBalance}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Explorer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Historical Wallet Bindings */}
              {walletBindings && walletBindings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Wallet History</CardTitle>
                    <CardDescription>
                      Previously connected wallets and their status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {walletBindings.map((binding) => (
                        <div key={binding.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Wallet className="h-4 w-4" />
                              <span className="font-medium">{binding.walletType}</span>
                              {binding.isPrimary && <Badge>Primary</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground font-mono break-all">
                              {binding.walletAddress}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Connected {new Date(binding.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(binding.bindingStatus)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Assets Tab */}
            <TabsContent value="assets" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Your Assets</h3>
                  <p className="text-muted-foreground">Manage your pawned and submitted assets</p>
                </div>
                <Link href="/dashboard">
                  <Button
                    disabled={!canPawnAssets()}
                    data-testid="button-pawn-new-asset"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Pawn New Asset
                  </Button>
                </Link>
              </div>

              {/* KYC Requirement Warning */}
              {!canPawnAssets() && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>KYC Verification Required:</strong> You must complete your identity verification in the KYC tab before you can pawn assets. This helps us comply with regulatory requirements.
                  </AlertDescription>
                </Alert>
              )}

              {/* Pawned Assets (Active Loans) */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Pawn Loans</CardTitle>
                  <CardDescription>
                    Assets currently used as collateral for loans
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loansLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : !pawnLoans || pawnLoans.filter(loan => loan.status === 'active').length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No active pawn loans</p>
                      <Link href="/dashboard">
                        <Button
                          disabled={!canPawnAssets()}
                          data-testid="button-pawn-first-asset"
                        >
                          Pawn Your First Asset
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pawnLoans.filter(loan => loan.status === 'active').map((loan) => {
                        const submission = rwaSubmissions?.find(sub => sub.id === loan.submissionId);
                        const isExpiring = new Date(loan.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                        
                        return (
                          <div key={loan.id} className={`p-4 border rounded-lg ${isExpiring ? 'border-orange-300 bg-orange-50' : ''}`}>
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <h4 className="font-semibold">{submission?.assetName || 'Unknown Asset'}</h4>
                                <p className="text-sm text-muted-foreground">{submission?.category}</p>
                                <div className="flex items-center space-x-4 text-sm">
                                  <span className="flex items-center">
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    Loan: ${loan.loanAmount}
                                  </span>
                                  <span className="flex items-center">
                                    <FileText className="h-4 w-4 mr-1" />
                                    Value: ${loan.assetValue}
                                  </span>
                                  <span className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    Expires: {new Date(loan.expiryDate).toLocaleDateString()}
                                  </span>
                                </div>
                                {isExpiring && (
                                  <Alert className="mt-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                      This loan expires soon. Redeem your asset to avoid it going to marketplace.
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                              <Button
                                onClick={() => redeemLoanMutation.mutate(loan.id)}
                                disabled={redeemLoanMutation.isPending}
                                data-testid={`button-redeem-${loan.id}`}
                              >
                                {redeemLoanMutation.isPending ? 'Redeeming...' : 'Unpawn Asset'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submitted Assets (Pending Review) */}
              <Card>
                <CardHeader>
                  <CardTitle>Pending Submissions</CardTitle>
                  <CardDescription>
                    Assets submitted for review that haven't been approved yet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submissionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : !rwaSubmissions || rwaSubmissions.filter(sub => sub.status === 'pending').length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No pending submissions</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rwaSubmissions.filter(sub => sub.status === 'pending').map((submission) => (
                        <div key={submission.id} className="p-4 border rounded-lg bg-yellow-50">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <h4 className="font-semibold">{submission.assetName}</h4>
                              <Badge className="bg-yellow-500 text-white">Pending Review</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{submission.category}</p>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                Estimated Value: ${submission.estimatedValue}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Submitted: {new Date(submission.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {submission.description && (
                              <p className="text-sm text-muted-foreground mt-2">{submission.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Activity</CardTitle>
                  <CardDescription>
                    View your recent account activity and login history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : !userActivity ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Failed to load activity information. Please try refreshing the page.
                      </AlertDescription>
                    </Alert>
                  ) : userActivity.length > 0 ? (
                    <div className="space-y-4">
                      {userActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                          <div className="mt-1">
                            {getActivityIcon(activity.activityType)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="font-medium capitalize">
                              {activity.activityType.replace('_', ' ')}
                            </p>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <span>{new Date(activity.createdAt).toLocaleString()}</span>
                              {activity.ipAddress && (
                                <>
                                  <span>•</span>
                                  <span>{activity.ipAddress}</span>
                                </>
                              )}
                              {activity.location && (
                                <>
                                  <span>•</span>
                                  <span>{activity.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            {activity.success ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No activity recorded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
      
      {/* Image Upload Modal */}
      
      {/* Pawn Asset Form Modal */}
      <Dialog open={showPawnForm} onOpenChange={setShowPawnForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pawn New Asset</DialogTitle>
          </DialogHeader>
          <Form {...pawnForm}>
            <form onSubmit={pawnForm.handleSubmit(onPawnSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={pawnForm.control}
                  name="assetName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Rolex Submariner" data-testid="input-asset-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={pawnForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <select {...field} className="w-full px-3 py-2 border border-input rounded-md bg-black text-white" data-testid="select-category">
                          <option value="watches">Watches</option>
                          <option value="jewelry">Jewelry</option>
                          <option value="electronics">Electronics</option>
                          <option value="art">Art</option>
                          <option value="collectibles">Collectibles</option>
                          <option value="other">Other</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={pawnForm.control}
                  name="estimatedValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Value ($)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="e.g., 5000" data-testid="input-estimated-value" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={pawnForm.control}
                  name="walletAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Your wallet address" data-testid="input-wallet-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={pawnForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={3}
                        className="w-full px-3 py-2 border border-input rounded-md"
                        placeholder="Additional details about your asset..."
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPawnForm(false)}
                  data-testid="button-cancel-pawn"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitRwaMutation.isPending}
                  data-testid="button-submit-pawn"
                >
                  {submitRwaMutation.isPending ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Submit for Review
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* MFA Setup Modal */}
      <Dialog open={showMfaSetup} onOpenChange={setShowMfaSetup}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          
          {mfaSetupData && (
            <div className="space-y-6">
              {/* Step 1: QR Code */}
              <div className="space-y-4">
                <h3 className="font-medium">Step 1: Scan QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={mfaSetupData.qrCodeUrl} 
                    alt="MFA QR Code" 
                    className="w-48 h-48"
                    data-testid="img-mfa-qr-code"
                  />
                </div>
                
                {/* Manual Entry Key */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Or enter this key manually:</p>
                  <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all" data-testid="text-manual-entry-key">
                    {mfaSetupData.manualEntryKey}
                  </div>
                </div>
              </div>

              {/* Step 2: Backup Codes */}
              <div className="space-y-4">
                <h3 className="font-medium">Step 2: Save Backup Codes</h3>
                <p className="text-sm text-muted-foreground">
                  Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
                </p>
                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                  {mfaSetupData.backupCodes.map((code, index) => (
                    <div key={index} className="text-center" data-testid={`backup-code-${index}`}>
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Verification */}
              <div className="space-y-4">
                <h3 className="font-medium">Step 3: Verify Setup</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app to complete setup
                </p>
                
                <Form {...mfaForm}>
                  <form onSubmit={mfaForm.handleSubmit(onMfaEnable)} className="space-y-4">
                    <FormField
                      control={mfaForm.control}
                      name="totpToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Code</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="000000"
                              maxLength={6}
                              data-testid="input-totp-verification"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex space-x-3">
                      <Button 
                        type="submit" 
                        disabled={mfaEnableMutation.isPending}
                        className="flex-1"
                        data-testid="button-enable-mfa"
                      >
                        {mfaEnableMutation.isPending ? "Verifying..." : "Enable MFA"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onMfaCancel}
                        data-testid="button-cancel-mfa"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}