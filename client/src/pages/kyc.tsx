import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Camera, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  User as UserIcon,
  Globe,
  Briefcase,
  DollarSign,
  Eye,
  X
} from "lucide-react";

import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

// KYC form validation schema
const kycSubmissionSchema = z.object({
  documentType: z.enum(["passport", "drivers_license", "national_id"], {
    required_error: "Please select a document type"
  }),
  documentNumber: z.string().min(3, "Document number is required").max(50, "Document number too long"),
  documentCountry: z.string().min(2, "Please select your document country").max(3),
  fullName: z.string().min(2, "Full name is required").max(100, "Name too long"),
  dateOfBirth: z.string().min(10, "Date of birth is required").regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  nationality: z.string().min(2, "Nationality is required").max(100, "Nationality too long"),
  occupation: z.string().min(2, "Occupation is required").max(100, "Occupation too long"),
  sourceOfFunds: z.enum([
    "employment",
    "business_ownership",
    "investments",
    "inheritance",
    "savings", 
    "pension",
    "other"
  ], { required_error: "Please select source of funds" }),
  annualIncome: z.enum([
    "under_25k",
    "25k_50k",
    "50k_100k", 
    "100k_250k",
    "250k_500k",
    "over_500k"
  ], { required_error: "Please select annual income range" }),
  documentImage: z.any().optional(),
  documentBackImage: z.any().optional(),
  selfieImage: z.any().optional()
});

type KYCSubmissionForm = z.infer<typeof kycSubmissionSchema>;

interface KYCInformation {
  id: string;
  userId: string;
  documentType: string;
  documentCountry: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
}

const documentTypes = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "national_id", label: "National ID Card" }
];

const countries = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "AU", label: "Australia" },
  // Add more countries as needed
];

const sourceOfFundsOptions = [
  { value: "employment", label: "Employment/Salary" },
  { value: "business_ownership", label: "Business Ownership" },
  { value: "investments", label: "Investments/Trading" },
  { value: "inheritance", label: "Inheritance" },
  { value: "savings", label: "Personal Savings" },
  { value: "pension", label: "Pension/Retirement" },
  { value: "other", label: "Other" }
];

const incomeRanges = [
  { value: "under_25k", label: "Under $25,000" },
  { value: "25k_50k", label: "$25,000 - $50,000" },
  { value: "50k_100k", label: "$50,000 - $100,000" },
  { value: "100k_250k", label: "$100,000 - $250,000" },
  { value: "250k_500k", label: "$250,000 - $500,000" },
  { value: "over_500k", label: "Over $500,000" }
];

