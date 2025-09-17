import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Clock, CheckCircle, AlertCircle, XCircle, RefreshCw, Download, 
  Filter, Eye, MoreHorizontal, Copy, ExternalLink, Search
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

interface BridgeTransaction {
  id: string;
  fromNetwork: 'ethereum' | 'icp';
  toNetwork: 'ethereum' | 'icp';
  fromToken: string;
  toToken: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  txHashFrom?: string;
  txHashTo?: string;
  bridgeFee: string;
  estimatedTime: number;
  actualTime?: number;
  confirmationsFrom?: number;
  confirmationsTo?: number;
  requiredConfirmations: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  bridgeData?: any;
}

interface BridgeHistoryFilters {
  status?: string;
  fromNetwork?: string;
  toNetwork?: string;
  fromToken?: string;
  toToken?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Status icons and colors
const StatusDisplay = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Pending' };
      case 'processing':
        return { icon: RefreshCw, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Processing' };
      case 'completed':
        return { icon: CheckCircle, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Completed' };
      case 'failed':
        return { icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Failed' };
      case 'refunded':
        return { icon: AlertCircle, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', label: 'Refunded' };
      default:
        return { icon: Clock, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', label: 'Unknown' };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={config.color} data-testid={`status-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

// Transaction details dialog
interface TransactionDetailsProps {
  transaction: BridgeTransaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TransactionDetails = ({ transaction, open, onOpenChange }: TransactionDetailsProps) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const getProgressValue = () => {
    switch (transaction.status) {
      case 'pending': return 10;
      case 'processing': return 60;
      case 'completed': return 100;
      case 'failed': return 0;
      case 'refunded': return 50;
      default: return 0;
    }
  };

  const getExplorerUrl = (txHash: string, network: string) => {
    if (network === 'ethereum') {
      return `https://etherscan.io/tx/${txHash}`;
    } else {
      // ICP explorer URL
      return `https://dashboard.internetcomputer.org/transaction/${txHash}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Bridge Transaction Details
            <StatusDisplay status={transaction.status} />
          </DialogTitle>
          <DialogDescription>
            Transaction ID: {transaction.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={getProgressValue()} className="mb-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Started: {format(new Date(transaction.createdAt), 'MMM dd, HH:mm')}</span>
                {transaction.completedAt && (
                  <span>Completed: {format(new Date(transaction.completedAt), 'MMM dd, HH:mm')}</span>
                )}
              </div>
              {transaction.actualTime && (
                <div className="mt-2 text-sm">
                  Actual time: {transaction.actualTime} minutes (estimated: {transaction.estimatedTime} minutes)
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bridge Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">From</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="text-xs text-muted-foreground">Network:</span>
                  <div className="capitalize font-medium">{transaction.fromNetwork}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Token:</span>
                  <div className="font-medium">{transaction.fromToken}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Amount:</span>
                  <div className="font-medium">{transaction.amount} {transaction.fromToken}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Address:</span>
                  <div className="flex items-center gap-1 text-xs font-mono">
                    <span className="truncate">{transaction.fromAddress}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(transaction.fromAddress, 'From address')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">To</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="text-xs text-muted-foreground">Network:</span>
                  <div className="capitalize font-medium">{transaction.toNetwork}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Token:</span>
                  <div className="font-medium">{transaction.toToken}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Receive Amount:</span>
                  <div className="font-medium">
                    {(parseFloat(transaction.amount) - parseFloat(transaction.bridgeFee)).toFixed(6)} {transaction.toToken}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Address:</span>
                  <div className="flex items-center gap-1 text-xs font-mono">
                    <span className="truncate">{transaction.toAddress}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(transaction.toAddress, 'To address')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Hashes */}
          {(transaction.txHashFrom || transaction.txHashTo) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Transaction Hashes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {transaction.txHashFrom && (
                  <div>
                    <span className="text-xs text-muted-foreground">Source Transaction:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-muted p-1 rounded truncate flex-1">
                        {transaction.txHashFrom}
                      </code>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(transaction.txHashFrom!, 'Source transaction hash')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => window.open(getExplorerUrl(transaction.txHashFrom!, transaction.fromNetwork), '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                    {transaction.confirmationsFrom !== undefined && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Confirmations: {transaction.confirmationsFrom}/{transaction.requiredConfirmations}
                      </div>
                    )}
                  </div>
                )}
                
                {transaction.txHashTo && (
                  <div>
                    <span className="text-xs text-muted-foreground">Destination Transaction:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-muted p-1 rounded truncate flex-1">
                        {transaction.txHashTo}
                      </code>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(transaction.txHashTo!, 'Destination transaction hash')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => window.open(getExplorerUrl(transaction.txHashTo!, transaction.toNetwork), '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                    {transaction.confirmationsTo !== undefined && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Confirmations: {transaction.confirmationsTo}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fees */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Fee Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Bridge Fee:</span>
                  <span>{transaction.bridgeFee} {transaction.fromToken}</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total Fees:</span>
                  <span>{transaction.bridgeFee} {transaction.fromToken}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Information */}
          {transaction.status === 'failed' && transaction.errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {transaction.errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Raw Data (for debugging) */}
          {transaction.bridgeData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Debug Information</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(transaction.bridgeData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main bridge history component
export default function BridgeHistory() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<BridgeHistoryFilters>({});
  const [selectedTransaction, setSelectedTransaction] = useState<BridgeTransaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch bridge transactions
  const { data: transactions = [], isLoading, error, refetch } = useQuery<BridgeTransaction[]>({
    queryKey: ['/api/bridge/history', filters, page, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...filters,
        limit: '20',
        offset: (page * 20).toString(),
        sortBy,
        sortOrder,
      });
      
      const response = await apiRequest("GET", `/api/bridge/history?${params}`);
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Cancel transaction mutation
  const cancelMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await apiRequest("POST", `/api/bridge/cancel/${transactionId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transaction Cancelled",
        description: "Bridge transaction has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bridge/history'] });
    },
    onError: (error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Export transactions
  const exportTransactions = () => {
    const csv = [
      ['Date', 'From', 'To', 'Amount', 'Status', 'Fee', 'TX Hash'].join(','),
      ...transactions.map(tx => [
        format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        `${tx.fromNetwork}:${tx.fromToken}`,
        `${tx.toNetwork}:${tx.toToken}`,
        tx.amount,
        tx.status,
        tx.bridgeFee,
        tx.txHashFrom || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bridge-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(0);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Please log in to view your bridge history.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bridge History</h2>
          <p className="text-muted-foreground">Track all your cross-chain bridge transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportTransactions} data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} data-testid="button-filter">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search by ID or address..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={filters.status || ''} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">From Network</label>
                <Select value={filters.fromNetwork || ''} onValueChange={(value) => handleFilterChange('fromNetwork', value)}>
                  <SelectTrigger data-testid="select-from-network-filter">
                    <SelectValue placeholder="All networks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All networks</SelectItem>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="icp">ICP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Token</label>
                <Select value={filters.fromToken || ''} onValueChange={(value) => handleFilterChange('fromToken', value)}>
                  <SelectTrigger data-testid="select-token-filter">
                    <SelectValue placeholder="All tokens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All tokens</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="ckETH">ckETH</SelectItem>
                    <SelectItem value="ckUSDC">ckUSDC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading bridge history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
              <p className="text-muted-foreground">Failed to load bridge history.</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-2">
                Try Again
              </Button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No bridge transactions found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bridge</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} data-testid={`row-${transaction.id}`}>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(transaction.createdAt), 'MMM dd, yyyy')}
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(transaction.createdAt), 'HH:mm:ss')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {transaction.fromToken}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {transaction.toToken}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 capitalize">
                        {transaction.fromNetwork} → {transaction.toNetwork}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{transaction.amount}</div>
                      <div className="text-xs text-muted-foreground">
                        Fee: {transaction.bridgeFee}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusDisplay status={transaction.status} />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {transaction.actualTime ? (
                          <>
                            <div>{transaction.actualTime}m</div>
                            <div className="text-xs text-muted-foreground">
                              Est: {transaction.estimatedTime}m
                            </div>
                          </>
                        ) : (
                          <div className="text-muted-foreground">
                            ~{transaction.estimatedTime}m
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${transaction.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedTransaction(transaction)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {transaction.txHashFrom && (
                            <DropdownMenuItem 
                              onClick={() => window.open(
                                transaction.fromNetwork === 'ethereum' 
                                  ? `https://etherscan.io/tx/${transaction.txHashFrom}`
                                  : `https://dashboard.internetcomputer.org/transaction/${transaction.txHashFrom}`,
                                '_blank'
                              )}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View on Explorer
                            </DropdownMenuItem>
                          )}
                          {transaction.status === 'pending' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => cancelMutation.mutate(transaction.id)}
                                className="text-red-600"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel Transaction
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {transactions.length === 20 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            Page {page + 1}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => p + 1)}
            disabled={transactions.length < 20}
          >
            Next
          </Button>
        </div>
      )}

      {/* Transaction Details Dialog */}
      {selectedTransaction && (
        <TransactionDetails
          transaction={selectedTransaction}
          open={!!selectedTransaction}
          onOpenChange={(open) => !open && setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}