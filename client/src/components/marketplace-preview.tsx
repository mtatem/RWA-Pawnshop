import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Eye, TrendingUp, Clock } from "lucide-react";
import luxuryHouseImage from "@assets/generated_images/Luxury_modern_house_exterior_4597f8e9.png";
import diamondNecklaceImage from "@assets/generated_images/Diamond_tennis_necklace_display_ec61d518.png";
import luxuryCarImage from "@assets/generated_images/Black_luxury_sports_car_d4206fb8.png";

interface DemoMarketplaceAsset {
  id: string;
  assetName: string;
  category: string;
  originalValue: string;
  startingPrice: string;
  currentBid?: string;
  imageUrl: string;
  description: string;
  daysExpired: number;
  status: string;
  walletAddress: string;
  highestBidder?: string;
  location?: string;
  specifications?: string[];
}

export default function MarketplacePreview() {
  const demoAssets: DemoMarketplaceAsset[] = [
    {
      id: "demo-real-estate-1",
      assetName: "Modern Luxury Villa in Beverly Hills",
      category: "Real Estate",
      originalValue: "2850000.00",
      startingPrice: "1995000.00",
      currentBid: "2150000.00",
      imageUrl: luxuryHouseImage,
      description: "Stunning contemporary 4-bedroom, 5-bathroom villa featuring open-concept living spaces, floor-to-ceiling windows, gourmet kitchen with premium appliances, infinity pool, and breathtaking city views. Located in the prestigious Beverly Hills area with 24/7 security.",
      daysExpired: 7,
      status: "available",
      walletAddress: "rdmx6-jaaaa-aaaah-qcaiq-cai",
      highestBidder: "Beverly Hills Investor Group",
      location: "Beverly Hills, CA",
      specifications: ["4 Bedrooms", "5 Bathrooms", "3,850 sq ft", "Infinity Pool", "Smart Home System", "3-Car Garage"]
    },
    {
      id: "demo-jewelry-1", 
      assetName: "18K White Gold Diamond Tennis Necklace",
      category: "Jewelry",
      originalValue: "125000.00",
      startingPrice: "87500.00",
      currentBid: "95000.00",
      imageUrl: diamondNecklaceImage,
      description: "Exquisite tennis necklace featuring 15 carats of premium VS1 clarity diamonds set in 18K white gold. Each diamond is expertly cut and hand-selected for maximum brilliance. Includes GIA certification and original Cartier presentation box.",
      daysExpired: 3,
      status: "available",
      walletAddress: "bkyz2-fmaaa-aaaah-qaaaq-cai",
      highestBidder: "Diamond Collector NYC",
      specifications: ["15 Carats Total Weight", "VS1 Clarity", "18K White Gold", "GIA Certified", "16-inch Length", "Cartier Original"]
    },
    {
      id: "demo-automotive-1",
      assetName: "2023 Porsche 911 Turbo S Coupe",
      category: "Automotive", 
      originalValue: "285000.00",
      startingPrice: "199500.00",
      currentBid: "215000.00",
      imageUrl: luxuryCarImage,
      description: "Pristine 2023 Porsche 911 Turbo S in Jet Black Metallic with only 1,200 miles. Features twin-turbo 3.8L flat-six engine producing 640 HP, PDK transmission, sport chrono package, premium leather interior, and ceramic composite brakes. Includes full manufacturer warranty.",
      daysExpired: 12,
      status: "available",
      walletAddress: "rrkah-fqaaa-aaaah-qaaaq-cai",
      highestBidder: "Performance Auto Group",
      specifications: ["640 Horsepower", "1,200 Miles", "PDK Transmission", "Sport Chrono Package", "Ceramic Brakes", "Full Warranty"]
    }
  ];

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
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Featured RWA{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Marketplace
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Discover premium real-world assets available for bidding. Each asset represents a unique opportunity 
            to own high-value items that have been tokenized on the ICP blockchain.
          </p>
        </div>

        {/* Asset Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {demoAssets.map((asset) => (
            <Card key={asset.id} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white overflow-hidden" data-testid={`marketplace-asset-${asset.id}`}>
              {/* Asset Image */}
              <div className="relative overflow-hidden">
                <img
                  src={asset.imageUrl}
                  alt={asset.assetName}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  data-testid={`asset-image-${asset.id}`}
                />
                <div className="absolute top-4 left-4">
                  <Badge className={`${getCategoryColor(asset.category)} border-0`} data-testid={`asset-category-${asset.id}`}>
                    {asset.category}
                  </Badge>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-black/80 text-white border-0" data-testid={`asset-status-${asset.id}`}>
                    {asset.daysExpired} days expired
                  </Badge>
                </div>
              </div>

              {/* Asset Details */}
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 line-clamp-2" data-testid={`asset-name-${asset.id}`}>
                  {asset.assetName}
                </h3>
                
                <p className="text-muted-foreground text-sm mb-4 line-clamp-3" data-testid={`asset-description-${asset.id}`}>
                  {asset.description}
                </p>

                {/* Specifications */}
                {asset.specifications && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {asset.specifications.slice(0, 3).map((spec, index) => (
                        <Badge key={index} variant="outline" className="text-xs" data-testid={`asset-spec-${asset.id}-${index}`}>
                          {spec}
                        </Badge>
                      ))}
                      {asset.specifications.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{asset.specifications.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Pricing Information */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Original Value</span>
                    <span className="font-semibold text-muted-foreground line-through" data-testid={`asset-original-value-${asset.id}`}>
                      {formatCurrency(asset.originalValue)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Starting Price</span>
                    <span className="font-semibold" data-testid={`asset-starting-price-${asset.id}`}>
                      {formatCurrency(asset.startingPrice)}
                    </span>
                  </div>

                  {asset.currentBid && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        Current Bid
                      </span>
                      <span className="font-bold text-green-600 text-lg" data-testid={`asset-current-bid-${asset.id}`}>
                        {formatCurrency(asset.currentBid)}
                      </span>
                    </div>
                  )}

                  {asset.highestBidder && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Highest Bidder</span>
                      <span className="font-medium" data-testid={`asset-highest-bidder-${asset.id}`}>
                        {asset.highestBidder}
                      </span>
                    </div>
                  )}
                </div>

                {/* Wallet Information */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Asset Wallet</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono" data-testid={`asset-wallet-${asset.id}`}>
                      {asset.walletAddress.substring(0, 8)}...{asset.walletAddress.substring(asset.walletAddress.length - 4)}
                    </code>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-6">
                  <Link href="/marketplace">
                    <Button className="flex-1 bg-primary hover:bg-primary/90" data-testid={`button-view-details-${asset.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                  <Link href="/marketplace">
                    <Button variant="outline" className="flex-1" data-testid={`button-place-bid-${asset.id}`}>
                      Place Bid
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <Link href="/marketplace">
            <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90" data-testid="button-view-all-marketplace">
              <Clock className="w-5 h-5 mr-2" />
              View All Marketplace Assets
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}