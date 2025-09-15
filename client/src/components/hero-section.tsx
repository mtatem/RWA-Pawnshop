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
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Pawn Your{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Real World Assets
          </span>
          <br />
          on ICP Blockchain
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Secure, transparent, and decentralized pawning platform. Get instant
          liquidity by pawning your RWAs with smart contracts on Internet
          Computer Protocol.
        </p>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
          <Card className="bg-card border border-border p-6 glass-effect">
            <div className="text-2xl font-bold text-primary" data-testid="stat-total-value">
              $2.4M
            </div>
            <div className="text-sm text-muted-foreground">Total Value Locked</div>
          </Card>

          <Card className="bg-card border border-border p-6 glass-effect">
            <div className="text-2xl font-bold text-secondary" data-testid="stat-active-loans">
              {stats?.activeLoans || 0}
            </div>
            <div className="text-sm text-muted-foreground">Active Loans</div>
          </Card>

          <Card className="bg-card border border-border p-6 glass-effect">
            <div className="text-2xl font-bold text-accent" data-testid="stat-assets-listed">
              89
            </div>
            <div className="text-sm text-muted-foreground">Assets for Sale</div>
          </Card>

          <Card className="bg-card border border-border p-6 glass-effect">
            <div className="text-2xl font-bold text-primary" data-testid="stat-loan-to-value">
              70%
            </div>
            <div className="text-sm text-muted-foreground">Max Loan-to-Value</div>
          </Card>
        </div>
      </div>
    </section>
  );
}
