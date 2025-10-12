import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Percent, CreditCard, ArrowRightLeft, TrendingUp, Calculator } from "lucide-react";
import SEO from "@/components/seo";

export default function Fees() {
  const mainFees = [
    {
      icon: <Coins className="w-8 h-8 text-primary" />,
      title: "Platform Fee",
      amount: "25 USDC",
      description: "Flat fee for listing an asset on the marketplace.",
      details: [
        "Covers document analysis and OCR processing",
        "Includes fraud detection and verification",
        "Expert admin review and approval process", 
        "Secure storage of asset documentation"
      ],
      type: "One-time"
    },
    {
      icon: <Percent className="w-8 h-8 text-primary" />,
      title: "Interest Rate",
      amount: "8.5% APR",
      description: "Annual percentage rate on all pawn loans, calculated daily.",
      details: [
        "Competitive rates compared to traditional pawn shops",
        "Simple interest calculation, no compound interest",
        "Early repayment discounts available",
        "90-day standard loan terms"
      ],
      type: "Annual"
    },
    {
      icon: <ArrowRightLeft className="w-8 h-8 text-primary" />,
      title: "Cross-Chain Bridge",
      amount: "0.5%",
      description: "Fee for converting between ETH/USDC and ckETH/ckUSDC via our bridge.",
      details: [
        "Covers Ethereum gas fees and processing",
        "Includes Chain Fusion technology costs",
        "Real-time exchange rate with minimal slippage",
        "Secure multi-signature transaction validation"
      ],
      type: "Per Transaction"
    }
  ];

  const additionalFees = [
    {
      service: "Marketplace Transaction Fee",
      fee: "3% of final bid",
      description: "Commission on successful marketplace transactions"
    },
    {
      service: "Loan Extension",
      fee: "1% of loan amount",
      description: "Extend your 90-day loan term by an additional 30 days"
    },
    {
      service: "Asset Storage",
      fee: "Free for 90 days",
      description: "Digital asset documentation storage and security"
    },
    {
      service: "Physical Inspection",
      fee: "50 USDC",
      description: "Optional in-person asset verification for high-value items"
    },
    {
      service: "Insurance Coverage",
      fee: "2% of asset value/year",
      description: "Optional insurance coverage for stored assets"
    }
  ];

  const loanExamples = [
    {
      assetType: "Gold Jewelry",
      assetValue: "$1,000",
      loanAmount: "$700", 
      platformFee: "25 USDC",
      monthlyInterest: "$4.96",
      totalCost: "$39.88"
    },
    {
      assetType: "Luxury Watch", 
      assetValue: "$5,000",
      loanAmount: "$3,500",
      platformFee: "25 USDC", 
      monthlyInterest: "$24.79",
      totalCost: "$99.37"
    },
    {
      assetType: "Vintage Car",
      assetValue: "$25,000", 
      loanAmount: "$17,500",
      platformFee: "25 USDC",
      monthlyInterest: "$123.96",
      totalCost: "$396.88"
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <SEO 
        title="Fees & Pricing - Cryptocurrency Loans on ICP Blockchain | RWAPAWN"
        description="Transparent fee structure for pawning real world assets on the ICP blockchain. 25 USDC listing fee, 3% marketplace fee, 8.5% APR on cryptocurrency loans, 0.5% bridge fee. No hidden charges on the blockchain pawnshop."
        keywords="Cryptocurrency Loans, ICP Blockchain, Real World Assets, Pawning Real World Assets, ICP Assets, Blockchain Pawnshop Fees"
        ogTitle="Fees - Transparent Pricing for RWA Loans"
        ogDescription="View our competitive fee structure for pawning real world assets and getting cryptocurrency loans on ICP blockchain."
      />
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ color: '#ffffff' }}>
            Transparent Fee Structure
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We believe in complete transparency. Here's our straightforward fee structure 
            with no hidden costs or surprise charges. What you see is what you pay.
          </p>
        </div>

        {/* Main Fees */}
        <div className="grid gap-8 mb-16">
          {mainFees.map((fee, index) => (
            <Card key={index} className="overflow-hidden" data-testid={`main-fee-${index}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
                      {fee.icon}
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <CardTitle className="text-xl">{fee.title}</CardTitle>
                        <Badge variant="outline">{fee.type}</Badge>
                      </div>
                      <CardDescription className="mt-2 text-base">
                        {fee.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">{fee.amount}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="grid md:grid-cols-2 gap-3">
                  {fee.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-muted-foreground">{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Services */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Additional Services</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFees.map((service, index) => (
              <Card key={index} data-testid={`additional-fee-${index}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{service.service}</CardTitle>
                    <Badge variant="secondary">{service.fee}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Loan Examples */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Loan Cost Examples</h2>
          <p className="text-center text-muted-foreground mb-8">
            See how our fees apply to different asset types and loan amounts over a 90-day term.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border border-border rounded-lg">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">Asset Type</th>
                  <th className="text-left p-4 font-semibold">Asset Value</th>
                  <th className="text-left p-4 font-semibold">Loan Amount (70%)</th>
                  <th className="text-left p-4 font-semibold">Platform Fee</th>
                  <th className="text-left p-4 font-semibold">Interest (90 days)</th>
                  <th className="text-left p-4 font-semibold">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {loanExamples.map((example, index) => (
                  <tr key={index} className="border-t border-border" data-testid={`loan-example-${index}`}>
                    <td className="p-4 font-medium">{example.assetType}</td>
                    <td className="p-4">{example.assetValue}</td>
                    <td className="p-4 text-primary font-semibold">{example.loanAmount}</td>
                    <td className="p-4">{example.platformFee}</td>
                    <td className="p-4">{example.monthlyInterest}</td>
                    <td className="p-4 font-semibold">{example.totalCost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fee Calculator CTA */}
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Calculator className="w-8 h-8 text-primary" />
              <CardTitle className="text-2xl text-center">We Can Help You Calculate Your Loan Costs</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Want to know exactly how much your loan will cost? Contact us directly to learn more about the fees and costs associated with pawning your assets.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                <h4 className="font-semibold">Competitive Rates</h4>
                <p className="text-sm text-muted-foreground">
                  Lower rates than traditional pawn shops
                </p>
              </div>
              <div className="text-center">
                <Coins className="w-6 h-6 text-primary mx-auto mb-2" />
                <h4 className="font-semibold">No Hidden Fees</h4>
                <p className="text-sm text-muted-foreground">
                  All costs disclosed upfront and transparently
                </p>
              </div>
              <div className="text-center">
                <CreditCard className="w-6 h-6 text-primary mx-auto mb-2" />
                <h4 className="font-semibold">Flexible Payment</h4>
                <p className="text-sm text-muted-foreground">
                  Multiple payment options and early repayment discounts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}