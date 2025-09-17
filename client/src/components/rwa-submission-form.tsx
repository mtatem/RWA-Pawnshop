import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Image, Tag, Wallet, DollarSign, TrendingUp } from "lucide-react";
import { PricingDisplay } from "./pricing-display";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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

export default function RwaSubmissionForm() {
  const [files, setFiles] = useState({
    coa: null as File | null,
    nft: null as File | null,
    physicalDocs: null as File | null,
  });

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
      
      if (!isConnected || !wallet) {
        throw new Error('Please connect your ICP wallet to submit an RWA');
      }

      // Check if user has sufficient balance for fee
      if (wallet.balance < 2) {
        throw new Error('Insufficient ICP balance. You need at least 2 ICP to cover the pawning fee.');
      }

      // In production, you would upload files first and get URLs
      const submissionData = {
        ...data,
        estimatedValue: parseFloat(data.estimatedValue).toFixed(2),
        coaUrl: files.coa ? `uploads/coa_${Date.now()}.pdf` : null,
        nftUrl: files.nft ? `uploads/nft_${Date.now()}.json` : null,
        physicalDocsUrl: files.physicalDocs ? `uploads/docs_${Date.now()}.pdf` : null,
        walletAddress: wallet.principalId, // Use connected wallet's principal ID
      };

      const response = await apiRequest("POST", "/api/rwa-submissions", submissionData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Submission Successful",
        description: `Your RWA submission has been created. Fee of 2 ICP has been charged.`,
      });
      form.reset();
      setFiles({ coa: null, nft: null, physicalDocs: null });
      if (wallet?.principalId) {
        form.setValue('walletAddress', wallet.principalId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/rwa-submissions"] });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (type: keyof typeof files, file: File | null) => {
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const FileUploadArea = ({ 
    type, 
    icon: Icon, 
    title, 
    description 
  }: { 
    type: keyof typeof files;
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
        id={`file-${type}`}
        data-testid={`input-file-${type}`}
      />
      <Label
        htmlFor={`file-${type}`}
        className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
      >
        <Upload className="mr-2 h-4 w-4" />
        {files[type] ? files[type]!.name : "Choose File"}
      </Label>
    </div>
  );

  return (
    <Card className="bg-card border border-border p-8 glass-effect">
      <h3 className="text-xl font-semibold mb-6 flex items-center">
        <Upload className="mr-3 text-primary" />
        Submit RWA for Pawning
      </h3>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))} className="space-y-6">
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
                    <SelectTrigger data-testid="select-category">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weight">Weight (grams)</Label>
                    <Input
                      id="weight"
                      type="number"
                      placeholder="10"
                      value={assetSpecifications.weight || ''}
                      onChange={(e) => updateSpecification('weight', e.target.value)}
                      data-testid="input-spec-weight"
                    />
                  </div>
                  <div>
                    <Label htmlFor="purity">Purity</Label>
                    <Select
                      value={assetSpecifications.purity || ''}
                      onValueChange={(value) => updateSpecification('purity', value)}
                    >
                      <SelectTrigger data-testid="select-spec-purity">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      placeholder="Apple, Samsung, etc."
                      value={assetSpecifications.brand || ''}
                      onChange={(e) => updateSpecification('brand', e.target.value)}
                      data-testid="input-spec-brand"
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Age (years)</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="1"
                      value={assetSpecifications.age_years || ''}
                      onChange={(e) => updateSpecification('age_years', e.target.value)}
                      data-testid="input-spec-age"
                    />
                  </div>
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      value={assetSpecifications.condition || ''}
                      onValueChange={(value) => updateSpecification('condition', value)}
                    >
                      <SelectTrigger data-testid="select-spec-condition">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="watchBrand">Brand</Label>
                    <Input
                      id="watchBrand"
                      placeholder="Rolex, Omega, etc."
                      value={assetSpecifications.brand || ''}
                      onChange={(e) => updateSpecification('brand', e.target.value)}
                      data-testid="input-spec-watch-brand"
                    />
                  </div>
                  <div>
                    <Label htmlFor="watchYear">Year</Label>
                    <Input
                      id="watchYear"
                      type="number"
                      placeholder="2020"
                      value={assetSpecifications.year || ''}
                      onChange={(e) => updateSpecification('year', e.target.value)}
                      data-testid="input-spec-watch-year"
                    />
                  </div>
                  <div>
                    <Label htmlFor="watchCondition">Condition</Label>
                    <Select
                      value={assetSpecifications.condition || ''}
                      onValueChange={(value) => updateSpecification('condition', value)}
                    >
                      <SelectTrigger data-testid="select-spec-watch-condition">
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

          {/* Required Documents */}
          <div className="space-y-4">
            <h4 className="font-medium">Required Documents (All 3 Required)</h4>

            <FileUploadArea
              type="coa"
              icon={Tag}
              title="Tag of Authenticity (COA)"
              description="Click to upload or drag and drop"
            />

            <FileUploadArea
              type="nft"
              icon={Image}
              title="NFT Representation"
              description="Upload NFT metadata or provide contract address"
            />

            <FileUploadArea
              type="physicalDocs"
              icon={FileText}
              title="Physical Asset Documentation"
              description="Photos, receipts, appraisals, etc."
            />
          </div>

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
            disabled={submitMutation.isPending || !isAuthenticated || !isConnected || (wallet ? wallet.balance < 2 : false)}
            data-testid="button-submit-rwa"
          >
            {submitMutation.isPending 
              ? "Submitting..." 
              : !isAuthenticated 
              ? "Please Login First" 
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
