import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  ArrowUpDown, 
  ArrowRight, 
  ArrowLeft,
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  DollarSign,
  Zap,
  Timer,
  RefreshCw,
  Filter,
  Search,
  Eye,
  MoreHorizontal,
  TrendingUp,
  Activity,
  Gauge,
  Network,
  ExternalLink,
  PlayCircle,
  PauseCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BridgeTransaction {
  id: string;
  userId: string;
  fromChain: 'ethereum' | 'icp';
  toChain: 'ethereum' | 'icp';
  fromTokenType: 'ETH' | 'ckETH' | 'USDC' | 'ckUSDC' | 'ICP';
  toTokenType: 'ETH' | 'ckETH' | 'USDC' | 'ckUSDC' | 'ICP';
  amount: string;
  fee: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'stuck' | 'cancelled';
  fromTxHash?: string;
  toTxHash?: string;
  bridgeRequestId: string;
  estimatedCompletionTime?: string;
  actualCompletionTime?: string;
  errorMessage?: string;
  gasUsed?: string;
  bridgeFee: string;
  networkFee: string;
  retryCount: number;
  lastRetryAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface BridgeMetrics {
  totalTransactions: number;
  activeTransactions: number;
  completedToday: number;
  failedTransactions: number;
  stuckTransactions: number;
  totalVolume: string;
  totalFees: string;
  averageProcessingTime: number;
  successRate: string;
  networkHealth: {
    ethereum: 'healthy' | 'degraded' | 'down';
    icp: 'healthy' | 'degraded' | 'down';
  };
  hourlyVolume: Array<{
    hour: string;
    volume: string;
    count: number;
  }>;
}

interface BridgeMonitoringData {
  transactions: BridgeTransaction[];
  metrics: BridgeMetrics;
  totalCount: number;
  breakdown: {
    byStatus: Record<string, number>;
    byDirection: Record<string, number>;
    byToken: Record<string, number>;
  };
}

export default function BridgeMonitoring() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filters and selection
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [directionFilter, setDirectionFilter] = useState<string>('');
  const [tokenFilter, setTokenFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<BridgeTransaction | null>(null);
  const [isTransactionDetailOpen, setIsTransactionDetailOpen] = useState(false);

  // Fetch bridge monitoring data
  const { data: bridgeData, isLoading, refetch } = useQuery<BridgeMonitoringData>({
    queryKey: ["/api/admin/bridge/monitoring", { 
      status: statusFilter, 
      direction: directionFilter,
      token: tokenFilter 
    }],
    refetchInterval: 10000, // Refresh every 10 seconds for real-time monitoring
  });

  // Retry bridge transaction mutation
  const retryTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await apiRequest("POST", `/api/bridge/retry/${transactionId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transaction Retry Initiated",
        description: "Bridge transaction retry has been started.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bridge/monitoring"] });
    },
    onError: (error: any) => {
      toast({
        title: "Retry Failed",
        description: error.message || "Failed to retry bridge transaction.",
        variant: "destructive",
      });
    },
  });

  // Cancel bridge transaction mutation
  const cancelTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await apiRequest("POST", `/api/bridge/cancel/${transactionId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transaction Cancelled",
        description: "Bridge transaction has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bridge/monitoring"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel bridge transaction.",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'stuck': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'stuck': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDirectionIcon = (fromChain: string, toChain: string) => {
    if (fromChain === 'ethereum' && toChain === 'icp') {
      return <ArrowRight className="h-4 w-4 text-blue-600" />;
    } else if (fromChain === 'icp' && toChain === 'ethereum') {
      return <ArrowLeft className="h-4 w-4 text-purple-600" />;
    }
    return <ArrowUpDown className="h-4 w-4 text-gray-600" />;
  };

  const getNetworkHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
    }).format(parseFloat(amount));
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes === 1) return "1 minute ago";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  };

  const formatProcessingTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const handleRetryTransaction = (transactionId: string) => {
    retryTransactionMutation.mutate(transactionId);
  };

  const handleCancelTransaction = (transactionId: string) => {
    cancelTransactionMutation.mutate(transactionId);
  };

  const filteredTransactions = bridgeData?.transactions?.filter(tx => {
    const matchesSearch = !searchTerm || 
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.fromTxHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.toTxHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.bridgeRequestId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Bridge Monitoring</h2>
          <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-6 space-y-3">
                <div className="bg-gray-200 h-4 w-3/4 rounded"></div>
                <div className="bg-gray-200 h-6 w-1/2 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="bridge-monitoring">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="bridge-monitoring-title">
            Cross-Chain Bridge Monitoring
          </h2>
          <p className="text-muted-foreground">
            Real-time ETH ↔ ICP bridge transaction oversight
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center gap-2">
            <ArrowUpDown className="h-3 w-3" />
            {bridgeData?.totalCount || 0} Total Transactions
          </Badge>
          <Badge 
            variant={bridgeData?.metrics.stuckTransactions ? "destructive" : "secondary"} 
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-3 w-3" />
            {bridgeData?.metrics.stuckTransactions || 0} Stuck
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            data-testid="refresh-bridge-button"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Network Health Status */}
      {bridgeData?.metrics.networkHealth && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Network className="h-5 w-5" />
                  <span className="font-medium">Network Status</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm">Ethereum:</span>
                  <Badge className={`${getNetworkHealthColor(bridgeData.metrics.networkHealth.ethereum)} border-0`}>
                    {bridgeData.metrics.networkHealth.ethereum.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm">ICP:</span>
                  <Badge className={`${getNetworkHealthColor(bridgeData.metrics.networkHealth.icp)} border-0`}>
                    {bridgeData.metrics.networkHealth.icp.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Success Rate: <span className="font-bold text-green-600">{bridgeData.metrics.successRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {bridgeData?.metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-active-transactions">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Active</span>
                </div>
                <span className="text-2xl font-bold">{bridgeData.metrics.activeTransactions}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Currently processing</p>
            </CardContent>
          </Card>

          <Card data-testid="card-completed-today">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Completed Today</span>
                </div>
                <span className="text-2xl font-bold">{bridgeData.metrics.completedToday}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg: {formatProcessingTime(bridgeData.metrics.averageProcessingTime)}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-volume">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Total Volume</span>
                </div>
                <span className="text-2xl font-bold">{formatCurrency(bridgeData.metrics.totalVolume)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">24h volume</p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-fees">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Bridge Fees</span>
                </div>
                <span className="text-2xl font-bold">{formatCurrency(bridgeData.metrics.totalFees)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Revenue generated</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction Breakdown */}
      {bridgeData?.breakdown && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">By Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(bridgeData.breakdown.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(status)}
                      <span className="text-sm capitalize">{status}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">By Direction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(bridgeData.breakdown.byDirection).map(([direction, count]) => (
                  <div key={direction} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {direction === 'eth_to_icp' ? (
                        <ArrowRight className="h-4 w-4 text-blue-600" />
                      ) : (
                        <ArrowLeft className="h-4 w-4 text-purple-600" />
                      )}
                      <span className="text-sm">{direction.replace('_', ' → ').toUpperCase()}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">By Token</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(bridgeData.breakdown.byToken).map(([token, count]) => (
                  <div key={token} className="flex items-center justify-between">
                    <span className="text-sm font-mono">{token}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by transaction ID, hash, or bridge request ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-transactions-input"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="stuck">Stuck</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="">All Statuses</SelectItem>
              </SelectContent>
            </Select>

            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[180px]" data-testid="direction-filter">
                <SelectValue placeholder="Filter by direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eth_to_icp">ETH → ICP</SelectItem>
                <SelectItem value="icp_to_eth">ICP → ETH</SelectItem>
                <SelectItem value="">All Directions</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tokenFilter} onValueChange={setTokenFilter}>
              <SelectTrigger className="w-[180px]" data-testid="token-filter">
                <SelectValue placeholder="Filter by token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="ckETH">ckETH</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="ckUSDC">ckUSDC</SelectItem>
                <SelectItem value="ICP">ICP</SelectItem>
                <SelectItem value="">All Tokens</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <ArrowUpDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No Bridge Transactions</h3>
              <p className="text-gray-500">No bridge transactions match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredTransactions.map((tx) => (
            <Card key={tx.id} className={`border-l-4 ${
              tx.status === 'completed' ? 'border-l-green-500' :
              tx.status === 'processing' ? 'border-l-blue-500' :
              tx.status === 'failed' ? 'border-l-red-500' :
              tx.status === 'stuck' ? 'border-l-orange-500' :
              'border-l-yellow-500'
            }`} data-testid={`transaction-card-${tx.id}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {getStatusIcon(tx.status)}
                      <Badge className={getStatusColor(tx.status)}>
                        {tx.status.toUpperCase()}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        {getDirectionIcon(tx.fromChain, tx.toChain)}
                        <span className="text-sm font-mono">
                          {tx.fromTokenType} → {tx.toTokenType}
                        </span>
                      </div>
                      {tx.retryCount > 0 && (
                        <Badge variant="outline">
                          Retry #{tx.retryCount}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold mb-2" data-testid={`transaction-title-${tx.id}`}>
                      Bridge Transaction: {tx.amount} {tx.fromTokenType}
                    </h3>

                    <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-4">
                      <div>
                        <span className="font-medium">Transaction ID:</span>{' '}
                        <span className="font-mono">{tx.id.slice(0, 12)}...</span>
                      </div>
                      <div>
                        <span className="font-medium">Bridge Request:</span>{' '}
                        <span className="font-mono">{tx.bridgeRequestId.slice(0, 12)}...</span>
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>{' '}
                        {formatTimeAgo(tx.createdAt)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4" />
                        <span>Amount: {tx.amount} {tx.fromTokenType}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Zap className="h-4 w-4" />
                        <span>Bridge Fee: {tx.bridgeFee}</span>
                      </div>
                      {tx.gasUsed && (
                        <div className="flex items-center space-x-1">
                          <Gauge className="h-4 w-4" />
                          <span>Gas: {tx.gasUsed}</span>
                        </div>
                      )}
                    </div>

                    {tx.errorMessage && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 mb-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-800">Error</span>
                        </div>
                        <p className="text-sm text-red-700">{tx.errorMessage}</p>
                      </div>
                    )}

                    {tx.status === 'processing' && tx.estimatedCompletionTime && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-700">
                            Estimated completion: {formatTimeAgo(tx.estimatedCompletionTime)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Dialog open={isTransactionDetailOpen} onOpenChange={setIsTransactionDetailOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedTransaction(tx)}
                          data-testid={`view-transaction-${tx.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <ArrowUpDown className="h-5 w-5" />
                            Bridge Transaction Details
                          </DialogTitle>
                          <DialogDescription>
                            Transaction ID: {selectedTransaction?.id}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedTransaction && (
                          <Tabs defaultValue="overview" className="space-y-6">
                            <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="overview">Overview</TabsTrigger>
                              <TabsTrigger value="timeline">Timeline</TabsTrigger>
                              <TabsTrigger value="fees">Fees & Gas</TabsTrigger>
                              <TabsTrigger value="actions">Actions</TabsTrigger>
                            </TabsList>

                            {/* Overview Tab */}
                            <TabsContent value="overview" className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                  <Label className="text-sm font-medium">Transaction Information</Label>
                                  <div className="space-y-2 mt-2">
                                    <div><span className="font-medium">Amount:</span> {selectedTransaction.amount} {selectedTransaction.fromTokenType}</div>
                                    <div><span className="font-medium">Direction:</span> {selectedTransaction.fromChain} → {selectedTransaction.toChain}</div>
                                    <div><span className="font-medium">Status:</span> {selectedTransaction.status}</div>
                                    <div><span className="font-medium">Bridge Request ID:</span> <span className="font-mono text-xs">{selectedTransaction.bridgeRequestId}</span></div>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Transaction Hashes</Label>
                                  <div className="space-y-2 mt-2">
                                    {selectedTransaction.fromTxHash && (
                                      <div>
                                        <span className="font-medium">From Tx:</span>{' '}
                                        <a 
                                          href={`https://etherscan.io/tx/${selectedTransaction.fromTxHash}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-mono text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                                        >
                                          {selectedTransaction.fromTxHash.slice(0, 20)}...
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </div>
                                    )}
                                    {selectedTransaction.toTxHash && (
                                      <div>
                                        <span className="font-medium">To Tx:</span>{' '}
                                        <a 
                                          href={`https://dashboard.internetcomputer.org/transaction/${selectedTransaction.toTxHash}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-mono text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                                        >
                                          {selectedTransaction.toTxHash.slice(0, 20)}...
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            {/* Timeline Tab */}
                            <TabsContent value="timeline" className="space-y-4">
                              <div className="space-y-4">
                                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <div>
                                    <div className="font-medium">Transaction Created</div>
                                    <div className="text-sm text-gray-600">{new Date(selectedTransaction.createdAt).toLocaleString()}</div>
                                  </div>
                                </div>
                                
                                {selectedTransaction.status !== 'pending' && (
                                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                    <div>
                                      <div className="font-medium">Processing Started</div>
                                      <div className="text-sm text-gray-600">{new Date(selectedTransaction.updatedAt).toLocaleString()}</div>
                                    </div>
                                  </div>
                                )}
                                
                                {selectedTransaction.actualCompletionTime && (
                                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <div>
                                      <div className="font-medium">Transaction Completed</div>
                                      <div className="text-sm text-gray-600">{new Date(selectedTransaction.actualCompletionTime).toLocaleString()}</div>
                                    </div>
                                  </div>
                                )}
                                
                                {selectedTransaction.retryCount > 0 && (
                                  <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded">
                                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                    <div>
                                      <div className="font-medium">Retry Attempts: {selectedTransaction.retryCount}</div>
                                      {selectedTransaction.lastRetryAt && (
                                        <div className="text-sm text-gray-600">Last retry: {new Date(selectedTransaction.lastRetryAt).toLocaleString()}</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TabsContent>

                            {/* Fees & Gas Tab */}
                            <TabsContent value="fees" className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                  <Label className="text-sm font-medium">Bridge Fees</Label>
                                  <div className="space-y-2 mt-2">
                                    <div><span className="font-medium">Bridge Fee:</span> {selectedTransaction.bridgeFee}</div>
                                    <div><span className="font-medium">Network Fee:</span> {selectedTransaction.networkFee}</div>
                                    <div><span className="font-medium">Total Fee:</span> {selectedTransaction.fee}</div>
                                  </div>
                                </div>

                                {selectedTransaction.gasUsed && (
                                  <div>
                                    <Label className="text-sm font-medium">Gas Information</Label>
                                    <div className="space-y-2 mt-2">
                                      <div><span className="font-medium">Gas Used:</span> {selectedTransaction.gasUsed}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TabsContent>

                            {/* Actions Tab */}
                            <TabsContent value="actions" className="space-y-6">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                  <Label className="text-sm font-medium">Transaction Actions</Label>
                                  <div className="space-y-2 mt-2">
                                    {(selectedTransaction.status === 'failed' || selectedTransaction.status === 'stuck') && (
                                      <Button 
                                        className="w-full" 
                                        size="sm"
                                        onClick={() => handleRetryTransaction(selectedTransaction.id)}
                                        data-testid={`retry-transaction-${selectedTransaction.id}`}
                                      >
                                        <PlayCircle className="h-4 w-4 mr-2" />
                                        Retry Transaction
                                      </Button>
                                    )}
                                    
                                    {(selectedTransaction.status === 'pending' || selectedTransaction.status === 'processing') && (
                                      <Button 
                                        variant="destructive" 
                                        className="w-full" 
                                        size="sm"
                                        onClick={() => handleCancelTransaction(selectedTransaction.id)}
                                        data-testid={`cancel-transaction-${selectedTransaction.id}`}
                                      >
                                        <PauseCircle className="h-4 w-4 mr-2" />
                                        Cancel Transaction
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Monitoring Actions</Label>
                                  <div className="space-y-2 mt-2">
                                    <Button variant="outline" className="w-full" size="sm">
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Force Status Update
                                    </Button>
                                    <Button variant="outline" className="w-full" size="sm">
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View on Explorer
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                          </Tabs>
                        )}
                      </DialogContent>
                    </Dialog>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(tx.status === 'failed' || tx.status === 'stuck') && (
                          <DropdownMenuItem onClick={() => handleRetryTransaction(tx.id)}>
                            Retry Transaction
                          </DropdownMenuItem>
                        )}
                        {(tx.status === 'pending' || tx.status === 'processing') && (
                          <DropdownMenuItem onClick={() => handleCancelTransaction(tx.id)}>
                            Cancel Transaction
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>View on Explorer</DropdownMenuItem>
                        <DropdownMenuItem>Contact User</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}