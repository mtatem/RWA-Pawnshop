import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  AlertTriangle, 
  DollarSign, 
  FileText, 
  Users, 
  Shield, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  Zap,
  Eye,
  Bell
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface EnhancedAdminStats {
  overview: {
    pendingApprovals: number;
    activeLoans: number;
    expiringSoon: number;
    totalRevenue: string;
    monthlyGrowth: string;
    userCount: number;
    avgLoanValue: string;
  };
  security: {
    openFraudAlerts: number;
    criticalAlerts: number;
    flaggedUsers: number;
    suspiciousDocuments: number;
    fraudPrevented: string;
  };
  operations: {
    pendingDocuments: number;
    processingDocuments: number;
    completedToday: number;
    avgProcessingTime: number;
    manualReviewRequired: number;
  };
  bridge: {
    activeTransactions: number;
    completedToday: number;
    failedTransactions: number;
    totalVolume: string;
    avgProcessingTime: number;
  };
}

interface PerformanceMetric {
  id: string;
  metricType: string;
  metricName: string;
  category: string;
  value: string;
  unit: string;
  trend: string;
  changePercentage: string;
  calculatedAt: string;
}

export default function AdminDashboard() {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fetch comprehensive admin KPIs
  const { data: adminStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["/api/admin/dashboard/kpis"],
    refetchInterval: refreshInterval,
  });

  // Fetch recent performance metrics
  const { data: performanceMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/admin/dashboard/metrics"],
    refetchInterval: refreshInterval,
  });

  // Auto-refresh functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
      refetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refetchStats]);

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
    }).format(parseFloat(amount));
  };

  const formatPercentage = (value: string) => {
    const num = parseFloat(value);
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  const getMetricColor = (trend: string, changePercentage: string) => {
    const change = parseFloat(changePercentage);
    if (trend === 'up' && change > 0) return 'text-green-600';
    if (trend === 'down' && change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (statsLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-6 space-y-3">
                <div className="bg-gray-200 h-4 w-3/4 rounded"></div>
                <div className="bg-gray-200 h-8 w-1/2 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats: EnhancedAdminStats = adminStats || {
    overview: { pendingApprovals: 0, activeLoans: 0, expiringSoon: 0, totalRevenue: "0", monthlyGrowth: "0", userCount: 0, avgLoanValue: "0" },
    security: { openFraudAlerts: 0, criticalAlerts: 0, flaggedUsers: 0, suspiciousDocuments: 0, fraudPrevented: "0" },
    operations: { pendingDocuments: 0, processingDocuments: 0, completedToday: 0, avgProcessingTime: 0, manualReviewRequired: 0 },
    bridge: { activeTransactions: 0, completedToday: 0, failedTransactions: 0, totalVolume: "0", avgProcessingTime: 0 }
  };

  return (
    <div className="space-y-6 p-6" data-testid="admin-dashboard">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="dashboard-title">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            Live Updates
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchStats()}
            data-testid="refresh-button"
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts Bar */}
      {stats.security.criticalAlerts > 0 && (
        <Card className="border-red-200 bg-red-50" data-testid="critical-alerts">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">
                  {stats.security.criticalAlerts} Critical Security Alert{stats.security.criticalAlerts > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-600">Immediate attention required</p>
              </div>
              <Button variant="destructive" size="sm" className="ml-auto">
                <Eye className="h-4 w-4 mr-2" />
                View Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main KPI Grid */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Platform Overview</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">Security & Fraud</TabsTrigger>
          <TabsTrigger value="operations" data-testid="tab-operations">Operations</TabsTrigger>
          <TabsTrigger value="bridge" data-testid="tab-bridge">Bridge Monitoring</TabsTrigger>
        </TabsList>

        {/* Platform Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-pending-approvals">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="pending-approvals-count">
                  {stats.overview.pendingApprovals}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting review
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-active-loans">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                <Handshake className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="active-loans-count">
                  {stats.overview.activeLoans}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatCurrency(stats.overview.avgLoanValue)}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-revenue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="total-revenue-amount">
                  {formatCurrency(stats.overview.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className={getMetricColor('up', stats.overview.monthlyGrowth)}>
                    {formatPercentage(stats.overview.monthlyGrowth)} from last month
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="total-users-count">
                  {stats.overview.userCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Platform users
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Expiring Loans Alert */}
          {stats.overview.expiringSoon > 0 && (
            <Card className="border-yellow-200 bg-yellow-50" data-testid="expiring-loans-alert">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <Bell className="h-5 w-5" />
                  Loans Expiring Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-yellow-900">
                      {stats.overview.expiringSoon}
                    </p>
                    <p className="text-sm text-yellow-700">
                      Loans expiring within 7 days
                    </p>
                  </div>
                  <Button variant="outline">
                    Review Loans
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Security & Fraud Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-fraud-alerts">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Fraud Alerts</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="fraud-alerts-count">
                  {stats.security.openFraudAlerts}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.security.criticalAlerts} critical
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-flagged-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flagged Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="flagged-users-count">
                  {stats.security.flaggedUsers}
                </div>
                <p className="text-xs text-muted-foreground">
                  Under investigation
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-suspicious-documents">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suspicious Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="suspicious-docs-count">
                  {stats.security.suspiciousDocuments}
                </div>
                <p className="text-xs text-muted-foreground">
                  High risk detected
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-fraud-prevented">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fraud Prevented</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="fraud-prevented-amount">
                  {formatCurrency(stats.security.fraudPrevented)}
                </div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-pending-documents">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="pending-docs-count">
                  {stats.operations.pendingDocuments}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting analysis
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-processing-documents">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="processing-docs-count">
                  {stats.operations.processingDocuments}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently analyzing
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-completed-today">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="completed-today-count">
                  {stats.operations.completedToday}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg: {stats.operations.avgProcessingTime}s
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-manual-review">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manual Review</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="manual-review-count">
                  {stats.operations.manualReviewRequired}
                </div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bridge Monitoring Tab */}
        <TabsContent value="bridge" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-active-bridge">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Transactions</CardTitle>
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="active-bridge-count">
                  {stats.bridge.activeTransactions}
                </div>
                <p className="text-xs text-muted-foreground">
                  ETH ↔ ICP
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-bridge-completed">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="bridge-completed-count">
                  {stats.bridge.completedToday}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg: {stats.bridge.avgProcessingTime}s
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-bridge-failed">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Transactions</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="bridge-failed-count">
                  {stats.bridge.failedTransactions}
                </div>
                <p className="text-xs text-muted-foreground">
                  Need investigation
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-bridge-volume">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="bridge-volume-amount">
                  {formatCurrency(stats.bridge.totalVolume)}
                </div>
                <p className="text-xs text-muted-foreground">
                  24h volume
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Performance Metrics Section */}
      {performanceMetrics && performanceMetrics.metrics && performanceMetrics.metrics.length > 0 && (
        <Card data-testid="performance-metrics">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Performance Metrics
            </CardTitle>
            <CardDescription>
              Key performance indicators and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {performanceMetrics.metrics.slice(0, 6).map((metric: PerformanceMetric) => (
                <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{metric.metricName.replace(/_/g, ' ')}</p>
                    <p className="text-2xl font-bold">
                      {metric.value} {metric.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    <span className={getMetricColor(metric.trend, metric.changePercentage)}>
                      {formatPercentage(metric.changePercentage)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}