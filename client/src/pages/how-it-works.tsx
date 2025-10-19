import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Upload, Coins, Clock, ShoppingCart, RefreshCw, ArrowRight, Shield, Zap, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import SEO from "@/components/seo";

export default function HowItWorks() {
  const { isAuthenticated } = useAuth();
  const steps = [
    {
      icon: <Upload className="w-8 h-8 text-primary" />,
      title: "Submit Your Asset",
      description: "Upload photos, certificates of authenticity, and documentation of your real-world asset. Our AI-powered system analyzes your submission instantly.",
      details: [
        "Upload high-quality images from multiple angles",
        "Provide certificates of authenticity or appraisals", 
        "Complete asset details and ownership verification",
        "Get instant asset valuation with confidence scoring"
      ]
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-primary" />,
      title: "Admin Review & Verification",
      description: "Our expert team reviews your submission using advanced document analysis, OCR, and fraud detection to ensure authenticity.",
      details: [
        "Automated OCR scanning of all documents",
        "Fraud detection algorithms verify authenticity",
        "Expert admin review for final approval",
        "Secure storage of your asset documentation"
      ]
    },
    {
      icon: <Coins className="w-8 h-8 text-primary" />,
      title: "Receive Instant Loan",
      description: "Once approved, receive up to 70% of your asset's value as an instant ICP loan directly to your connected wallet.",
      details: [
        "Loans up to 70% of verified asset value",
        "Instant disbursement to your ICP wallet",
        "Competitive interest rates and flexible terms",
        "90-day loan periods with extension options"
      ]
    },
    {
      icon: <Clock className="w-8 h-8 text-primary" />,
      title: "Manage Your Loan",
      description: "Track your loan status, make payments, and manage your asset through our comprehensive dashboard.",
      details: [
        "Real-time loan status and payment tracking",
        "Flexible repayment options and schedules",
        "Early repayment discounts available",
        "Automatic renewal and extension requests"
      ]
    },
    {
      icon: <RefreshCw className="w-8 h-8 text-primary" />,
      title: "Repay & Reclaim",
      description: "Pay back your loan plus interest to reclaim your asset, or let it go to our marketplace if you prefer.",
      details: [
        "Simple repayment process through the platform",
        "Multiple payment methods accepted",
        "Immediate asset release upon full payment",
        "Option to extend loan terms if needed"
      ]
    },
    {
      icon: <ShoppingCart className="w-8 h-8 text-primary" />,
      title: "Marketplace Option",
      description: "If loans expire, assets are listed on our public marketplace where anyone can bid and purchase them.",
      details: [
        "Transparent auction system for expired assets",
        "Global marketplace with verified buyers",
        "Fair market value pricing mechanisms",
        "Revenue sharing for original asset owners"
      ]
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="How It Works - Pawning Real World Assets on ICP Blockchain | RWAPAWN"
        description="Learn how to pawn real world assets on the ICP blockchain. Step-by-step guide to getting cryptocurrency loans with your RWA. Submit assets, get instant approval, receive ICP loans directly to your wallet."
        keywords="Pawning Real World Assets, ICP Blockchain, Real World Assets on ICP, Cryptocurrency Loans, ICP Assets, Blockchain Pawnshop"
        ogTitle="How Pawning Real World Assets Works on ICP"
        ogDescription="Discover the simple process of getting cryptocurrency loans by pawning real world assets on the ICP blockchain. Fast, secure, transparent."
      />
      <Navigation />
      
      {/* Hero Section with Textured Background */}
      <section className="relative py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Grid Texture Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40 dark:opacity-25"></div>
        
        {/* Noise/Grain Texture */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZUZpbHRlciI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2VGaWx0ZXIpIiBvcGFjaXR5PSIwLjQiLz48L3N2Zz4=')] opacity-15 dark:opacity-8"></div>
        
        {/* Dot Pattern Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(120,119,198,0.2)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(120,119,198,0.12)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/7 via-transparent to-secondary/7"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.1),transparent_50%)]"></div>
        
        {/* Decorative Blur Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/12 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/12 rounded-full blur-3xl"></div>

        <div className="container mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-1.5 text-sm" variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              Step-by-Step Guide
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              How{" "}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-secondary bg-clip-text text-transparent">
                ICP RWA Pawn
              </span>{" "}
              Works
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Transform your real-world assets into instant liquidity with our secure, blockchain-powered pawning platform. 
              Here's how our innovative process works from submission to settlement.
            </p>
          </div>
        </div>
      </section>

      {/* Process Steps Section */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid gap-8 md:gap-12">
            {steps.map((step, index) => (
              <Card 
                key={index} 
                className="group relative overflow-hidden border-2 border-border/50 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02]" 
                data-testid={`step-${index + 1}`}
              >
                {/* Decorative Corner Gradient */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-secondary/10 to-transparent rounded-tr-full"></div>
                
                <CardHeader className="pb-4 relative z-10">
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full shadow-md group-hover:scale-110 transition-transform duration-300">
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge className="bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-md">
                          Step {index + 1}
                        </Badge>
                        <CardTitle className="text-xl sm:text-2xl">{step.title}</CardTitle>
                      </div>
                      <CardDescription className="text-base">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-6"></div>
                
                <CardContent className="pt-6 relative z-10">
                  <ul className="grid md:grid-cols-2 gap-3">
                    {step.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5"></div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="inline-block p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-secondary/10 border-2 border-primary/20 shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of users who have already unlocked the value of their real-world assets
            </p>
            <Link href={isAuthenticated ? "/dashboard" : "/register"}>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-primary via-purple-500 to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300 text-lg px-8 py-6"
                data-testid="button-pawn-asset"
              >
                Pawn An Asset
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Choose{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                RWAPAWN
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built on cutting-edge blockchain technology with your security and convenience in mind
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="relative border-2 border-border/50 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <span>Instant Liquidity</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-muted-foreground">
                  Get immediate access to funds without selling your valuable assets. 
                  Our platform provides instant loan approval and disbursement.
                </p>
              </CardContent>
            </Card>

            <Card className="relative border-2 border-border/50 hover:border-secondary/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <Shield className="w-6 h-6 text-secondary" />
                  </div>
                  <span>Secure & Transparent</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-muted-foreground">
                  Built on Internet Computer Protocol with enterprise-grade security, 
                  fraud detection, and complete transaction transparency.
                </p>
              </CardContent>
            </Card>

            <Card className="relative border-2 border-border/50 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <span>Flexible Terms</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-muted-foreground">
                  90-day loan terms with extension options, competitive rates, 
                  and flexible repayment schedules designed around your needs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
