import Navigation from "@/components/navigation";
import BlockchainBridge from "@/components/blockchain-bridge";
import Footer from "@/components/footer";

export default function Bridge() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <BlockchainBridge />
      <Footer />
    </div>
  );
}
