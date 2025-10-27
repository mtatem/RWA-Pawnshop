import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, FileText, CheckCircle, ExternalLink, Wallet, MessageSquare } from "lucide-react";
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

  // Fetch pending RWA submissions
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<RwaSubmission[]>({
    queryKey: ["/api/rwa-submissions/user", user?.id],
    enabled: isAuthenticated && !!user?.id,
  });

  // Fetch active pawn loans  
  const { data: pawns = [], isLoading: pawnsLoading } = useQuery<PawnLoanWithSubmission[]>({
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

  const isLoading = submissionsLoading || pawnsLoading;

  // Filter pending/under review submissions
  const pendingSubmissions = submissions.filter(
    s => s.status === 'pending' || s.status === 'under_review'
  );

  const totalItems = pendingSubmissions.length + pawns.length;

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
      ) : totalItems === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No active pawns found.</p>
          <p className="text-sm mt-2">Submit an RWA to get started!</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {/* Pending Submissions */}
          {pendingSubmissions.map((submission) => (
            <Card
              key={`submission-${submission.id}`}
              className="border border-border p-3 sm:p-4 hover:border-primary transition-colors bg-muted/30"
              data-testid={`submission-card-${submission.id}`}
            >
              <div className="flex flex-col xs:flex-row xs:justify-between xs:items-start mb-3 space-y-2 xs:space-y-0">
                <div className="flex-1">
                  <h4 className="font-medium text-sm sm:text-base flex items-center gap-2" data-testid={`submission-name-${submission.id}`}>
                    <FileText className="h-4 w-4 text-primary" />
                    {submission.assetName}
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">{submission.category}</p>
                </div>
                <Badge
                  variant="outline"
                  data-testid={`submission-status-${submission.id}`}
                  className="text-xs self-start xs:self-auto bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 border-yellow-200 dark:border-yellow-800"
                >
                  {submission.status === 'pending' ? 'Pending Review' : 'Under Review'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm mb-4">
                <div>
                  <span className="text-muted-foreground block">Estimated Value:</span>
                  <div className="font-medium text-sm sm:text-base" data-testid={`submission-value-${submission.id}`}>
                    ${parseFloat(submission.estimatedValue).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block">Submitted:</span>
                  <div className="font-medium text-sm sm:text-base">
                    {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>

              {submission.description && (
                <div className="mb-4">
                  <span className="text-muted-foreground block text-xs sm:text-sm mb-1">Description:</span>
                  <p className="text-xs sm:text-sm text-foreground bg-muted/50 p-2 sm:p-3 rounded border border-border">
                    {submission.description}
                  </p>
                </div>
              )}

              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Wallet:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-[200px] sm:max-w-xs" data-testid={`submission-wallet-${submission.id}`}>
                    {submission.walletAddress}
                  </code>
                </div>

                {(submission.coaUrl || submission.nftUrl || submission.physicalDocsUrl) && (
                  <div className="pt-2 space-y-1">
                    <span className="text-muted-foreground block text-xs sm:text-sm">Documents:</span>
                    <div className="flex flex-wrap gap-2">
                      {submission.coaUrl && (
                        <a
                          href={submission.coaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          data-testid={`submission-coa-${submission.id}`}
                        >
                          <FileText className="h-3 w-3" />
                          Certificate of Authenticity
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {submission.nftUrl && (
                        <a
                          href={submission.nftUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                          data-testid={`submission-nft-${submission.id}`}
                        >
                          <FileText className="h-3 w-3" />
                          NFT Certificate
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {submission.physicalDocsUrl && (
                        <a
                          href={submission.physicalDocsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          data-testid={`submission-docs-${submission.id}`}
                        >
                          <FileText className="h-3 w-3" />
                          Physical Documents
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {submission.adminNotes && (submission.status === 'rejected' || submission.reviewedAt) && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-amber-700 dark:text-amber-300 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-amber-800 dark:text-amber-200 block mb-1">
                        Admin Notes{submission.reviewedAt ? ` (Reviewed ${new Date(submission.reviewedAt).toLocaleDateString()})` : ''}:
                      </span>
                      <p className="text-xs text-amber-700 dark:text-amber-300" data-testid={`submission-notes-${submission.id}`}>
                        {submission.adminNotes}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Awaiting admin approval to activate pawn loan</span>
              </div>
            </Card>
          ))}

          {/* Active Pawns */}
          {pawns.map((pawn) => {
            const expiryDate = new Date(pawn.expiryDate);
            const now = new Date();
            const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isExpiringSoon = daysRemaining <= 7;

            return (
              <Card
                key={`pawn-${pawn.id}`}
                className="border border-border p-3 sm:p-4 hover:border-primary transition-colors"
                data-testid={`pawn-card-${pawn.id}`}
              >
                <div className="flex flex-col xs:flex-row xs:justify-between xs:items-start mb-3 space-y-2 xs:space-y-0">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm sm:text-base flex items-center gap-2" data-testid={`pawn-name-${pawn.id}`}>
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      {pawn.assetName}
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">{pawn.category}</p>
                  </div>
                  <Badge
                    variant={isExpiringSoon ? "destructive" : "secondary"}
                    data-testid={`pawn-status-${pawn.id}`}
                    className="text-xs self-start xs:self-auto"
                  >
                    {isExpiringSoon ? "Expires Soon" : "Active Loan"}
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
