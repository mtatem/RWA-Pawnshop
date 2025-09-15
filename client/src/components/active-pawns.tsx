import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CountdownTimer from "@/components/countdown-timer";

interface PawnLoan {
  id: string;
  assetName: string;
  category: string;
  loanAmount: string;
  assetValue: string;
  expiryDate: string;
  status: string;
}

export default function ActivePawns() {
  // Mock data - in production this would fetch from API
  const { data: pawns = [], isLoading } = useQuery({
    queryKey: ["/api/pawn-loans/user", "mock-user-id"],
    initialData: [
      {
        id: "1",
        assetName: "Rolex Submariner",
        category: "Luxury Watch",
        loanAmount: "7000.00",
        assetValue: "10000.00",
        expiryDate: new Date(Date.now() + 67 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
      },
      {
        id: "2",
        assetName: "Vintage Guitar",
        category: "Musical Instrument",
        loanAmount: "2100.00",
        assetValue: "3000.00",
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
      },
    ] as PawnLoan[],
  });

  const handleRedeemAsset = (pawnId: string) => {
    // Mock redemption - in production this would call the API
    console.log("Redeeming asset:", pawnId);
  };

  if (isLoading) {
    return (
      <Card className="bg-card border border-border p-8 glass-effect">
        <div className="text-center">Loading your active pawns...</div>
      </Card>
    );
  }

  return (
    <Card className="bg-card border border-border p-8 glass-effect">
      <h3 className="text-xl font-semibold mb-6 flex items-center">
        <Clock className="mr-3 text-secondary" />
        Your Active Pawns
      </h3>

      {pawns.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No active pawns found.</p>
          <p className="text-sm mt-2">Submit an RWA to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pawns.map((pawn) => {
            const expiryDate = new Date(pawn.expiryDate);
            const now = new Date();
            const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isExpiringSoon = daysRemaining <= 7;

            return (
              <Card
                key={pawn.id}
                className="border border-border p-4 hover:border-primary transition-colors"
                data-testid={`pawn-card-${pawn.id}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium" data-testid={`pawn-name-${pawn.id}`}>
                      {pawn.assetName}
                    </h4>
                    <p className="text-sm text-muted-foreground">{pawn.category}</p>
                  </div>
                  <Badge
                    variant={isExpiringSoon ? "destructive" : "secondary"}
                    data-testid={`pawn-status-${pawn.id}`}
                  >
                    {isExpiringSoon ? "Expires Soon" : "Active"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground">Loan Amount:</span>
                    <div className="font-medium" data-testid={`pawn-loan-${pawn.id}`}>
                      ${parseFloat(pawn.loanAmount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Asset Value:</span>
                    <div className="font-medium" data-testid={`pawn-value-${pawn.id}`}>
                      ${parseFloat(pawn.assetValue).toLocaleString()}
                    </div>
                  </div>
                </div>

                <CountdownTimer
                  expiryDate={expiryDate}
                  isExpiringSoon={isExpiringSoon}
                  pawnId={pawn.id}
                />

                <Button
                  onClick={() => handleRedeemAsset(pawn.id)}
                  className={`w-full mt-4 ${
                    isExpiringSoon
                      ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                  data-testid={`button-redeem-${pawn.id}`}
                >
                  {isExpiringSoon ? "Redeem Now" : "Redeem Asset"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
