import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";

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
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
          Pawn Your{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
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

        {/* Statistics Cards - Mobile Optimized */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8 sm:mt-12">
          <Card className="bg-card border border-border p-4 sm:p-6 glass-effect hover:shadow-lg transition-shadow">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary" data-testid="stat-total-value">
              $2.4M
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Total Value Locked</div>
          </Card>

          <Card className="bg-card border border-border p-4 sm:p-6 glass-effect hover:shadow-lg transition-shadow">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-secondary" data-testid="stat-active-loans">
              {stats?.activeLoans || 0}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Active Loans</div>
          </Card>

          <Card className="bg-card border border-border p-4 sm:p-6 glass-effect hover:shadow-lg transition-shadow">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#ffffff]" data-testid="stat-assets-listed">
              89
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Assets for Sale</div>
          </Card>

          <Card className="bg-card border border-border p-4 sm:p-6 glass-effect hover:shadow-lg transition-shadow">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary" data-testid="stat-loan-to-value">
              70%
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Max Loan-to-Value</div>
          </Card>
        </div>
      </div>
    </section>
  );
}
