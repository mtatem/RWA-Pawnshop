import Navigation from "@/components/navigation";
import HeroSection from "@/components/hero-section";
import MarketplacePreview from "@/components/marketplace-preview";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <HeroSection />
      <MarketplacePreview />
      <Footer />
    </div>
  );
}
