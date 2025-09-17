import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Loader2, CheckCircle, AlertCircle, Clock, Infinity, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useICPWallet } from "@/hooks/useICPWallet";
import { apiRequest } from "@/lib/queryClient";
import BridgeHistory from "./bridge-history";
import { z } from "zod";

// Bridge form schema
const bridgeFormSchema = z.object({
  fromNetwork: z.enum(['ethereum', 'icp'], { required_error: "Please select a source network" }),
  toNetwork: z.enum(['ethereum', 'icp'], { required_error: "Please select a destination network" }),
  fromToken: z.enum(['ETH', 'USDC', 'ckETH', 'ckUSDC'], { required_error: "Please select a token" }),
  toToken: z.enum(['ETH', 'USDC', 'ckETH', 'ckUSDC'], { required_error: "Please select a token" }),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  fromAddress: z.string().min(1, "From address is required"),
  toAddress: z.string().min(1, "To address is required"),
});

type BridgeFormData = z.infer<typeof bridgeFormSchema>;

// Bridge status component
interface BridgeStatusProps {
  status: string;
  estimatedTime?: number;
  actualTime?: number;
  confirmationsFrom?: number;
  confirmationsTo?: number;
  requiredConfirmations?: number;
}

function BridgeStatus({ status, estimatedTime, actualTime, confirmationsFrom = 0, confirmationsTo = 0, requiredConfirmations = 12 }: BridgeStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getProgressValue = () => {
    switch (status) {
      case 'pending':
        return 10;
      case 'processing':
        return 60;
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className="capitalize font-medium">{status}</span>
        {estimatedTime && status === 'processing' && (
          <span className="text-sm text-muted-foreground">
            (~{estimatedTime} min)
          </span>
        )}
      </div>
      
      <Progress value={getProgressValue()} className="h-2" />
      
      {status === 'processing' && (
        <div className="text-sm text-muted-foreground">
          <div>Source confirmations: {confirmationsFrom}/{requiredConfirmations}</div>
          {confirmationsTo > 0 && (
            <div>Destination confirmations: {confirmationsTo}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BlockchainBridge() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { wallet, isConnected } = useICPWallet();
  const queryClient = useQueryClient();

  const [selectedPair, setSelectedPair] = useState<{
    fromNetwork: string;
    toNetwork: string;
    fromToken: string;
    toToken: string;
  } | null>(null);

  const [estimation, setEstimation] = useState<any>(null);
  const [bridgeTransaction, setBridgeTransaction] = useState<any>(null);

  const form = useForm<BridgeFormData>({
    resolver: zodResolver(bridgeFormSchema),
    defaultValues: {
      fromNetwork: 'ethereum',
      toNetwork: 'icp',
      fromToken: 'ETH',
      toToken: 'ckETH',
      amount: '',
      fromAddress: '',
      toAddress: wallet?.accountId || '',
    },
  });

  // Get supported bridge pairs
  const { data: supportedPairs = [] } = useQuery<any[]>({
    queryKey: ['/api/bridge/supported-pairs'],
    enabled: !!user,
  });

  // Get supported tokens for networks
  const { data: ethereumTokens = { tokens: [] } } = useQuery<{ network: string; tokens: string[] }>({
    queryKey: ['/api/bridge/supported-tokens', 'ethereum'],
    enabled: !!user,
  });

  const { data: icpTokens = { tokens: [] } } = useQuery<{ network: string; tokens: string[] }>({
    queryKey: ['/api/bridge/supported-tokens', 'icp'],
    enabled: !!user,
  });

  // Bridge estimation mutation
  const estimationMutation = useMutation({
    mutationFn: async (data: { fromNetwork: string; toNetwork: string; fromToken: string; toToken: string; amount: string }) => {
      const response = await apiRequest("POST", "/api/bridge/estimate", data);
      return response.json();
    },
    onSuccess: (data) => {
      setEstimation(data);
    },
    onError: (error) => {
      console.error("Estimation error:", error);
      setEstimation(null);
    },
  });

  // Bridge initiation mutation
  const bridgeMutation = useMutation({
    mutationFn: async (data: BridgeFormData) => {
      const response = await apiRequest("POST", "/api/bridge/initiate", data);
      return response.json();
    },
    onSuccess: (data) => {
      setBridgeTransaction(data);
      toast({
        title: "Bridge Initiated",
        description: `Bridge transaction ${data.id} has been created.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bridge/history'] });
    },
    onError: (error) => {
      toast({
        title: "Bridge Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update estimation when form values change
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.fromNetwork && values.toNetwork && values.fromToken && values.toToken && values.amount) {
        const numAmount = parseFloat(values.amount);
        if (numAmount > 0) {
          estimationMutation.mutate({
            fromNetwork: values.fromNetwork,
            toNetwork: values.toNetwork,
            fromToken: values.fromToken,
            toToken: values.toToken,
            amount: values.amount,
          });
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Auto-populate addresses when wallet connects
  useEffect(() => {
    if (wallet?.accountId) {
      const toNetwork = form.getValues('toNetwork');
      if (toNetwork === 'icp') {
        form.setValue('toAddress', wallet.accountId);
      }
    }
  }, [wallet, form]);

  // Handle network swap
  const handleNetworkSwap = () => {
    const fromNetwork = form.getValues('fromNetwork');
    const toNetwork = form.getValues('toNetwork');
    const fromToken = form.getValues('fromToken');
    const toToken = form.getValues('toToken');

    form.setValue('fromNetwork', toNetwork);
    form.setValue('toNetwork', fromNetwork);
    form.setValue('fromToken', toToken);
    form.setValue('toToken', fromToken);
  };

  // Handle preset token pair selection
  const handleTokenPairSelect = (pair: any) => {
    form.setValue('fromNetwork', pair.from);
    form.setValue('toNetwork', pair.to);
    form.setValue('fromToken', pair.fromToken);
    form.setValue('toToken', pair.toToken);
    setSelectedPair(pair);
  };

  const onSubmit = (data: BridgeFormData) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use the bridge.",
        variant: "destructive",
      });
      return;
    }

    bridgeMutation.mutate(data);
  };

  const networkIcons = {
    ethereum: "🔷",
    icp: <Infinity className="w-5 h-5 text-primary" />
  };

  const tokenIcons = {
    ETH: "Ξ",
    USDC: "💵",
    ckETH: "⚡",
    ckUSDC: "🏦"
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Chain Fusion Bridge</h2>
          <p className="text-muted-foreground">
            Seamlessly bridge assets between Ethereum and ICP using native Chain Fusion technology
          </p>
        </div>

        <Tabs defaultValue="bridge" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bridge">Bridge Assets</TabsTrigger>
            <TabsTrigger value="history">Bridge History</TabsTrigger>
          </TabsList>

          <TabsContent value="bridge">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bridge Form */}
              <Card className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Bridge Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure your cross-chain asset transfer
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Quick Pair Selection */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {supportedPairs.slice(0, 4).map((pair: any, index: number) => (
                        <Button
                          key={index}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTokenPairSelect(pair)}
                          className="text-xs"
                          data-testid={`button-pair-${pair.fromToken}-${pair.toToken}`}
                        >
                          {pair.fromToken} → {pair.toToken}
                        </Button>
                      ))}
                    </div>

                    {/* Network and Token Selection */}
                    <div className="grid grid-cols-3 gap-4 items-end">
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="fromNetwork"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>From Network</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-from-network">
                                    <SelectValue placeholder="Select network" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="ethereum">
                                    <div className="flex items-center gap-2">
                                      <span>🔷</span> Ethereum
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="icp">
                                    <div className="flex items-center gap-2">
                                      <Infinity className="w-4 h-4" /> ICP
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fromToken"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Token</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-from-token">
                                    <SelectValue placeholder="Select token" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {form.watch('fromNetwork') === 'ethereum' ? (
                                    <>
                                      <SelectItem value="ETH">
                                        <div className="flex items-center gap-2">
                                          <span>Ξ</span> ETH
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="USDC">
                                        <div className="flex items-center gap-2">
                                          <span>💵</span> USDC
                                        </div>
                                      </SelectItem>
                                    </>
                                  ) : (
                                    <>
                                      <SelectItem value="ckETH">
                                        <div className="flex items-center gap-2">
                                          <span>⚡</span> ckETH
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="ckUSDC">
                                        <div className="flex items-center gap-2">
                                          <span>🏦</span> ckUSDC
                                        </div>
                                      </SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Swap Button */}
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleNetworkSwap}
                          className="rounded-full"
                          data-testid="button-swap-networks"
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="toNetwork"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>To Network</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-to-network">
                                    <SelectValue placeholder="Select network" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="ethereum">
                                    <div className="flex items-center gap-2">
                                      <span>🔷</span> Ethereum
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="icp">
                                    <div className="flex items-center gap-2">
                                      <Infinity className="w-4 h-4" /> ICP
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="toToken"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Token</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-to-token">
                                    <SelectValue placeholder="Select token" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {form.watch('toNetwork') === 'ethereum' ? (
                                    <>
                                      <SelectItem value="ETH">
                                        <div className="flex items-center gap-2">
                                          <span>Ξ</span> ETH
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="USDC">
                                        <div className="flex items-center gap-2">
                                          <span>💵</span> USDC
                                        </div>
                                      </SelectItem>
                                    </>
                                  ) : (
                                    <>
                                      <SelectItem value="ckETH">
                                        <div className="flex items-center gap-2">
                                          <span>⚡</span> ckETH
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="ckUSDC">
                                        <div className="flex items-center gap-2">
                                          <span>🏦</span> ckUSDC
                                        </div>
                                      </SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Amount Input */}
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="Enter amount"
                              {...field}
                              data-testid="input-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Address Fields */}
                    <FormField
                      control={form.control}
                      name="fromAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your source wallet address"
                              {...field}
                              data-testid="input-from-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="toAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Destination wallet address"
                              {...field}
                              data-testid="input-to-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={bridgeMutation.isPending || !user || !estimation}
                      data-testid="button-initiate-bridge"
                    >
                      {bridgeMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Initiating Bridge...
                        </>
                      ) : (
                        <>
                          Initiate Bridge Transfer
                          {estimation && (
                            <span className="ml-2 text-sm">
                              (~{estimation.estimatedTime} min)
                            </span>
                          )}
                        </>
                      )}
                    </Button>

                    {!user && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Please log in to use the bridge functionality.
                        </AlertDescription>
                      </Alert>
                    )}
                  </form>
                </Form>
              </Card>

              {/* Bridge Estimation and Status */}
              <div className="space-y-6">
                {/* Estimation */}
                {estimation && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Bridge Estimation</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>You will receive:</span>
                        <span className="font-medium">
                          {estimation.receiveAmount} {form.watch('toToken')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bridge fee:</span>
                        <span>{estimation.bridgeFee} {form.watch('fromToken')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Network fee:</span>
                        <span>{estimation.networkFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated time:</span>
                        <span>{estimation.estimatedTime} minutes</span>
                      </div>
                      <div className="flex justify-between font-medium pt-2 border-t">
                        <span>Total cost:</span>
                        <span>{estimation.totalCost} {form.watch('fromToken')}</span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Bridge Transaction Status */}
                {bridgeTransaction && (
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Bridge Status</h3>
                      <Badge variant="outline" data-testid="badge-bridge-status">
                        {bridgeTransaction.id.slice(0, 8)}
                      </Badge>
                    </div>
                    <BridgeStatus
                      status={bridgeTransaction.status}
                      estimatedTime={bridgeTransaction.estimatedTime}
                      actualTime={bridgeTransaction.actualTime}
                      confirmationsFrom={bridgeTransaction.confirmationsFrom}
                      confirmationsTo={bridgeTransaction.confirmationsTo}
                      requiredConfirmations={bridgeTransaction.requiredConfirmations}
                    />
                    {bridgeTransaction.txHashFrom && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="text-sm">
                          <div>Source Tx: {bridgeTransaction.txHashFrom.slice(0, 10)}...</div>
                          {bridgeTransaction.txHashTo && (
                            <div>Destination Tx: {bridgeTransaction.txHashTo.slice(0, 10)}...</div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* Bridge Help */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">How Bridge Works</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Select source and destination networks</p>
                    <p>• Choose the tokens you want to bridge</p>
                    <p>• Enter the amount and addresses</p>
                    <p>• Confirm the transaction and wait for processing</p>
                    <p>• Receive your bridged tokens on the destination network</p>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <BridgeHistory />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}