import Navigation from "@/components/navigation";
import AssetMarketplace from "@/components/asset-marketplace";
import Footer from "@/components/footer";

export default function Marketplace() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <AssetMarketplace />
      <Footer />
    </div>
  );
}
