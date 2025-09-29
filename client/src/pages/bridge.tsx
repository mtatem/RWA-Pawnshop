import Navigation from "@/components/navigation";
import BlockchainBridge from "@/components/blockchain-bridge";
import Footer from "@/components/footer";
import SEO from "@/components/seo";

export default function Bridge() {
  return (
    <div className="min-h-screen">
      <SEO 
        title="Cross-Chain Bridge - Transfer ICP Assets | RWAPAWN Blockchain Pawnshop"
        description="Seamlessly bridge your real world assets and ICP tokens across blockchains. Secure cryptocurrency transactions on the blockchain pawnshop platform. Connect ICP assets with other networks."
        keywords="ICP Blockchain, ICP Assets, Real World Assets on ICP, Blockchain Pawnshop, Cryptocurrency Pawnshop"
        ogTitle="Cross-Chain Bridge for ICP Assets and RWA"
        ogDescription="Transfer real world assets and ICP tokens across blockchains. Secure, fast, and decentralized bridge for cryptocurrency and RWA."
      />
      <Navigation />
      <BlockchainBridge />
      <Footer />
    </div>
  );
}
