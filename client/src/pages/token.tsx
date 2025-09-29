import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, ArrowUpDown, Coins, TrendingUp, Clock, Shield, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

// Initialize Stripe
const getStripePublicKey = () => {
  const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  if (!key) {
    console.error('VITE_STRIPE_PUBLIC_KEY environment variable is not set');
    return null;
  }
  if (key.startsWith('sk_')) {
    console.error('VITE_STRIPE_PUBLIC_KEY contains a secret key! Use a publishable key (pk_) instead.');
    return null;
  }
  return key;
};

const stripePromise = getStripePublicKey() ? loadStripe(getStripePublicKey()!) : null;

// RWAPAWN configuration
// Total Supply: 10 billion tokens at $0.25 per token
const RWAPAWN_EXCHANGE_RATE = 4; // $1 USD = 4 RWAPAWN tokens ($0.25 per token)
const MIN_PURCHASE_USD = 10; // $10 minimum (40 tokens)
const MAX_PURCHASE_USD = 10000; // $10,000 maximum (40,000 tokens)
const TOTAL_RWAPAWN_SUPPLY = 10000000000; // 10 billion tokens

// Payment form component
function PaymentForm({ amount, purchaseId, onSuccess, onError }: { 
  amount: number;
  purchaseId: string; 
  onSuccess: (purchaseId: string, tokenAmount: number) => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/token?payment=success`,
        },
        redirect: 'if_required'
      });

      if (error) {
        onError(error.message || "Payment failed. Please try again.");
      } else if (paymentIntent?.status === 'succeeded') {
        // Confirm payment on backend
        try {
          await apiRequest("POST", "/api/rwapawn/confirm-payment", {
            paymentIntentId: paymentIntent.id,
            purchaseId
          });
          
          const tokenAmount = amount * RWAPAWN_EXCHANGE_RATE;
          onSuccess(purchaseId, tokenAmount);
        } catch (confirmError) {
          console.error("Error confirming payment:", confirmError);
          onError("Payment processed but confirmation failed. Please contact support.");
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      onError("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={!stripe || !elements || isProcessing}
        data-testid="button-complete-payment"
      >
        {isProcessing ? (
          <>
            <Loader className="w-4 h-4 animate-spin mr-2" />
            Processing Payment...
          </>
        ) : (
          `Pay $${amount.toFixed(2)} for ${(amount * RWAPAWN_EXCHANGE_RATE).toLocaleString()} RWAPAWN`
        )}
      </Button>
    </form>
  );
}

// Buy tab component
function BuyTab() {
  const [amount, setAmount] = useState(100);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // Fetch user balance
  const { data: balanceData, refetch: refetchBalance } = useQuery({
    queryKey: ['/api/rwapawn/balance'],
    enabled: false // Only fetch when needed
  });

  const tokenAmount = amount * RWAPAWN_EXCHANGE_RATE;
  const processingFee = amount * 0.029 + 0.30; // Stripe's standard fee
  const totalCost = amount + processingFee;

  // Amount change handler moved above with payment reset logic

  const handlePaymentSuccess = (purchaseId: string, tokenAmount: number) => {
    setPaymentStatus('success');
    setStatusMessage(`Successfully purchased ${tokenAmount.toLocaleString()} RWAPAWN tokens!`);
    refetchBalance();
    toast({
      title: "Payment Successful",
      description: `You've purchased ${tokenAmount.toLocaleString()} RWAPAWN tokens.`,
    });
  };

  const handlePaymentError = (error: string) => {
    setPaymentStatus('error');
    setStatusMessage(error);
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  const initializePayment = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase RWAPAWN tokens.",
        variant: "destructive",
      });
      return;
    }

    setIsInitializingPayment(true);
    
    try {
      const response = await apiRequest("POST", "/api/rwapawn/create-payment-intent", { 
        amount: totalCost 
      });
      const data = await response.json();
      
      setClientSecret(data.clientSecret);
      setPurchaseId(data.purchaseId);
      
      toast({
        title: "Payment Initialized",
        description: "You can now complete your purchase.",
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      
      if (error.status === 401) {
        toast({
          title: "Authentication Required",
          description: "Please log in to purchase RWAPAWN tokens.",
          variant: "destructive",
        });
      } else {
        handlePaymentError("Failed to initialize payment. Please try again.");
      }
    } finally {
      setIsInitializingPayment(false);
    }
  };

  // Reset payment state when amount changes significantly
  const resetPaymentState = () => {
    setClientSecret(null);
    setPurchaseId(null);
    setPaymentStatus('idle');
    setStatusMessage('');
  };

  // Reset when amount changes
  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const newAmount = Math.min(Math.max(numValue, MIN_PURCHASE_USD), MAX_PURCHASE_USD);
    
    // Reset payment state if amount changed significantly
    if (Math.abs(newAmount - amount) > 0.01) {
      resetPaymentState();
    }
    
    setAmount(newAmount);
  };

  if (paymentStatus === 'success') {
    return (
      <Card data-testid="card-buy-success">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h3>
          <p className="text-muted-foreground mb-6">{statusMessage}</p>
          <Button 
            onClick={() => {
              setPaymentStatus('idle');
              setStatusMessage('');
              setAmount(100);
            }}
            data-testid="button-buy-more"
          >
            Buy More Tokens
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <Card data-testid="card-buy-error">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h3>
          <p className="text-muted-foreground mb-6">{statusMessage}</p>
          <Button 
            onClick={() => {
              setPaymentStatus('idle');
              setStatusMessage('');
            }}
            data-testid="button-try-again"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-buy">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Buy RWAPAWN Tokens
        </CardTitle>
        <CardDescription>
          Purchase RWAPAWN tokens with credit card
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usd-amount">USD Amount</Label>
              <Input
                id="usd-amount"
                type="number"
                min={MIN_PURCHASE_USD}
                max={MAX_PURCHASE_USD}
                step="0.01"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                data-testid="input-usd-amount"
              />
              <div className="text-xs text-muted-foreground">
                Min: ${MIN_PURCHASE_USD} • Max: ${MAX_PURCHASE_USD.toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="token-amount">RWAPAWN Tokens</Label>
              <Input
                id="token-amount"
                type="text"
                value={tokenAmount.toLocaleString()}
                readOnly
                className="bg-muted"
                data-testid="display-token-amount"
              />
              <div className="text-xs text-muted-foreground">
                Rate: 1 USD = {RWAPAWN_EXCHANGE_RATE} RWAPAWN
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Token Purchase:</span>
              <span className="font-medium">${amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Processing Fee:</span>
              <span className="font-medium">${processingFee.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total Cost:</span>
              <span data-testid="text-total-cost">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>You'll receive:</span>
              <span className="font-medium">{tokenAmount.toLocaleString()} RWAPAWN</span>
            </div>
          </div>
        </div>

        {amount >= MIN_PURCHASE_USD && amount <= MAX_PURCHASE_USD ? (
          stripePromise ? (
            clientSecret && purchaseId ? (
              <Elements 
                stripe={stripePromise} 
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe'
                  }
                }}
              >
                <PaymentForm 
                  amount={totalCost}
                  purchaseId={purchaseId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
            ) : (
              <div className="space-y-4">
                <Button 
                  onClick={initializePayment}
                  className="w-full" 
                  size="lg"
                  disabled={isInitializingPayment}
                  data-testid="button-initialize-payment"
                >
                  {isInitializingPayment ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      Initializing Payment...
                    </>
                  ) : (
                    `Initialize Payment for ${(amount * RWAPAWN_EXCHANGE_RATE).toLocaleString()} RWAPAWN`
                  )}
                </Button>
              </div>
            )
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-red-800 font-medium">Payment system unavailable</p>
                  <p className="text-red-700 text-sm">
                    Unable to load payment processor. Please refresh the page or try again later.
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              Please enter an amount between ${MIN_PURCHASE_USD} and ${MAX_PURCHASE_USD.toLocaleString()} to continue.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Token() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <Navigation />
      
      <section className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              RWAPAWN Token
            </h1>
            <p className="text-lg text-muted-foreground mb-6 px-4 sm:px-0">
              Buy, swap, and stake RWAPAWN tokens to participate in the real-world asset ecosystem
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
              <Badge variant="secondary" className="text-sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                APY up to 12%
              </Badge>
              <Badge variant="secondary" className="text-sm">
                <Shield className="w-4 h-4 mr-2" />
                Secure & Audited
              </Badge>
              <Badge variant="secondary" className="text-sm">
                <Clock className="w-4 h-4 mr-2" />
                Multiple Lock Periods
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="buy" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8" data-testid="token-tabs">
              <TabsTrigger 
                value="buy" 
                className="flex items-center gap-2" 
                data-testid="tab-buy"
              >
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Buy</span>
              </TabsTrigger>
              <TabsTrigger 
                value="swap" 
                className="flex items-center gap-2" 
                data-testid="tab-swap"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="hidden sm:inline">Swap</span>
              </TabsTrigger>
              <TabsTrigger 
                value="stake" 
                className="flex items-center gap-2" 
                data-testid="tab-stake"
              >
                <Coins className="w-4 h-4" />
                <span className="hidden sm:inline">Stake</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="buy" className="space-y-6">
              <BuyTab />
            </TabsContent>

            <TabsContent value="swap" className="space-y-6">
              <Card data-testid="card-swap">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpDown className="w-5 h-5" />
                    Swap to RWAPAWN
                  </CardTitle>
                  <CardDescription>
                    Exchange cryptocurrencies for RWAPAWN tokens
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="from-currency">From Currency</Label>
                      <Select data-testid="select-from-currency">
                        <SelectTrigger className="bg-black text-white border-input">
                          <SelectValue placeholder="Select cryptocurrency" />
                        </SelectTrigger>
                        <SelectContent className="bg-black text-white border-input">
                          <SelectItem value="ETH" className="bg-black text-white hover:bg-gray-800">Ethereum (ETH)</SelectItem>
                          <SelectItem value="BTC" className="bg-black text-white hover:bg-gray-800">Bitcoin (BTC)</SelectItem>
                          <SelectItem value="ICP" className="bg-black text-white hover:bg-gray-800">Internet Computer (ICP)</SelectItem>
                          <SelectItem value="USDC" className="bg-black text-white hover:bg-gray-800">USD Coin (USDC)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="from-amount">From Amount</Label>
                        <Input
                          id="from-amount"
                          type="number"
                          placeholder="0.1"
                          step="0.000001"
                          data-testid="input-from-amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="to-amount">RWAPAWN Tokens</Label>
                        <Input
                          id="to-amount"
                          type="number"
                          placeholder="0"
                          readOnly
                          className="bg-muted"
                          data-testid="display-to-amount"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Exchange Rate:</span>
                        <span className="font-medium" data-testid="text-swap-rate">1 ETH = 25,000 RWAPAWN</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Network Fee:</span>
                        <span className="font-medium">~$15</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Slippage:</span>
                        <span className="font-medium">0.5%</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg"
                    data-testid="button-swap-tokens"
                  >
                    Swap Tokens
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stake" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card data-testid="card-stake">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coins className="w-5 h-5" />
                      Stake RWAPAWN
                    </CardTitle>
                    <CardDescription>
                      Lock your tokens to earn rewards and participate in governance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="stake-amount">Stake Amount</Label>
                        <Input
                          id="stake-amount"
                          type="number"
                          placeholder="1000"
                          data-testid="input-stake-amount"
                        />
                        <div className="text-sm text-muted-foreground">
                          Available: 5,000 RWAPAWN
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="staking-tier">Staking Tier</Label>
                        <Select data-testid="select-staking-tier">
                          <SelectTrigger className="bg-black text-white border-input">
                            <SelectValue placeholder="Select lock period" />
                          </SelectTrigger>
                          <SelectContent className="bg-black text-white border-input">
                            <SelectItem value="1" className="bg-black text-white hover:bg-gray-800">Tier 1 - 30 days (3% APY)</SelectItem>
                            <SelectItem value="2" className="bg-black text-white hover:bg-gray-800">Tier 2 - 60 days (6% APY)</SelectItem>
                            <SelectItem value="3" className="bg-black text-white hover:bg-gray-800">Tier 3 - 90 days (9% APY)</SelectItem>
                            <SelectItem value="4" className="bg-black text-white hover:bg-gray-800">Tier 4 - 180 days (12% APY)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Lock Period:</span>
                          <span className="font-medium">30 days</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>APY:</span>
                          <span className="font-medium text-green-600">3%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Estimated Rewards:</span>
                          <span className="font-medium" data-testid="text-estimated-rewards">~8.22 RWAPAWN</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Unlock Date:</span>
                          <span className="font-medium">Oct 18, 2025</span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      size="lg"
                      data-testid="button-stake-tokens"
                    >
                      Stake Tokens
                    </Button>
                  </CardContent>
                </Card>

                <Card data-testid="card-staking-rewards">
                  <CardHeader>
                    <CardTitle>Your Stakes</CardTitle>
                    <CardDescription>
                      Active staking positions and rewards
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center text-muted-foreground">
                        No active stakes yet. Start staking to earn rewards!
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Total Staked:</span>
                          <span className="font-medium" data-testid="text-total-staked">0 RWAPAWN</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total Rewards:</span>
                          <span className="font-medium text-green-600" data-testid="text-total-rewards">0 RWAPAWN</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Available Balance:</span>
                          <span className="font-medium" data-testid="text-available-balance">5,000 RWAPAWN</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Tokenomics Section */}
          <section className="mt-16 space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                RWAPAWN Tokenomics
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Comprehensive token economics designed for sustainable growth and long-term value creation
              </p>
            </div>

            {/* Key Token Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-primary mb-2">10B</div>
                  <div className="text-sm text-muted-foreground">Total Supply</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-primary mb-2">$0.25</div>
                  <div className="text-sm text-muted-foreground">Token Price (USD)</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-primary mb-2">$2.5B</div>
                  <div className="text-sm text-muted-foreground">Max Market Cap</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-primary mb-2">4:1</div>
                  <div className="text-sm text-muted-foreground">USD Exchange Rate</div>
                </CardContent>
              </Card>
            </div>

            {/* Token Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Token Distribution
                  </CardTitle>
                  <CardDescription>
                    Fair and sustainable token allocation across all stakeholders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">Public Sale</span>
                      <div className="text-right">
                        <div className="font-bold">40%</div>
                        <div className="text-xs text-muted-foreground">4B tokens</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">Platform Treasury</span>
                      <div className="text-right">
                        <div className="font-bold">25%</div>
                        <div className="text-xs text-muted-foreground">2.5B tokens</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">Team & Advisors</span>
                      <div className="text-right">
                        <div className="font-bold">15%</div>
                        <div className="text-xs text-muted-foreground">1.5B tokens</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">Staking Rewards</span>
                      <div className="text-right">
                        <div className="font-bold">10%</div>
                        <div className="text-xs text-muted-foreground">1B tokens</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">Liquidity & Partnerships</span>
                      <div className="text-right">
                        <div className="font-bold">10%</div>
                        <div className="text-xs text-muted-foreground">1B tokens</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    Utility & Benefits
                  </CardTitle>
                  <CardDescription>
                    Multiple use cases providing real value to token holders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="font-medium mb-1">Platform Fee Discounts</div>
                      <div className="text-sm text-muted-foreground">
                        Pay platform fees with RWAPAWN tokens for up to 25% discount
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="font-medium mb-1">Governance Rights</div>
                      <div className="text-sm text-muted-foreground">
                        Vote on platform proposals and major decisions
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="font-medium mb-1">Staking Rewards</div>
                      <div className="text-sm text-muted-foreground">
                        Earn up to 12% APY by staking tokens with lock periods
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="font-medium mb-1">Premium Features</div>
                      <div className="text-sm text-muted-foreground">
                        Access exclusive features like priority support and advanced analytics
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="font-medium mb-1">Loan Interest Reduction</div>
                      <div className="text-sm text-muted-foreground">
                        Reduce loan interest rates by holding and staking tokens
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vesting Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Vesting Schedule
                </CardTitle>
                <CardDescription>
                  Responsible token release schedule ensuring long-term project stability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-2">Immediate</div>
                    <div className="font-medium mb-1">Public Sale</div>
                    <div className="text-sm text-muted-foreground">
                      40% of tokens available immediately upon purchase
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 mb-2">24 Months</div>
                    <div className="font-medium mb-1">Team & Advisors</div>
                    <div className="text-sm text-muted-foreground">
                      15% vested over 24 months with 6-month cliff
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-2">60 Months</div>
                    <div className="font-medium mb-1">Staking Rewards</div>
                    <div className="text-sm text-muted-foreground">
                      10% released gradually over 5 years for staking incentives
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Token Burn Mechanism */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Deflationary Mechanism
                </CardTitle>
                <CardDescription>
                  Built-in token burn mechanisms to create scarcity and value appreciation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Quarterly Token Burns</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        • <strong>5% of platform revenue</strong> used to buy back and burn tokens quarterly
                      </p>
                      <p className="text-muted-foreground">
                        • <strong>Expired loan penalties</strong> contribute to burn pool
                      </p>
                      <p className="text-muted-foreground">
                        • <strong>Marketplace transaction fees</strong> partially burned
                      </p>
                      <p className="text-muted-foreground">
                        • <strong>Target burn rate:</strong> 2-3% annually of circulating supply
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Value Accrual Model</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        • <strong>Revenue sharing:</strong> Platform profits distributed to long-term stakers
                      </p>
                      <p className="text-muted-foreground">
                        • <strong>Fee deflation:</strong> As supply decreases, token value increases
                      </p>
                      <p className="text-muted-foreground">
                        • <strong>Ecosystem growth:</strong> More assets pawned = higher token demand
                      </p>
                      <p className="text-muted-foreground">
                        • <strong>Cross-chain expansion:</strong> Multi-blockchain presence drives adoption
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </section>

      <Footer />
    </div>
  );
}