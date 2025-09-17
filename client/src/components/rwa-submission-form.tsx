import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Image, Tag, Wallet } from "lucide-react";
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
                    <SelectItem value="jewelry">Jewelry</SelectItem>
                    <SelectItem value="art-collectibles">Art & Collectibles</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="luxury-goods">Luxury Goods</SelectItem>
                    <SelectItem value="vehicles">Vehicles</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
