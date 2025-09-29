import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useICPWallet } from "@/hooks/useICPWallet";
import { apiRequest } from "@/lib/queryClient";
import type { MarketplaceAsset } from "@shared/schema";
import luxuryHouseImage from "@assets/generated_images/Luxury_modern_house_exterior_4597f8e9.png";
import diamondNecklaceImage from "@assets/generated_images/Diamond_tennis_necklace_display_ec61d518.png";
import luxuryCarImage from "@assets/generated_images/Black_luxury_sports_car_d4206fb8.png";


export default function AssetMarketplace() {
  const [filters, setFilters] = useState({
    category: "all",
    sortBy: "",
    minPrice: "",
    maxPrice: "",
  });
  
  const [bidAmount, setBidAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<MarketplaceAsset | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { wallet, sendTransaction } = useICPWallet();

  // Demo marketplace assets
  const demoAssets: MarketplaceAsset[] = [
    {
      id: "demo-real-estate-1",
      loanId: "loan-demo-1",
      assetName: "Modern Luxury Villa in Beverly Hills",
      category: "Real Estate",
      originalValue: "2850000.00",
      startingPrice: "1995000.00",
      currentBid: "2150000.00",
      highestBidder: "user-demo-1",
      imageUrl: luxuryHouseImage,
      description: "Stunning contemporary 4-bedroom, 5-bathroom villa featuring open-concept living spaces, floor-to-ceiling windows, gourmet kitchen with premium appliances, infinity pool, and breathtaking city views. Located in the prestigious Beverly Hills area with 24/7 security.",
      daysExpired: 7,
      status: "available",
      soldAt: null,
      soldPrice: null,
      createdAt: new Date("2024-12-15T00:00:00.000Z"),
      updatedAt: new Date("2024-12-22T00:00:00.000Z"),
    },
    {
      id: "demo-jewelry-1", 
      loanId: "loan-demo-2",
      assetName: "18K White Gold Diamond Tennis Necklace",
      category: "Jewelry",
      originalValue: "125000.00",
      startingPrice: "87500.00",
      currentBid: "95000.00",
      highestBidder: "user-demo-2",
      imageUrl: diamondNecklaceImage,
      description: "Exquisite tennis necklace featuring 15 carats of premium VS1 clarity diamonds set in 18K white gold. Each diamond is expertly cut and hand-selected for maximum brilliance. Includes GIA certification and original Cartier presentation box.",
      daysExpired: 3,
      status: "available",
      soldAt: null,
      soldPrice: null,
      createdAt: new Date("2024-12-18T00:00:00.000Z"),
      updatedAt: new Date("2024-12-21T00:00:00.000Z"),
    },
    {
      id: "demo-automotive-1",
      loanId: "loan-demo-3",
      assetName: "2023 Porsche 911 Turbo S Coupe",
      category: "Automotive", 
      originalValue: "285000.00",
      startingPrice: "199500.00",
      currentBid: "215000.00",
      highestBidder: "user-demo-3",
      imageUrl: luxuryCarImage,
      description: "Pristine 2023 Porsche 911 Turbo S in Jet Black Metallic with only 1,200 miles. Features twin-turbo 3.8L flat-six engine producing 640 HP, PDK transmission, sport chrono package, premium leather interior, and ceramic composite brakes. Includes full manufacturer warranty.",
      daysExpired: 12,
      status: "available",
      soldAt: null,
      soldPrice: null,
      createdAt: new Date("2024-12-10T00:00:00.000Z"),
      updatedAt: new Date("2024-12-22T00:00:00.000Z"),
    }
  ];

  // Fetch real marketplace assets from API
  const { data: apiAssets = [], isLoading } = useQuery<MarketplaceAsset[]>({
    queryKey: ["/api/marketplace/assets"],
  });

  // Combine demo assets with API assets
  const allAssets = useMemo(() => {
    return [...demoAssets, ...apiAssets];
  }, [apiAssets]);

  // Apply filters to the combined assets
  const filteredAssets = useMemo(() => {
    let filtered = [...allAssets];

    // Filter by category
    if (filters.category !== "all") {
      filtered = filtered.filter(asset => asset.category === filters.category);
    }

    // Filter by price range
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice);
      filtered = filtered.filter(asset => {
        const currentPrice = asset.currentBid ? parseFloat(asset.currentBid) : parseFloat(asset.startingPrice);
        return currentPrice >= minPrice;
      });
    }

    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      filtered = filtered.filter(asset => {
        const currentPrice = asset.currentBid ? parseFloat(asset.currentBid) : parseFloat(asset.startingPrice);
        return currentPrice <= maxPrice;
      });
    }

    // Sort assets
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        const aCurrentPrice = a.currentBid ? parseFloat(a.currentBid) : parseFloat(a.startingPrice);
        const bCurrentPrice = b.currentBid ? parseFloat(b.currentBid) : parseFloat(b.startingPrice);

        switch (filters.sortBy) {
          case "price-low":
            return aCurrentPrice - bCurrentPrice;
          case "price-high":
            return bCurrentPrice - aCurrentPrice;
          case "recent":
            return new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime();
          case "ending":
            return a.daysExpired - b.daysExpired;
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [allAssets, filters]);

  const bidMutation = useMutation({
    mutationFn: async ({ assetId, amount }: { assetId: string; amount: string }) => {
      if (!isAuthenticated || !user) {
        throw new Error('Please log in to place bids');
      }
      
      if (!wallet) {
        throw new Error('Please connect your ICP wallet to place bids');
      }

      // Handle demo assets differently
      if (assetId.startsWith('demo-')) {
        throw new Error('This is a demo asset for demonstration purposes only. Bidding is not available on demo listings.');
      }

      const bidAmountICP = parseFloat(amount);
      if (wallet.balance < (bidAmountICP + 0.0001)) {
        throw new Error(`Insufficient balance. You need ${bidAmountICP + 0.0001} ICP (including transaction fee) to place this bid.`);
      }

      // Get secure payment intent from backend
      const paymentIntentResponse = await apiRequest('POST', '/api/payment-intents', {
        type: 'bid_payment',
        amount: amount,
        metadata: { assetId }
      });
      const paymentIntent = await paymentIntentResponse.json();

      // Send bid payment using secure recipient
      await sendTransaction(
        paymentIntent.recipient,
        bidAmountICP,
        'bid_payment',
        paymentIntent.memo
      );

      const response = await apiRequest("POST", `/api/marketplace/assets/${assetId}/bid`, {
        bidderId: user.id,
        amount: bidAmountICP.toFixed(2),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bid Placed Successfully",
        description: "Your bid has been placed and payment has been processed.",
      });
      setBidAmount("");
      setSelectedAsset(null);
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/assets"] });
    },
    onError: (error) => {
      toast({
        title: "Bid Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePlaceBid = (asset: MarketplaceAsset) => {
    setSelectedAsset(asset);
    setBidAmount("");
  };

  const submitBid = () => {
    if (!selectedAsset || !bidAmount) return;
    
    const currentHighest = selectedAsset.currentBid 
      ? parseFloat(selectedAsset.currentBid)
      : parseFloat(selectedAsset.startingPrice);
    
    if (parseFloat(bidAmount) <= currentHighest) {
      toast({
        title: "Invalid Bid",
        description: "Your bid must be higher than the current highest bid.",
        variant: "destructive",
      });
      return;
    }

    bidMutation.mutate({
      assetId: selectedAsset.id,
      amount: bidAmount,
    });
  };

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <section className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-sm sm:text-base">Loading marketplace assets...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4">Asset Marketplace</h2>
          <p className="text-sm sm:text-base text-muted-foreground px-4 sm:px-0">Purchase unclaimed assets from expired pawn agreements</p>
        </div>

        {/* Filter Bar - Mobile Optimized */}
        <Card className="bg-card border border-border p-4 sm:p-6 mb-6 sm:mb-8 glass-effect">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger data-testid="filter-category" className="h-11 sm:h-10">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-background dark:bg-black border-border dark:border-gray-800">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Real Estate">🏠 Real Estate</SelectItem>
                <SelectItem value="Jewelry">💎 Jewelry</SelectItem>
                <SelectItem value="Automotive">🚗 Automotive</SelectItem>
                <SelectItem value="art-collectibles">🎨 Art & Collectibles</SelectItem>
                <SelectItem value="electronics">📱 Electronics</SelectItem>
                <SelectItem value="luxury-goods">⌚ Luxury Goods</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
            >
              <SelectTrigger data-testid="filter-sort" className="h-11 sm:h-10">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent className="bg-background dark:bg-black border-border dark:border-gray-800">
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="ending">Ending Soon</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Min Price"
              value={filters.minPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
              data-testid="filter-min-price"
              className="h-11 sm:h-10"
            />

            <Input
              type="number"
              placeholder="Max Price"
              value={filters.maxPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
              data-testid="filter-max-price"
              className="h-11 sm:h-10"
            />
          </div>
        </Card>

        {/* Asset Grid - Mobile Optimized */}
        {filteredAssets.length === 0 ? (
          <div className="text-center py-12 sm:py-16 text-muted-foreground">
            <p className="text-sm sm:text-base">No assets available in the marketplace{filters.category !== "all" ? ` for ${filters.category}` : ""}.</p>
            <p className="text-xs sm:text-sm mt-2">Check back later for new listings or try different filters!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredAssets.map((asset) => (
              <Card
                key={asset.id}
                className="bg-card border border-border overflow-hidden hover:border-primary transition-colors glass-effect h-fit"
                data-testid={`asset-card-${asset.id}`}
              >
                {asset.imageUrl && (
                  <img
                    src={asset.imageUrl}
                    alt={asset.assetName}
                    className="w-full h-40 sm:h-48 object-cover"
                    data-testid={`asset-image-${asset.id}`}
                  />
                )}

                <div className="p-4 sm:p-6">
                  <div className="flex flex-col xs:flex-row xs:justify-between xs:items-start mb-3 space-y-2 xs:space-y-0">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm sm:text-base" data-testid={`asset-name-${asset.id}`}>
                        {asset.assetName}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{asset.category}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs self-start xs:self-auto">Expired</Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Original Value:</span>
                      <span className="font-medium" data-testid={`asset-original-value-${asset.id}`}>
                        {formatPrice(asset.originalValue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">
                        {asset.currentBid ? "Current Bid:" : "Starting Bid:"}
                      </span>
                      <span className="font-medium text-primary" data-testid={`asset-current-bid-${asset.id}`}>
                        {formatPrice(asset.currentBid || asset.startingPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Days Expired:</span>
                      <span data-testid={`asset-days-expired-${asset.id}`}>
                        {asset.daysExpired} days
                      </span>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => handlePlaceBid(asset)}
                        className="w-full h-11 sm:h-10 text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                        data-testid={`button-place-bid-${asset.id}`}
                      >
                        Place Bid
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg">Place Bid on {asset.assetName}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="bidAmount" className="text-sm">Bid Amount (ICP)</Label>
                          <Input
                            id="bidAmount"
                            type="number"
                            placeholder="Enter your bid"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            data-testid="input-bid-amount"
                            className="h-11 sm:h-10 mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Must be higher than current bid of{" "}
                            {formatPrice(asset.currentBid || asset.startingPrice)}
                          </p>
                        </div>
                        <Button
                          onClick={submitBid}
                          disabled={
                            bidMutation.isPending || 
                            !bidAmount || 
                            !isAuthenticated || 
                            !wallet || 
                            (bidAmount && wallet ? wallet.balance < parseFloat(bidAmount) : false)
                          }
                          className="w-full h-11 sm:h-10 text-sm"
                          data-testid="button-submit-bid"
                        >
                          {bidMutation.isPending
                            ? "Placing Bid..."
                            : !isAuthenticated
                            ? "Login to Bid"
                            : !wallet
                            ? "Connect Wallet"
                            : bidAmount && wallet.balance < parseFloat(bidAmount)
                            ? "Insufficient Balance"
                            : "Place Bid"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
