import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Image, Tag, Wallet, DollarSign, TrendingUp, Shield, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { PricingDisplay } from "./pricing-display";
import DocumentUpload from "./document-upload";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertRwaSubmissionSchema } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useICPWallet } from "@/hooks/useICPWallet";
import { z } from "zod";

const formSchema = insertRwaSubmissionSchema.extend({
  assetName: z.string().min(1, "Asset name is required"),
  category: z.string().min(1, "Category is required"),
  estimatedValue: z.string().min(1, "Estimated value is required"),
  walletAddress: z.string().min(1, "Wallet address is required"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type DocumentType = 'coa' | 'nft_certificate' | 'insurance' | 'appraisal' | 'photo' | 'video' | 'other';

interface UploadedDocument {
  id: string;
  originalFileName: string;
  documentType: DocumentType;
  fileSize: number;
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  uploadProgress?: number;
  storageUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export default function RwaSubmissionForm() {
  // Document upload state
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  
  // File upload state (for compatibility with unused FileUploadArea component)
  const [files, setFiles] = useState<Record<string, File | null>>({});

  // Pricing state
  const [pricingData, setPricingData] = useState<any>(null);
  const [showPricingHelp, setShowPricingHelp] = useState(false);
  const [assetSpecifications, setAssetSpecifications] = useState<Record<string, any>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { wallet, isConnected, sendTransaction } = useICPWallet();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetName: "",
      category: "",
      estimatedValue: "",
      walletAddress: wallet?.principalId || "",
      description: "",
    },
  });

  // Update wallet address when wallet connects
  useEffect(() => {
    if (wallet?.principalId) {
      form.setValue('walletAddress', wallet.principalId);
    }
  }, [wallet?.principalId, form]);

  // Generate pricing query based on form data
  const generatePricingQuery = () => {
    const category = form.watch('category');
    const assetName = form.watch('assetName')?.toLowerCase() || '';
    
    if (!category) return null;

    // Map form categories to pricing categories
    const categoryMapping = {
      'jewelry': 'jewelry',
      'art-collectibles': 'collectibles',
      'electronics': 'electronics',
      'luxury-goods': 'watches', // Assume luxury goods are primarily watches
      'vehicles': 'collectibles' // Treat vehicles as collectibles for now
    };

    const pricingCategory = categoryMapping[category as keyof typeof categoryMapping];
    if (!pricingCategory) return null;

    // Build query with specifications based on category
    const query: any = {
      category: pricingCategory,
      specifications: { ...assetSpecifications }
    };

    // Add category-specific logic
    if (pricingCategory === 'jewelry') {
      // Try to extract metal type from asset name
      if (assetName.includes('gold')) {
        query.specifications.metal = 'gold';
        query.specifications.purity = assetSpecifications.purity || '14k';
      } else if (assetName.includes('silver')) {
        query.specifications.metal = 'silver';
        query.specifications.purity = assetSpecifications.purity || 'sterling';
      }
      query.specifications.weight = assetSpecifications.weight || 10; // Default 10g
      
      // Determine item type from asset name
      if (assetName.includes('ring')) query.itemType = 'ring';
      else if (assetName.includes('necklace')) query.itemType = 'necklace';
      else if (assetName.includes('earring')) query.itemType = 'earrings';
      else if (assetName.includes('bracelet')) query.itemType = 'bracelet';
      else if (assetName.includes('watch')) query.itemType = 'watch';
      else query.itemType = 'ring'; // Default
    } else if (pricingCategory === 'electronics') {
      // Try to extract brand and type from asset name
      const brands = ['apple', 'samsung', 'google', 'dell', 'hp', 'lenovo', 'sony'];
      const foundBrand = brands.find(brand => assetName.includes(brand));
      if (foundBrand) query.specifications.brand = foundBrand;
      
      // Determine device type
      if (assetName.includes('iphone') || assetName.includes('phone')) {
        query.itemType = 'smartphone';
      } else if (assetName.includes('laptop') || assetName.includes('macbook')) {
        query.itemType = 'laptop';
      } else if (assetName.includes('ipad') || assetName.includes('tablet')) {
        query.itemType = 'tablet';
      } else if (assetName.includes('tv')) {
        query.itemType = 'tv';
      } else {
        query.itemType = 'electronics'; // Generic
      }
      
      query.specifications.age_years = assetSpecifications.age_years || 1;
      query.specifications.condition = assetSpecifications.condition || 'good';
    } else if (pricingCategory === 'watches') {
      // Extract watch brand from asset name
      const watchBrands = ['rolex', 'omega', 'tag heuer', 'seiko', 'casio', 'citizen'];
      const foundBrand = watchBrands.find(brand => assetName.includes(brand));
      if (foundBrand) query.specifications.brand = foundBrand;
      
      query.specifications.year = assetSpecifications.year || new Date().getFullYear() - 1;
      query.specifications.condition = assetSpecifications.condition || 'good';
    }

    return query;
  };

  // Handle pricing data update
  const handlePricingUpdate = (pricing: any) => {
    setPricingData(pricing);
    
    // Optionally auto-update estimated value if user hasn't manually set it
    const currentEstimatedValue = form.watch('estimatedValue');
    if (!currentEstimatedValue && pricing?.median) {
      const suggestedValue = Math.round(pricing.median * 0.8); // 80% of market value for loan
      form.setValue('estimatedValue', suggestedValue.toString());
      
      toast({
        title: "Pricing Estimate Updated",
        description: `Suggested value: $${suggestedValue.toLocaleString()} (80% of market estimate)`,
      });
    }
  };

  // Update asset specifications
  const updateSpecification = (key: string, value: any) => {
    setAssetSpecifications(prev => ({ ...prev, [key]: value }));
  };

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!isAuthenticated || !user) {
        throw new Error('Please log in to submit an RWA');
      }
      
      // Check KYC verification requirement
      if (user.kycStatus !== "completed") {
        throw new Error('KYC verification is required before submitting assets for pawning. Please complete your identity verification in your profile.');
      }
      
      if (!isConnected || !wallet) {
        throw new Error('Please connect your ICP wallet to submit an RWA');
      }

      // Check if user has sufficient balance for fee
      if (wallet.balance < 2) {
        throw new Error('Insufficient ICP balance. You need at least 2 ICP to cover the pawning fee.');
      }

      // Create submission first (without documents)
      const submissionData = {
        ...data,
        estimatedValue: parseFloat(data.estimatedValue).toFixed(2),
        walletAddress: wallet.principalId,
        userId: user.id,
        status: "pending",
      };

      const response = await apiRequest("POST", "/api/rwa-submissions", submissionData);
      const responseData = await response.json();
      
      return responseData;
    },
    onSuccess: (data: any) => {
      setSubmissionId(data.id);
      toast({
        title: "Submission Created Successfully",
        description: "Please upload the required documents to complete your submission.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/rwa-submissions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to create submission",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (type: string, file: File | null) => {
    setFiles((prev: Record<string, File | null>) => ({ ...prev, [type]: file }));
  };

  const FileUploadArea = ({ 
    type, 
    icon: Icon, 
    title, 
    description 
  }: { 
    type: string;
    icon: any;
    title: string;
    description: string;
  }) => (
    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
      <Icon className="text-2xl text-muted-foreground mb-2 mx-auto" size={32} />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>
      <Input
        type="file"
        onChange={(e) => handleFileChange(type, e.target.files?.[0] || null)}
        className="hidden"
        id={`file-${String(type)}`}
        data-testid={`input-file-${String(type)}`}
      />
      <Label
        htmlFor={`file-${String(type)}`}
        className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
      >
        <Upload className="mr-2 h-4 w-4" />
        {files[String(type)] ? files[String(type)]!.name : "Choose File"}
      </Label>
    </div>
  );

  return (
    <Card className="bg-card border border-border p-4 sm:p-6 lg:p-8 glass-effect">
      <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center">
        <Upload className="mr-2 sm:mr-3 text-primary h-5 w-5 sm:h-6 sm:w-6" />
        Submit RWA for Pawning
      </h3>

      {/* KYC Status Indicator */}
      {isAuthenticated && (
        <div className="mb-4 sm:mb-6">
          {user?.kycStatus === "completed" ? (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                <span className="font-medium">✓ KYC Verified</span> - You can pawn assets
              </AlertDescription>
            </Alert>
          ) : user?.kycStatus === "pending" ? (
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                <span className="font-medium">⏳ KYC Under Review</span> - Please wait for verification to complete before pawning assets
              </AlertDescription>
            </Alert>
          ) : user?.kycStatus === "rejected" ? (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                <span className="font-medium">❌ KYC Rejected</span> - Please update your verification in your profile before pawning assets
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                <span className="font-medium">🔐 KYC Required</span> - Complete identity verification in your <a href="/profile" className="underline font-medium">profile</a> before pawning assets
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))} className="space-y-4 sm:space-y-6">
          <FormField
            control={form.control}
            name="assetName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter asset name"
                    {...field}
                    data-testid="input-asset-name"
                    className="h-11 sm:h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-category" className="h-11 sm:h-10">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="jewelry">💎 Jewelry</SelectItem>
                    <SelectItem value="art-collectibles">🎨 Art & Collectibles</SelectItem>
                    <SelectItem value="electronics">📱 Electronics</SelectItem>
                    <SelectItem value="luxury-goods">⌚ Luxury Goods</SelectItem>
                    <SelectItem value="vehicles">🚗 Vehicles</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Asset Specifications Section - Dynamic based on category */}
          {form.watch('category') && (
            <Card className="p-4 bg-muted/20 border-dashed" data-testid="card-asset-specifications">
              <h4 className="text-sm font-semibold mb-3 flex items-center">
                <Tag className="mr-2 h-4 w-4" />
                Asset Specifications
              </h4>
              
              {form.watch('category') === 'jewelry' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="weight" className="text-sm">Weight (grams)</Label>
                    <Input
                      id="weight"
                      type="number"
                      placeholder="10"
                      value={assetSpecifications.weight || ''}
                      onChange={(e) => updateSpecification('weight', e.target.value)}
                      data-testid="input-spec-weight"
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="purity" className="text-sm">Purity</Label>
                    <Select
                      value={assetSpecifications.purity || ''}
                      onValueChange={(value) => updateSpecification('purity', value)}
                    >
                      <SelectTrigger data-testid="select-spec-purity" className="h-11 sm:h-10">
                        <SelectValue placeholder="Select purity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10k">10k Gold</SelectItem>
                        <SelectItem value="14k">14k Gold</SelectItem>
                        <SelectItem value="18k">18k Gold</SelectItem>
                        <SelectItem value="24k">24k Gold</SelectItem>
                        <SelectItem value="sterling">Sterling Silver</SelectItem>
                        <SelectItem value="950">950 Platinum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              {form.watch('category') === 'electronics' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="brand" className="text-sm">Brand</Label>
                    <Input
                      id="brand"
                      placeholder="Apple, Samsung, etc."
                      value={assetSpecifications.brand || ''}
                      onChange={(e) => updateSpecification('brand', e.target.value)}
                      data-testid="input-spec-brand"
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="age" className="text-sm">Age (years)</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="1"
                      value={assetSpecifications.age_years || ''}
                      onChange={(e) => updateSpecification('age_years', e.target.value)}
                      data-testid="input-spec-age"
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="condition" className="text-sm">Condition</Label>
                    <Select
                      value={assetSpecifications.condition || ''}
                      onValueChange={(value) => updateSpecification('condition', value)}
                    >
                      <SelectTrigger data-testid="select-spec-condition" className="h-11 sm:h-10">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              {form.watch('category') === 'luxury-goods' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="watchBrand" className="text-sm">Brand</Label>
                    <Input
                      id="watchBrand"
                      placeholder="Rolex, Omega, etc."
                      value={assetSpecifications.brand || ''}
                      onChange={(e) => updateSpecification('brand', e.target.value)}
                      data-testid="input-spec-watch-brand"
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="watchYear" className="text-sm">Year</Label>
                    <Input
                      id="watchYear"
                      type="number"
                      placeholder="2020"
                      value={assetSpecifications.year || ''}
                      onChange={(e) => updateSpecification('year', e.target.value)}
                      data-testid="input-spec-watch-year"
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="watchCondition" className="text-sm">Condition</Label>
                    <Select
                      value={assetSpecifications.condition || ''}
                      onValueChange={(value) => updateSpecification('condition', value)}
                    >
                      <SelectTrigger data-testid="select-spec-watch-condition" className="h-11 sm:h-10">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Real-time Pricing Display */}
          {generatePricingQuery() && (
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950 border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-semibold mb-3 flex items-center">
                <TrendingUp className="mr-2 h-4 w-4 text-green-600" />
                Live Market Pricing
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPricingHelp(!showPricingHelp)}
                  className="ml-auto"
                  data-testid="button-pricing-help"
                >
                  ?
                </Button>
              </h4>
              
              {showPricingHelp && (
                <div className="text-xs text-muted-foreground mb-3 p-2 bg-muted/50 rounded">
                  This estimate is based on current market data and asset specifications. 
                  The suggested loan value is typically 70-80% of market value.
                </div>
              )}
              
              <PricingDisplay
                query={generatePricingQuery()!}
                onPriceUpdate={handlePricingUpdate}
                compact={false}
                className="mb-0"
              />
              
              {pricingData && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Suggested Loan Value (80%):</span>
                    <span className="font-semibold text-green-600" data-testid="text-suggested-loan-value">
                      ${Math.round(pricingData.median * 0.8).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span>Market Confidence:</span>
                    <span className={`font-semibold ${pricingData.confidence >= 0.8 ? 'text-green-600' : pricingData.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {Math.round(pricingData.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </Card>
          )}

          <FormField
            control={form.control}
            name="estimatedValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Value (USD)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0.00"
                    {...field}
                    data-testid="input-estimated-value"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="walletAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ICP Wallet Address</FormLabel>
                <FormControl>
                  <div className="flex space-x-2">
                    <Input
                      placeholder={isConnected ? "Connected wallet will be used" : "Connect your ICP wallet"}
                      className="font-mono text-sm"
                      {...field}
                      readOnly={isConnected}
                      disabled={isConnected}
                      data-testid="input-wallet-address"
                    />
                    {isConnected && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        data-testid="button-wallet-connected"
                      >
                        <Wallet className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {isConnected 
                    ? `Using connected wallet: ${wallet?.walletType === 'plug' ? 'Plug' : 'Internet Identity'}` 
                    : "Please connect your ICP wallet to auto-fill this field"}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide additional details about your asset"
                    {...field}
                    data-testid="textarea-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Document Upload Section */}
          {submissionId ? (
            <div className="space-y-4">
              <h4 className="font-medium">Required Documents</h4>
              <DocumentUpload
                submissionId={submissionId}
                requiredDocuments={['coa', 'nft_certificate', 'photo']}
                onDocumentsChange={setUploadedDocuments}
                maxFiles={5}
                maxFileSize={50 * 1024 * 1024} // 50MB
              />
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-medium">Document Upload</h4>
              <Card className="bg-muted/50 p-6 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Complete the asset information above, then submit to enable document upload
                </p>
              </Card>
            </div>
          )}

          {/* Fee Information */}
          <Card className="bg-muted p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Pawning Fee:</span>
              <span className="font-medium">2 ICP</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Your Balance:</span>
              <span className={`font-medium ${wallet && wallet.balance < 2 ? 'text-destructive' : 'text-foreground'}`}>
                {wallet ? `${wallet.balance.toFixed(4)} ICP` : 'Not connected'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Loan Period:</span>
              <span>90 days</span>
            </div>
          </Card>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={submitMutation.isPending || !isAuthenticated || !isConnected || (wallet ? wallet.balance < 2 : false) || user?.kycStatus !== "completed"}
            data-testid="button-submit-rwa"
          >
            {submitMutation.isPending 
              ? "Submitting..." 
              : !isAuthenticated 
              ? "Please Login First" 
              : user?.kycStatus !== "completed"
              ? "Complete KYC Verification First"
              : !isConnected 
              ? "Connect ICP Wallet First" 
              : wallet && wallet.balance < 2 
              ? "Insufficient ICP Balance" 
              : "Submit for Pawning (2 ICP)"}
          </Button>
        </form>
      </Form>
    </Card>
  );
}
