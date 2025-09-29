import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Download, ArrowRight, Shield, TrendingUp, Users, Coins, Clock, Target, Globe, Award } from "lucide-react";
import Footer from "@/components/footer";
import { Link } from "wouter";
import SEO from "@/components/seo";

export default function WhitepaperPage() {
  const handleDownload = () => {
    // Create a link to download the whitepaper PDF
    const element = document.createElement('a');
    element.href = '/api/whitepaper/download-pdf';
    element.download = 'RWAPAWN_Whitepaper.pdf';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#000000' }}>
      <SEO 
        title="Whitepaper - RWAPAWN Token | Real World Assets on ICP Blockchain"
        description="Read the official RWAPAWN Token whitepaper. Learn about our revolutionary approach to pawning real world assets on the ICP blockchain, tokenomics, and cryptocurrency loans backed by RWA."
        keywords="Real World Assets, ICP Blockchain, ICP Assets, Cryptocurrency Pawnshop, Blockchain Pawnshop, RWAPAWN Token, Whitepaper"
        ogTitle="RWAPAWN Whitepaper - RWA on ICP Blockchain"
        ogDescription="Discover how RWAPAWN revolutionizes real world asset lending through blockchain innovation. Download the official whitepaper."
      />
      {/* Header */}
      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16">
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 sm:mb-6 px-2 sm:px-0" style={{ color: '#ffffff' }}>
            RWAPAWN Token Whitepaper
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-2 sm:px-0">
            Revolutionizing Real-World Asset Lending Through Blockchain Innovation. 
            Discover how RWAPAWN creates sustainable value through decentralized asset-backed lending.
          </p>
          <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 justify-center items-center mt-6 sm:mt-8">
            <Badge variant="secondary" className="px-3 sm:px-4 py-2 text-xs sm:text-sm">
              Version 1.0 • September 2025
            </Badge>
            <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 h-11 sm:h-10 text-sm" data-testid="button-download-whitepaper">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Quick Overview - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-blue-400" />
                Token Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">10B RWAPAWN</div>
              <div className="text-sm text-muted-foreground">Total token supply at $0.25 USD per token</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Staking APY
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">8-25%</div>
              <div className="text-sm text-muted-foreground">Annual percentage yield for stakers</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Loan-to-Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">Up to 70%</div>
              <div className="text-sm text-muted-foreground">Maximum loan against asset value</div>
            </CardContent>
          </Card>
        </div>

        {/* Executive Summary */}
        <Card className="bg-zinc-900 border-zinc-800 mb-12">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              The ICP RWA Pawn Platform represents a groundbreaking fusion of traditional pawn shop services with cutting-edge blockchain technology, 
              built on the Internet Computer Protocol (ICP). Our platform enables users to leverage real-world assets (RWAs) to obtain instant 
              cryptocurrency liquidity while maintaining asset ownership through a transparent, secure, and decentralized lending system.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-white">RWAPAWN</strong> is the native utility token that powers this ecosystem, serving as the cornerstone 
              for platform operations, liquidity provision, and community governance. By staking RWAPAWN tokens, users contribute to the platform's 
              main lending pool and earn attractive returns while supporting the broader RWA lending ecosystem.
            </p>
          </CardContent>
        </Card>

        {/* Key Value Propositions */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8">Key Value Propositions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Clock className="w-6 h-6 text-blue-400 mt-1" />
                  <div>
                    <h3 className="text-white font-semibold mb-2">Instant Liquidity</h3>
                    <p className="text-muted-foreground">Convert real-world assets into cryptocurrency loans within minutes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-green-400 mt-1" />
                  <div>
                    <h3 className="text-white font-semibold mb-2">Transparent Pricing</h3>
                    <p className="text-muted-foreground">AI-powered asset valuation with fraud detection capabilities</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Globe className="w-6 h-6 text-purple-400 mt-1" />
                  <div>
                    <h3 className="text-white font-semibold mb-2">Cross-Chain Compatibility</h3>
                    <p className="text-muted-foreground">Seamless bridging between Ethereum and ICP networks</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Users className="w-6 h-6 text-yellow-400 mt-1" />
                  <div>
                    <h3 className="text-white font-semibold mb-2">Community-Driven</h3>
                    <p className="text-muted-foreground">RWAPAWN token holders participate in governance and revenue sharing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RWAPAWN Token Functions */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8">RWAPAWN Token Core Functions</h2>
          <div className="grid gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Liquidity Provision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  RWAPAWN tokens form the backbone of the platform's lending pool, ensuring consistent availability of funds for approved asset loans. 
                  Token holders contribute their assets to create a decentralized lending treasury that operates independently of traditional banking systems.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-400" />
                  Governance Participation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">Token holders participate in key platform decisions including:</p>
                <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Interest rate adjustments</li>
                  <li>Supported asset categories</li>
                  <li>Platform fee modifications</li>
                  <li>Technology upgrade approvals</li>
                  <li>Partnership and integration decisions</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-purple-400" />
                  Revenue Sharing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">RWAPAWN holders receive proportional distributions from platform revenues including:</p>
                <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Loan interest payments</li>
                  <li>Late payment fees</li>
                  <li>Marketplace transaction fees</li>
                  <li>Cross-chain bridge revenues</li>
                  <li>Premium feature subscriptions</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tokenomics Overview */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8">Tokenomics Overview</h2>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Token Distribution</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Liquidity Pool</span>
                      <span className="text-white font-semibold">30% (3B)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Development & Operations</span>
                      <span className="text-white font-semibold">25% (2.5B)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Community Rewards</span>
                      <span className="text-white font-semibold">20% (2B)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Public Sale</span>
                      <span className="text-white font-semibold">15% (1.5B)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Team & Advisors</span>
                      <span className="text-white font-semibold">10% (1B)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Staking Tiers</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-zinc-800 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-semibold">Bronze Tier</span>
                        <Badge variant="secondary">8-12% APY</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">1,000+ RWAPAWN, 30+ days</div>
                    </div>
                    <div className="p-3 bg-zinc-800 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-semibold">Silver Tier</span>
                        <Badge variant="secondary">12-18% APY</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">10,000+ RWAPAWN, 90+ days</div>
                    </div>
                    <div className="p-3 bg-zinc-800 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-semibold">Gold Tier</span>
                        <Badge variant="secondary">18-22% APY</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">50,000+ RWAPAWN, 180+ days</div>
                    </div>
                    <div className="p-3 bg-zinc-800 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-semibold">Diamond Tier</span>
                        <Badge variant="secondary">22-25% APY</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">100,000+ RWAPAWN, 365+ days</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Technology Stack */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8">Technology Stack</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Blockchain Infrastructure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-blue-400 border-blue-400">ICP</Badge>
                  <span className="text-muted-foreground">Primary blockchain layer</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-purple-400 border-purple-400">Ethereum</Badge>
                  <span className="text-muted-foreground">Cross-chain compatibility</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-400 border-green-400">Chain Fusion</Badge>
                  <span className="text-muted-foreground">Seamless bridging</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Security Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span className="text-muted-foreground">Multi-signature wallet security</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-muted-foreground">AI-powered fraud detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-muted-foreground">Decentralized asset custody</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-blue-900 to-purple-900 border-0">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-gray-200 mb-6 max-w-2xl mx-auto">
              Join the RWAPAWN ecosystem and be part of the future of decentralized asset-backed lending. 
              Stake tokens, earn rewards, and help revolutionize traditional finance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleDownload} variant="secondary" className="bg-white text-black hover:bg-gray-200" data-testid="button-download-full-whitepaper">
                <Download className="w-4 h-4 mr-2" />
                Download Full Whitepaper
              </Button>
              <Link href="/token">
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-start-staking">
                  Start Staking <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}