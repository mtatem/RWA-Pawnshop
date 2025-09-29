import type { MarketplaceAsset } from "@shared/schema";
import luxuryHouseImage from "@assets/generated_images/Luxury_modern_house_exterior_4597f8e9.png";
import diamondNecklaceImage from "@assets/generated_images/Diamond_tennis_necklace_display_ec61d518.png";
import luxuryCarImage from "@assets/generated_images/Black_luxury_sports_car_d4206fb8.png";

// Extended properties for demo assets used in detail views
export interface DemoAssetExtensions {
  location?: string;
  specifications?: string[];
  walletAddress?: string;
}

// Base demo marketplace assets
export const demoMarketplaceAssets: MarketplaceAsset[] = [
  {
    id: "demo-real-estate-1",
    loanId: "loan-demo-1",
    assetName: "Modern Luxury Villa in Beverly Hills",
    category: "Real Estate",
    originalValue: "2850000.00",
    startingPrice: "1995000.00",
    currentBid: "2150000.00",
    highestBidder: "Beverly Hills Investor Group",
    imageUrl: null,
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
    highestBidder: "Diamond Collector NYC",
    imageUrl: null,
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
    highestBidder: "Performance Auto Group",
    imageUrl: null,
    description: "Pristine 2023 Porsche 911 Turbo S in Jet Black Metallic with only 1,200 miles. Features twin-turbo 3.8L flat-six engine producing 640 HP, PDK transmission, sport chrono package, premium leather interior, and ceramic composite brakes. Includes full manufacturer warranty.",
    daysExpired: 12,
    status: "available",
    soldAt: null,
    soldPrice: null,
    createdAt: new Date("2024-12-10T00:00:00.000Z"),
    updatedAt: new Date("2024-12-22T00:00:00.000Z"),
  }
];

// Demo asset enhancements for detail view
export const demoAssetEnhancements: Record<string, DemoAssetExtensions> = {
  "demo-real-estate-1": {
    location: "Beverly Hills, CA",
    specifications: ["4 Bedrooms", "5 Bathrooms", "3,850 sq ft", "Infinity Pool", "Smart Home System", "3-Car Garage"],
    walletAddress: "rdmx6-jaaaa-aaaah-qcaiq-cai"
  },
  "demo-jewelry-1": {
    specifications: ["15 Carats Total Weight", "VS1 Clarity", "18K White Gold", "GIA Certified", "16-inch Length", "Cartier Original"],
    walletAddress: "bkyz2-fmaaa-aaaah-qaaaq-cai"
  },
  "demo-automotive-1": {
    specifications: ["640 Horsepower", "1,200 Miles", "PDK Transmission", "Sport Chrono Package", "Ceramic Brakes", "Full Warranty"],
    walletAddress: "rrkah-fqaaa-aaaah-qaaaq-cai"
  }
};

// Image mapping for demo assets
export const demoAssetImages: Record<string, string> = {
  "demo-real-estate-1": luxuryHouseImage,
  "demo-jewelry-1": diamondNecklaceImage,
  "demo-automotive-1": luxuryCarImage
};

// Extended demo asset type for detail views
export interface ExtendedDemoAsset extends MarketplaceAsset, DemoAssetExtensions {}

// Get enhanced demo asset for detail view
export function getEnhancedDemoAsset(id: string): ExtendedDemoAsset | undefined {
  const baseAsset = demoMarketplaceAssets.find(asset => asset.id === id);
  const enhancement = demoAssetEnhancements[id];
  const imageUrl = demoAssetImages[id];
  
  if (!baseAsset) {
    return undefined;
  }

  return {
    ...baseAsset,
    imageUrl: imageUrl || baseAsset.imageUrl,
    ...enhancement
  };
}