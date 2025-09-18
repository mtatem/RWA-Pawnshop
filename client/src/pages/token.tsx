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
import { CreditCard, ArrowUpDown, Coins, TrendingUp, Clock, Shield } from "lucide-react";

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
              <Card data-testid="card-buy">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Buy RWAPAWN Tokens
                  </CardTitle>
                  <CardDescription>
                    Purchase RWAPAWN tokens with credit card or cryptocurrency
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="buy-method">Payment Method</Label>
                      <Select data-testid="select-payment-method">
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="crypto">Cryptocurrency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="usd-amount">USD Amount</Label>
                        <Input
                          id="usd-amount"
                          type="number"
                          placeholder="100.00"
                          data-testid="input-usd-amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="token-amount">RWAPAWN Tokens</Label>
                        <Input
                          id="token-amount"
                          type="number"
                          placeholder="1000"
                          readOnly
                          className="bg-muted"
                          data-testid="display-token-amount"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Exchange Rate:</span>
                        <span className="font-medium">1 USD = 10 RWAPAWN</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Processing Fee:</span>
                        <span className="font-medium">2.5%</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Total Cost:</span>
                        <span data-testid="text-total-cost">$102.50</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg"
                    data-testid="button-purchase-tokens"
                  >
                    Purchase Tokens
                  </Button>
                </CardContent>
              </Card>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select cryptocurrency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                          <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                          <SelectItem value="ICP">Internet Computer (ICP)</SelectItem>
                          <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
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
                          <SelectTrigger>
                            <SelectValue placeholder="Select lock period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Tier 1 - 30 days (3% APY)</SelectItem>
                            <SelectItem value="2">Tier 2 - 60 days (6% APY)</SelectItem>
                            <SelectItem value="3">Tier 3 - 90 days (9% APY)</SelectItem>
                            <SelectItem value="4">Tier 4 - 180 days (12% APY)</SelectItem>
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
        </div>
      </section>

      <Footer />
    </div>
  );
}