import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Shield, Zap, TrendingUp } from "lucide-react";

export default function HeroSection() {
  // Mock statistics - in production this would come from the API
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    initialData: {
      pendingApprovals: 12,
      activeLoans: 157,
      expiringSoon: 8,
      totalRevenue: "48300",
    },
  });

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  return (
    <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Grid Texture Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 dark:opacity-20"></div>
      
      {/* Noise/Grain Texture */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZUZpbHRlciI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2VGaWx0ZXIpIiBvcGFjaXR5PSIwLjQiLz48L3N2Zz4=')] opacity-10 dark:opacity-5"></div>
      
      {/* Dot Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(120,119,198,0.15)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(120,119,198,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      
      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.08),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.08),transparent_50%)]"></div>
      
      {/* Decorative Blur Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto text-center relative z-10">
        {/* Main Heading with Enhanced Typography */}
        <div className="mb-8">
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
            Pawn Your{" "}
            <span className="bg-gradient-to-r from-primary via-purple-500 to-secondary bg-clip-text text-transparent drop-shadow-sm">
              Real World Assets
            </span>
            <br className="hidden xs:block" />
            <span className="xs:hidden"> </span>
            on ICP Blockchain
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-3xl mx-auto px-2 sm:px-0">
            Secure, transparent, and decentralized pawning platform. Get instant
            liquidity by pawning your RWAs with smart contracts on Internet
            Computer Protocol.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 sm:mb-16">
          <Link href="/dashboard">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6"
              data-testid="button-get-started"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/how-it-works">
            <Button 
              size="lg" 
              variant="outline"
              className="w-full sm:w-auto border-2 hover:bg-primary/5 shadow-md hover:shadow-lg transition-all duration-300 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6"
              data-testid="button-learn-more"
            >
              How It Works
            </Button>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="p-3 rounded-full bg-primary/10 mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Secure & Trustless</h3>
            <p className="text-sm text-muted-foreground">Smart contracts ensure transparent and secure transactions</p>
          </div>
          
          <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="p-3 rounded-full bg-secondary/10 mb-4">
              <Zap className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Instant Liquidity</h3>
            <p className="text-sm text-muted-foreground">Get up to 70% of your asset's value immediately</p>
          </div>
          
          <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="p-3 rounded-full bg-primary/10 mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Fair Market Value</h3>
            <p className="text-sm text-muted-foreground">Real-time pricing powered by multiple data sources</p>
          </div>
        </div>

        {/* Statistics Cards - Enhanced with Shadows & Borders */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="relative bg-gradient-to-br from-card to-card/80 border-2 border-primary/20 p-4 sm:p-6 glass-effect shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-primary/40 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary mb-1" data-testid="stat-total-value">
                $2.4M
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Total Value Locked</div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-primary/5 rounded-full blur-xl"></div>
          </Card>

          <Card className="relative bg-gradient-to-br from-card to-card/80 border-2 border-secondary/20 p-4 sm:p-6 glass-effect shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-secondary/40 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-secondary mb-1" data-testid="stat-active-loans">
                {stats?.activeLoans || 0}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Active Loans</div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-secondary/5 rounded-full blur-xl"></div>
          </Card>

          <Card className="relative bg-gradient-to-br from-card to-card/80 border-2 border-primary/20 p-4 sm:p-6 glass-effect shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-primary/40 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1" data-testid="stat-assets-listed">
                89
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Assets for Sale</div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-primary/5 rounded-full blur-xl"></div>
          </Card>

          <Card className="relative bg-gradient-to-br from-card to-card/80 border-2 border-secondary/20 p-4 sm:p-6 glass-effect shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-secondary/40 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary mb-1" data-testid="stat-loan-to-value">
                70%
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Max Loan-to-Value</div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-secondary/5 rounded-full blur-xl"></div>
          </Card>
        </div>
      </div>
    </section>
  );
}
