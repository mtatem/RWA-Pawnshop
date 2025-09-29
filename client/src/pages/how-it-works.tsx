import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Upload, Coins, Clock, ShoppingCart, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

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
    <div className="min-h-screen bg-black">
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ color: '#ffffff' }}>
            How ICP RWA Pawn Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform your real-world assets into instant liquidity with our secure, blockchain-powered pawning platform. 
            Here's how our innovative process works from submission to settlement.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid gap-8 md:gap-12">
          {steps.map((step, index) => (
            <Card key={index} className="overflow-hidden" data-testid={`step-${index + 1}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                    {step.icon}
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                        Step {index + 1}
                      </span>
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                    </div>
                    <CardDescription className="mt-2 text-base">
                      {step.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="grid md:grid-cols-2 gap-3">
                  {step.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 mb-8 text-center">
          <Link href={isAuthenticated ? "/dashboard" : "/register"}>
            <Button 
              className="bg-white text-black hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
              data-testid="button-pawn-asset"
            >
              Pawn An Asset
            </Button>
          </Link>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coins className="w-6 h-6 text-primary" />
                <span>Instant Liquidity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Get immediate access to funds without selling your valuable assets. 
                Our platform provides instant loan approval and disbursement.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-6 h-6 text-primary" />
                <span>Secure & Transparent</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Built on Internet Computer Protocol with enterprise-grade security, 
                fraud detection, and complete transaction transparency.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="w-6 h-6 text-primary" />
                <span>Flexible Terms</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                90-day loan terms with extension options, competitive rates, 
                and flexible repayment schedules designed around your needs.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}