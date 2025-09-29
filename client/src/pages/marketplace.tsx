import Navigation from "@/components/navigation";
import AssetMarketplace from "@/components/asset-marketplace";
import Footer from "@/components/footer";
import SEO from "@/components/seo";

export default function Marketplace() {
  return (
    <div className="min-h-screen">
      <SEO 
        title="Marketplace - Buy Real World Assets on ICP Blockchain | RWAPAWN"
        description="Browse and bid on premium real world assets from expired pawn loans on the ICP blockchain. Luxury real estate, jewelry, vehicles, and more. Secure cryptocurrency transactions on the blockchain pawnshop marketplace."
        keywords="Real World Assets, ICP Assets, Real World Assets on ICP, Blockchain Pawnshop, ICP Blockchain, Cryptocurrency Pawnshop, RWA Marketplace"
        ogTitle="Marketplace - Real World Assets on ICP Blockchain"
        ogDescription="Purchase authenticated real world assets on the ICP blockchain. Transparent bidding, secure transactions, verified authenticity."
      />
      <Navigation />
      <AssetMarketplace />
      <Footer />
    </div>
  );
}
