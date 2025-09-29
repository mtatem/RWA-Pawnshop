import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Eye, Calendar, MapPin, Wallet, TrendingUp, Shield, Award } from "lucide-react";
import type { MarketplaceAsset } from "@shared/schema";
import { demoMarketplaceAssets, getEnhancedDemoAsset, type ExtendedDemoAsset } from "@shared/demo-assets";

export default function AssetDetail() {
  const { assetId } = useParams<{ assetId: string }>();

  // Fetch marketplace assets from API
  const { data: apiAssets = [], isLoading, error } = useQuery<MarketplaceAsset[]>({
    queryKey: ['/api/marketplace/assets'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Combine API assets with demo assets
  const allAssets = [...apiAssets, ...demoMarketplaceAssets];
  
  // Find the asset and enhance if it's a demo asset
  const asset = allAssets.find(a => a.id === assetId);
  const enhancedAsset: ExtendedDemoAsset | undefined = asset ? 
    (asset.id.startsWith('demo-') ? getEnhancedDemoAsset(asset.id) : asset as ExtendedDemoAsset) : 
    undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-lg">Loading asset details...</div>
        </div>
      </div>
    );
  }

  if (error || !enhancedAsset) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Asset Not Found</h1>
          <p className="text-muted-foreground mb-6">The requested asset could not be found.</p>
          <Link href="/marketplace">
            <Button data-testid="button-return-marketplace">Return to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "real estate":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "jewelry":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      case "automotive":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link href="/marketplace">
          <Button variant="ghost" className="mb-4" data-testid="button-back-marketplace">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Asset Image */}
        <Card className="overflow-hidden">
          <img
            src={enhancedAsset.imageUrl || "/placeholder-asset.jpg"}
            alt={enhancedAsset.assetName}
            className="w-full h-96 object-cover"
            data-testid={`asset-detail-image-${enhancedAsset.id}`}
          />
        </Card>

        {/* Asset Information */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Badge className={`${getCategoryColor(enhancedAsset.category)} border-0`} data-testid={`asset-detail-category-${enhancedAsset.id}`}>
                {enhancedAsset.category}
              </Badge>
              <Badge variant="destructive" className="text-xs">
                {enhancedAsset.daysExpired} days expired
              </Badge>
            </div>
            <h1 className="text-3xl font-bold mb-4" data-testid={`asset-detail-name-${enhancedAsset.id}`}>
              {enhancedAsset.assetName}
            </h1>
            {enhancedAsset.location && (
              <div className="flex items-center text-muted-foreground mb-4">
                <MapPin className="w-4 h-4 mr-2" />
                <span data-testid={`asset-detail-location-${enhancedAsset.id}`}>{enhancedAsset.location}</span>
              </div>
            )}
          </div>

          {/* Pricing Section */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Pricing Information
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Original Value</span>
                <span className="font-semibold text-muted-foreground line-through text-lg" data-testid={`asset-detail-original-value-${enhancedAsset.id}`}>
                  {formatCurrency(enhancedAsset.originalValue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Starting Price</span>
                <span className="font-semibold text-lg" data-testid={`asset-detail-starting-price-${enhancedAsset.id}`}>
                  {formatCurrency(enhancedAsset.startingPrice)}
                </span>
              </div>
              {enhancedAsset.currentBid && (
                <div className="flex justify-between items-center border-t pt-4">
                  <span className="text-green-600 font-medium flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Current Highest Bid
                  </span>
                  <span className="font-bold text-green-600 text-xl" data-testid={`asset-detail-current-bid-${enhancedAsset.id}`}>
                    {formatCurrency(enhancedAsset.currentBid)}
                  </span>
                </div>
              )}
              {enhancedAsset.highestBidder && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Highest Bidder</span>
                  <span className="font-medium" data-testid={`asset-detail-highest-bidder-${enhancedAsset.id}`}>
                    {enhancedAsset.highestBidder}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Wallet Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Wallet className="w-5 h-5 mr-2" />
              Blockchain Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Asset Wallet Address</span>
                <code className="bg-muted px-3 py-1 rounded text-sm font-mono" data-testid={`asset-detail-wallet-${enhancedAsset.id}`}>
                  {enhancedAsset.walletAddress || 'ICP-' + enhancedAsset.id.substring(0, 8)}
                </code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Network</span>
                <Badge variant="outline" className="font-mono">ICP</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified on Chain
                </Badge>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/marketplace">
              <Button size="lg" className="w-full bg-primary hover:bg-primary/90" data-testid={`button-place-bid-detail-${enhancedAsset.id}`}>
                Place Bid on Marketplace
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full" data-testid={`button-watch-asset-${enhancedAsset.id}`}>
              <Eye className="w-4 h-4 mr-2" />
              Add to Watchlist
            </Button>
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Description */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Asset Description</h3>
            <p className="text-muted-foreground leading-relaxed" data-testid={`asset-detail-description-${enhancedAsset.id}`}>
              {enhancedAsset.description}
            </p>
          </Card>
        </div>

        {/* Specifications */}
        {enhancedAsset.specifications && (
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2" />
              Key Features
            </h3>
            <div className="space-y-3">
              {enhancedAsset.specifications.map((spec: string, index: number) => (
                <div key={index} className="flex items-center" data-testid={`asset-detail-spec-${enhancedAsset.id}-${index}`}>
                  <div className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                  <span className="text-sm">{spec}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Additional Information */}
      <Card className="p-6 mt-8">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Auction Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-destructive mb-2">{enhancedAsset.daysExpired}</div>
            <div className="text-sm text-muted-foreground">Days Since Expiry</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary mb-2">
              {enhancedAsset.currentBid ? "Active" : "New"}
            </div>
            <div className="text-sm text-muted-foreground">Bidding Status</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 mb-2">ICP</div>
            <div className="text-sm text-muted-foreground">Blockchain Network</div>
          </div>
        </div>
      </Card>
    </div>
  );
}