export default function KYC() {
  const { user, isLoading: userLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [documentBackPreview, setDocumentBackPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<{ type: string; url: string } | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch existing KYC submission
  const { data: kycSubmission, isLoading: kycLoading } = useQuery<any>({
    queryKey: ["/api/user/kyc/my-submission"],
    enabled: !!user
  });

  // Determine if submission exists and is editable
  const hasExisting = kycSubmission?.data !== null && kycSubmission?.data !== undefined;
  const canEdit = hasExisting && (kycSubmission?.data?.status === 'pending' || kycSubmission?.data?.status === 'rejected');
  const isVerified = hasExisting && kycSubmission?.data?.status === 'completed';

  // KYC form
  const form = useForm<KYCSubmissionForm>({
    resolver: zodResolver(kycSubmissionSchema),
    defaultValues: {
      documentType: undefined,
      documentNumber: "",
      documentCountry: "US",
      fullName: "",
      dateOfBirth: "",
      nationality: "",
      occupation: "",
      sourceOfFunds: undefined,
      annualIncome: undefined
    }
  });

  // Pre-fill form when editing existing submission
  useEffect(() => {
    if (hasExisting && kycSubmission?.data && isEditMode) {
      const data = kycSubmission.data;
      form.reset({
        documentType: data.documentType,
        documentNumber: data.documentNumber || "",
        documentCountry: data.documentCountry || "US",
        fullName: data.fullName || "",
        dateOfBirth: data.dateOfBirth || "",
        nationality: data.nationality || "",
        occupation: data.occupation || "",
        sourceOfFunds: data.sourceOfFunds,
        annualIncome: data.annualIncome
      });
    }
  }, [hasExisting, kycSubmission, isEditMode, form]);

  // KYC submission/update mutation
  const submitKycMutation = useMutation({
    mutationFn: async (data: KYCSubmissionForm) => {
      const formData = new FormData();
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && key !== 'documentImage' && key !== 'documentBackImage' && key !== 'selfieImage') {
          formData.append(key, value as string);
        }
      });
      
      // Add files if they exist
      if (data.documentImage) formData.append('documentImage', data.documentImage[0]);
      if (data.documentBackImage) formData.append('documentBackImage', data.documentBackImage[0]);
      if (data.selfieImage) formData.append('selfieImage', data.selfieImage[0]);

      // Use PATCH for updates, POST for new submissions
      const method = hasExisting ? "PATCH" : "POST";
      const endpoint = hasExisting ? "/api/user/kyc/my-submission" : "/api/user/kyc";

      const response = await fetch(endpoint, {
        method,
        body: formData,
        credentials: "include"
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "KYC submission failed");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: hasExisting ? "KYC Updated Successfully" : "KYC Submitted Successfully",
        description: hasExisting 
          ? "Your KYC information has been updated and is pending review."
          : "Your KYC information has been submitted for review. We'll notify you of the status within 2-3 business days.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/kyc/my-submission"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditMode(false);
      // Clear file previews
      setDocumentPreview(null);
      setDocumentBackPreview(null);
      setSelfiePreview(null);
    },
    onError: (error: any) => {
      toast({
        title: hasExisting ? "KYC Update Failed" : "KYC Submission Failed",
        description: error.message || "Failed to submit KYC information. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (field: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const url = e.target?.result as string;
      
      switch (field) {
        case 'documentImage':
          setDocumentPreview(url);
          break;
        case 'documentBackImage':
          setDocumentBackPreview(url);
          break;
        case 'selfieImage':
          setSelfiePreview(url);
          break;
      }
    };
    
    reader.readAsDataURL(file);
    form.setValue(field as any, files);
  };

  const removeFile = (field: string) => {
    form.setValue(field as any, undefined);
    switch (field) {
      case 'documentImage':
        setDocumentPreview(null);
        break;
      case 'documentBackImage':
        setDocumentBackPreview(null);
        break;
      case 'selfieImage':
        setSelfiePreview(null);
        break;
    }
  };

  const onSubmit = (data: KYCSubmissionForm) => {
    // For new submissions, require all documents
    if (!hasExisting) {
      if (!data.documentImage) {
        toast({
          title: "Document Required",
          description: "Please upload a clear image of your identification document.",
          variant: "destructive",
        });
        return;
      }

      if (!data.selfieImage) {
        toast({
          title: "Selfie Required",
          description: "Please upload a clear selfie holding your identification document.",
          variant: "destructive",
        });
        return;
      }
    }

    submitKycMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500", icon: Clock, label: "Under Review" },
      in_progress: { color: "bg-blue-500", icon: Clock, label: "In Progress" },
      approved: { color: "bg-green-500", icon: CheckCircle, label: "Approved" },
      completed: { color: "bg-green-500", icon: CheckCircle, label: "Completed" },
      rejected: { color: "bg-red-500", icon: AlertCircle, label: "Rejected" },
      needs_review: { color: "bg-orange-500", icon: AlertCircle, label: "Needs Review" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              You need to be logged in to access KYC verification.
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

  // If KYC exists and is verified (not editable), show status only
  if (hasExisting && !isEditMode && (isVerified || (!canEdit))) {
    const data = kycSubmission?.data;
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        
        <section className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Link href="/profile">
              <Button variant="ghost" className="mb-6" data-testid="button-back-profile">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Profile
              </Button>
            </Link>
            
            <Card className="w-full">
              <CardHeader className="text-center">
                <Shield className="h-16 w-16 mx-auto mb-4 text-primary" />
                <CardTitle className="text-2xl">KYC Verification Status</CardTitle>
                <CardDescription>
                  Your identity verification information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  {getStatusBadge(data?.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <p className="text-sm text-muted-foreground capitalize">
                      {data?.documentType?.replace('_', ' ') || 'Not specified'}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <p className="text-sm text-muted-foreground">
                      {countries.find(c => c.value === data?.documentCountry)?.label || data?.documentCountry}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Submitted</Label>
                    <p className="text-sm text-muted-foreground">
                      {data?.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  
                  {data?.reviewedAt && (
                    <div className="space-y-2">
                      <Label>Reviewed</Label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(data.reviewedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                
                {data?.status === 'pending' && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Your KYC verification is under review. We'll notify you of the status within 2-3 business days.
                    </AlertDescription>
                  </Alert>
                )}
                
                {data?.status === 'needs_review' && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Additional information may be required. Our team will contact you if needed.
                    </AlertDescription>
                  </Alert>
                )}
                
                {data?.status === 'completed' && (
                  <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-300">
                      Your identity has been successfully verified. You now have full access to all platform features.
                    </AlertDescription>
                  </Alert>
                )}
                
                {data?.reviewNotes && (
                  <div className="space-y-2">
                    <Label>Review Notes</Label>
                    <p className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      {data.reviewNotes}
                    </p>
                  </div>
                )}
                
                {data?.rejectionReason && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Rejection Reason:</strong> {data.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Edit button for pending/rejected submissions */}
                {canEdit && (
                  <Button 
                    onClick={() => setIsEditMode(true)} 
                    className="w-full"
                    data-testid="button-edit-kyc"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Submission
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/profile">
            <Button variant="ghost" className="mb-6" data-testid="button-back-profile">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Button>
          </Link>
          
          <Card className="w-full">
            <CardHeader className="text-center">
              <Shield className="h-16 w-16 mx-auto mb-4 text-primary" />
              <CardTitle className="text-2xl">KYC Verification</CardTitle>
              <CardDescription>
                Complete your identity verification to unlock all platform features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-kyc-submission">
                  
                  {/* Document Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      Document Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="documentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Document Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-document-type">
                                  <SelectValue placeholder="Select document type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {documentTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="documentCountry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Document Country</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-document-country">
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {countries.map((country) => (
                                  <SelectItem key={country.value} value={country.value}>
                                    {country.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="documentNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Document Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter document number" data-testid="input-document-number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <UserIcon className="mr-2 h-5 w-5" />
                      Personal Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name (as on document)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter full name" data-testid="input-full-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
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
                        control={form.control}
                        name="nationality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nationality</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter nationality" data-testid="input-nationality" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="occupation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Occupation</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter occupation" data-testid="input-occupation" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Financial Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <DollarSign className="mr-2 h-5 w-5" />
                      Financial Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sourceOfFunds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Source of Funds</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-source-of-funds">
                                  <SelectValue placeholder="Select source of funds" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {sourceOfFundsOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="annualIncome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Annual Income</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-annual-income">
                                  <SelectValue placeholder="Select income range" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {incomeRanges.map((range) => (
                                  <SelectItem key={range.value} value={range.value}>
                                    {range.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Document Upload */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Camera className="mr-2 h-5 w-5" />
                      Document Upload
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      
                      {/* Document Front */}
                      <div className="space-y-2">
                        <Label>Document Front *</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          {documentPreview ? (
                            <div className="relative">
                              <img src={documentPreview} alt="Document preview" className="w-full h-32 object-cover rounded" />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6"
                                onClick={() => removeFile('documentImage')}
                                data-testid="button-remove-document"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => setShowPreview({ type: 'Document Front', url: documentPreview })}
                                data-testid="button-preview-document"
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                Preview
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mb-2">Upload document front</p>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange('documentImage', e.target.files)}
                                className="hidden"
                                id="documentImage"
                                data-testid="input-document-image"
                              />
                              <Label htmlFor="documentImage" className="cursor-pointer">
                                <Button type="button" variant="outline" size="sm">
                                  Choose File
                                </Button>
                              </Label>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Document Back (Optional) */}
                      <div className="space-y-2">
                        <Label>Document Back (if applicable)</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          {documentBackPreview ? (
                            <div className="relative">
                              <img src={documentBackPreview} alt="Document back preview" className="w-full h-32 object-cover rounded" />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6"
                                onClick={() => removeFile('documentBackImage')}
                                data-testid="button-remove-document-back"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => setShowPreview({ type: 'Document Back', url: documentBackPreview })}
                                data-testid="button-preview-document-back"
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                Preview
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mb-2">Upload document back</p>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange('documentBackImage', e.target.files)}
                                className="hidden"
                                id="documentBackImage"
                                data-testid="input-document-back-image"
                              />
                              <Label htmlFor="documentBackImage" className="cursor-pointer">
                                <Button type="button" variant="outline" size="sm">
                                  Choose File
                                </Button>
                              </Label>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Selfie */}
                      <div className="space-y-2">
                        <Label>Selfie with Document *</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          {selfiePreview ? (
                            <div className="relative">
                              <img src={selfiePreview} alt="Selfie preview" className="w-full h-32 object-cover rounded" />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6"
                                onClick={() => removeFile('selfieImage')}
                                data-testid="button-remove-selfie"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => setShowPreview({ type: 'Selfie', url: selfiePreview })}
                                data-testid="button-preview-selfie"
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                Preview
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mb-2">Upload selfie holding document</p>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange('selfieImage', e.target.files)}
                                className="hidden"
                                id="selfieImage"
                                data-testid="input-selfie-image"
                              />
                              <Label htmlFor="selfieImage" className="cursor-pointer">
                                <Button type="button" variant="outline" size="sm">
                                  Choose File
                                </Button>
                              </Label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Important Information */}
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> Ensure all information matches your identification document exactly. 
                      All images should be clear, well-lit, and show all details clearly. Processing typically takes 2-3 business days.
                    </AlertDescription>
                  </Alert>
                  
                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={submitKycMutation.isPending}
                      className="min-w-[150px]"
                      data-testid="button-submit-kyc"
                    >
                      {submitKycMutation.isPending ? (
                        "Submitting..."
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Submit KYC
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </section>
      
      {/* Image Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{showPreview?.type} Preview</DialogTitle>
          </DialogHeader>
          {showPreview && (
            <div className="text-center">
              <img 
                src={showPreview.url} 
                alt={`${showPreview.type} preview`}
                className="max-w-full max-h-96 mx-auto rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}