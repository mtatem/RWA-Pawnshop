import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface MarketplaceAsset {
  id: string;
  assetName: string;
  category: string;
  originalValue: string;
  startingPrice: string;
  currentBid?: string;
  daysExpired: number;
  imageUrl?: string;
  description: string;
}

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

  // Mock data - in production this would fetch from API
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["/api/marketplace/assets"],
    initialData: [
      {
        id: "1",
        assetName: "Diamond Tennis Necklace",
        category: "Luxury Jewelry",
        originalValue: "15000.00",
        startingPrice: "12000.00",
        currentBid: "12500.00",
        daysExpired: 7,
        description: "Stunning 5-carat diamond tennis necklace",
        imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      },
      {
        id: "2",
        assetName: "1973 Martin D-28",
        category: "Musical Instrument",
        originalValue: "8500.00",
        startingPrice: "6800.00",
        daysExpired: 3,
        description: "Vintage acoustic guitar in excellent condition",
        imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      },
      {
        id: "3",
        assetName: "Canon EOS R5",
        category: "Electronics",
        originalValue: "4200.00",
        startingPrice: "3360.00",
        daysExpired: 12,
        description: "Professional camera with lens kit",
        imageUrl: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      },
    ] as MarketplaceAsset[],
  });

  const bidMutation = useMutation({
    mutationFn: async ({ assetId, amount }: { assetId: string; amount: string }) => {
      const response = await apiRequest("POST", `/api/marketplace/assets/${assetId}/bid`, {
        bidderId: "mock-user-id",
        amount: parseFloat(amount).toFixed(2),
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
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div>Loading marketplace assets...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Asset Marketplace</h2>
          <p className="text-muted-foreground">Purchase unclaimed assets from expired pawn agreements</p>
        </div>

        {/* Filter Bar */}
        <Card className="bg-card border border-border p-6 mb-8 glass-effect">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger data-testid="filter-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="jewelry">Jewelry</SelectItem>
                <SelectItem value="art-collectibles">Art & Collectibles</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="luxury-goods">Luxury Goods</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
            >
              <SelectTrigger data-testid="filter-sort">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
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
            />

            <Input
              type="number"
              placeholder="Max Price"
              value={filters.maxPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
              data-testid="filter-max-price"
            />
          </div>
        </Card>

        {/* Asset Grid */}
        {assets.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No assets available in the marketplace.</p>
            <p className="text-sm mt-2">Check back later for new listings!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset) => (
              <Card
                key={asset.id}
                className="bg-card border border-border overflow-hidden hover:border-primary transition-colors glass-effect"
                data-testid={`asset-card-${asset.id}`}
              >
                {asset.imageUrl && (
                  <img
                    src={asset.imageUrl}
                    alt={asset.assetName}
                    className="w-full h-48 object-cover"
                    data-testid={`asset-image-${asset.id}`}
                  />
                )}

                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold" data-testid={`asset-name-${asset.id}`}>
                        {asset.assetName}
                      </h3>
                      <p className="text-sm text-muted-foreground">{asset.category}</p>
                    </div>
                    <Badge variant="destructive">Expired</Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Original Value:</span>
                      <span data-testid={`asset-original-value-${asset.id}`}>
                        {formatPrice(asset.originalValue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {asset.currentBid ? "Current Bid:" : "Starting Bid:"}
                      </span>
                      <span className="font-medium" data-testid={`asset-current-bid-${asset.id}`}>
                        {formatPrice(asset.currentBid || asset.startingPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
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
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        data-testid={`button-place-bid-${asset.id}`}
                      >
                        Place Bid
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Place Bid on {asset.assetName}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="bidAmount">Bid Amount (ICP)</Label>
                          <Input
                            id="bidAmount"
                            type="number"
                            placeholder="Enter your bid"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            data-testid="input-bid-amount"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Must be higher than current bid of{" "}
                            {formatPrice(asset.currentBid || asset.startingPrice)}
                          </p>
                        </div>
                        <Button
                          onClick={submitBid}
                          disabled={bidMutation.isPending || !bidAmount}
                          className="w-full"
                          data-testid="button-submit-bid"
                        >
                          {bidMutation.isPending ? "Placing Bid..." : "Place Bid"}
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
