import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import type { PawnLoan, RwaSubmission } from "@shared/schema";

// Extended type for pawn loans with submission details
type PawnLoanWithSubmission = PawnLoan & {
  assetName: string;
  category: string;
};
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useICPWallet } from "@/hooks/useICPWallet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CountdownTimer from "@/components/countdown-timer";


export default function ActivePawns() {
  const { user, isAuthenticated } = useAuth();
  const { wallet, sendTransaction } = useICPWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch real pawn loans from API  
  const { data: pawns = [], isLoading } = useQuery<PawnLoanWithSubmission[]>({
    queryKey: ["/api/pawn-loans/user", user?.id],
    enabled: isAuthenticated && !!user?.id,
  });

  const redeemMutation = useMutation({
    mutationFn: async ({ pawnId, loanAmount }: { pawnId: string; loanAmount: string }) => {
      if (!wallet) {
        throw new Error('Please connect your ICP wallet to redeem assets');
      }

      const amount = parseFloat(loanAmount);
      if (wallet.balance < (amount + 0.0001)) {
        throw new Error(`Insufficient balance. You need ${amount + 0.0001} ICP (including transaction fee) to redeem this asset.`);
      }

      // Get secure payment intent from backend
      const paymentIntentResponse = await apiRequest('POST', '/api/payment-intents', {
        type: 'redemption_payment',
        amount: loanAmount,
        metadata: { pawnId }
      });
      const paymentIntent = await paymentIntentResponse.json();

      // Send redemption payment using secure recipient
      await sendTransaction(
        paymentIntent.recipient,
        amount,
        'redemption_payment',
        paymentIntent.memo
      );

      // Update pawn status via API
      const response = await apiRequest('PATCH', `/api/pawn-loans/${pawnId}/redeem`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Asset Redeemed",
        description: "Your asset has been successfully redeemed!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pawn-loans/user", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Redemption Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRedeemAsset = (pawnId: string, loanAmount: string) => {
    redeemMutation.mutate({ pawnId, loanAmount });
  };

  if (isLoading) {
    return (
      <Card className="bg-card border border-border p-8 glass-effect">
        <div className="text-center">Loading your active pawns...</div>
      </Card>
    );
  }

  return (
    <Card className="bg-card border border-border p-4 sm:p-6 lg:p-8 glass-effect">
      <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center">
        <Clock className="mr-2 sm:mr-3 text-secondary h-5 w-5 sm:h-6 sm:w-6" />
        Your Active Pawns
      </h3>

      {!isAuthenticated ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Please log in to view your active pawns.</p>
        </div>
      ) : pawns.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No active pawns found.</p>
          <p className="text-sm mt-2">Submit an RWA to get started!</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {pawns.map((pawn) => {
            const expiryDate = new Date(pawn.expiryDate);
            const now = new Date();
            const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isExpiringSoon = daysRemaining <= 7;

            return (
              <Card
                key={pawn.id}
                className="border border-border p-3 sm:p-4 hover:border-primary transition-colors"
                data-testid={`pawn-card-${pawn.id}`}
              >
                <div className="flex flex-col xs:flex-row xs:justify-between xs:items-start mb-3 space-y-2 xs:space-y-0">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm sm:text-base" data-testid={`pawn-name-${pawn.id}`}>
                      {pawn.assetName}
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">{pawn.category}</p>
                  </div>
                  <Badge
                    variant={isExpiringSoon ? "destructive" : "secondary"}
                    data-testid={`pawn-status-${pawn.id}`}
                    className="text-xs self-start xs:self-auto"
                  >
                    {isExpiringSoon ? "Expires Soon" : "Active"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground block">Loan Amount:</span>
                    <div className="font-medium text-sm sm:text-base" data-testid={`pawn-loan-${pawn.id}`}>
                      ${parseFloat(pawn.loanAmount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Asset Value:</span>
                    <div className="font-medium text-sm sm:text-base" data-testid={`pawn-value-${pawn.id}`}>
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
                  onClick={() => handleRedeemAsset(pawn.id, pawn.loanAmount)}
                  disabled={redeemMutation.isPending || !wallet || wallet.balance < parseFloat(pawn.loanAmount)}
                  className={`w-full mt-4 h-11 sm:h-10 text-sm ${
                    isExpiringSoon
                      ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                  data-testid={`button-redeem-${pawn.id}`}
                >
                  {redeemMutation.isPending
                    ? "Processing..."
                    : !wallet
                    ? "Connect Wallet"
                    : wallet.balance < parseFloat(pawn.loanAmount)
                    ? "Insufficient Balance"
                    : isExpiringSoon
                    ? "Redeem Now"
                    : "Redeem Asset"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
