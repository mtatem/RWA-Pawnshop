import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Clock, TrendingUp, Eye } from "lucide-react";
import { demoMarketplaceAssets, demoAssetImages, demoAssetEnhancements, type ExtendedDemoAsset } from "@shared/demo-assets";

export default function MarketplacePreview() {
  // Enhanced demo assets for display with images and extra details
  const demoAssets: ExtendedDemoAsset[] = demoMarketplaceAssets.map(asset => ({
    ...asset,
    imageUrl: demoAssetImages[asset.id] || asset.imageUrl,
    ...demoAssetEnhancements[asset.id]
  }));

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
    <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>
      
      {/* Decorative Blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 px-4 py-1.5 text-sm" variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            Live Marketplace
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Featured RWA{" "}
            <span className="bg-gradient-to-r from-primary via-purple-500 to-secondary bg-clip-text text-transparent">
              Marketplace
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Discover premium real-world assets available for bidding. Each asset represents a unique opportunity 
            to own high-value items that have been tokenized on the ICP blockchain.
          </p>
        </div>

        {/* Asset Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demoAssets.map((asset) => (
            <Card
              key={asset.id}
              className="group relative bg-card border-2 border-border/50 overflow-hidden hover:border-primary/50 transition-all duration-300 glass-effect h-fit shadow-lg hover:shadow-2xl hover:scale-105"
              data-testid={`marketplace-asset-${asset.id}`}
            >
              {/* Image Container with Overlay */}
              {asset.imageUrl && (
                <div className="relative overflow-hidden">
                  <img
                    src={asset.imageUrl}
                    alt={asset.assetName}
                    className="w-full h-40 sm:h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                    data-testid={`asset-image-${asset.id}`}
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Hover View Icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/90 dark:bg-black/90 rounded-full p-3">
                      <Eye className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 sm:p-6 relative">
                {/* Decorative Corner */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full"></div>
                
                <div className="flex flex-col xs:flex-row xs:justify-between xs:items-start mb-3 space-y-2 xs:space-y-0 relative z-10">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm sm:text-base mb-1" data-testid={`asset-name-${asset.id}`}>
                      {asset.assetName}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{asset.category}</p>
                  </div>
                  <Badge variant="destructive" className="text-xs self-start xs:self-auto shadow-md">
                    Expired
                  </Badge>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4"></div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs sm:text-sm p-2 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground">Original Value:</span>
                    <span className="font-semibold" data-testid={`asset-original-value-${asset.id}`}>
                      {formatCurrency(asset.originalValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="text-muted-foreground">
                      {asset.currentBid ? "Current Bid:" : "Starting Bid:"}
                    </span>
                    <span className="font-bold text-primary" data-testid={`asset-current-bid-${asset.id}`}>
                      {formatCurrency(asset.currentBid || asset.startingPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm p-2 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Days Expired:
                    </span>
                    <span className="font-medium" data-testid={`asset-days-expired-${asset.id}`}>
                      {asset.daysExpired} days
                    </span>
                  </div>
                </div>

                <Link href={`/asset/${asset.id}`}>
                  <Button
                    className="w-full h-11 sm:h-10 text-sm bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300"
                    data-testid={`button-view-details-${asset.id}`}
                  >
                    View Details & Bid
                    <Eye className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Corner Accent */}
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-secondary/10 to-transparent rounded-tr-full"></div>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="inline-block p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-secondary/10 border-2 border-primary/20 shadow-xl">
            <h3 className="text-2xl font-bold mb-3">Ready to Explore More?</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Browse our full marketplace to find your perfect investment opportunity
            </p>
            <Link href="/marketplace">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-primary via-purple-500 to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300 text-lg px-8 py-6"
                data-testid="button-view-all-marketplace"
              >
                <Clock className="w-5 h-5 mr-2" />
                View All Marketplace Assets
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
